const GRAPH_VERSION = '0.1';

const STYLE_STATE = 'state';
const STYLE_LR_ITEM = 'lritem';
const STYLE_HOVER = 'hover';
const STYLE_HOVER_ITEM = 'hitem';

//include files (for development)
document.write('<script src="connectionHandler.js"></script>')
document.write('<script src="editHandler.js"></script>')
document.write('<script src="grammar.js"></script>')


let graph = null;

function main(container) {
    //checks if browser is supported
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error('Unsupported Browser', 200, false);
    }
    //init graph on canvas
    graph = initGraph(container);
    setStylsheet(graph);
    addListeners(graph);
    addStartState(graph);
}

function initGraph(container) {
    const graph = new mxGraph(container, new mxGraphModel());
    // graph.setEnabled(false);
    graph.setAllowDanglingEdges(false);
    graph.setDisconnectOnMove(false);
    // graph.setConnectable(true); //not needed if custom connectionHandler implemented and activated
    // graph.setAllowLoops(true); //works with the built in mxGraph connection Handler
    graph.setEdgeLabelsMovable(false);
    graph.setAutoSizeCells(true); //TODO autosize
    graph.setCellsResizable(false);

    graph.addMouseListener(new connectionHandler(graph))
    graph.editHandler = new editHandler(graph);
    graph.grammar = new Grammar();
    return graph;
}

function setStylsheet(graph) {
    let stylesheet = graph.getStylesheet();
    let state_style = stylesheet.createDefaultVertexStyle();
    let lritem_style = stylesheet.createDefaultVertexStyle();
    stylesheet.putCellStyle(STYLE_STATE, state_style);
    stylesheet.putCellStyle(STYLE_LR_ITEM, lritem_style);

    //state
    state_style[mxConstants.STYLE_EDITABLE] = 0;
    state_style[mxConstants.STYLE_ROUNDED] = 1;

    //lritem
    lritem_style[mxConstants.STYLE_MOVABLE] = 0;

    //hover
    let hover_style = stylesheet.createDefaultVertexStyle();
    let hitem_style = stylesheet.createDefaultVertexStyle();
    stylesheet.putCellStyle(STYLE_HOVER, hover_style);
    stylesheet.putCellStyle(STYLE_HOVER_ITEM, hitem_style);
    //backgroun
    hover_style[mxConstants.STYLE_MOVABLE] = 0;
    hover_style[mxConstants.STYLE_FILLCOLOR] = '#e9e9e9';
    hover_style[mxConstants.STYLE_ROUNDED] = 1;
    hover_style[mxConstants.STYLE_EDITABLE] = 0;
    //item
    hitem_style[mxConstants.STYLE_MOVABLE] = 0;
    hitem_style[mxConstants.STYLE_FILLCOLOR] = 'inherit';
    hitem_style[mxConstants.STYLE_STROKECOLOR] = 'none';
    hitem_style[mxConstants.STYLE_EDITABLE] = 0;

}


// ------------- Listener ---------------
function addListeners(graph) {
    let cur_edit_cell = null;
    graph.addListener(null, (_, evt) => {
        //print every event
        // if (evt.name !== "fireMouseEvent")
        //     console.log(evt);
    });

}

// ---------------- stuff ------------------------

function addStartState(graph) {
    //add start state to graph
    graph.getModel().beginUpdate();
    try {
        const startState = graph.insertVertex(graph.getDefaultParent(), null, "", 200, 200, 80, 30, STYLE_STATE);
        const lrItem = graph.insertVertex(startState, null, "S' ➜ •E", 0, 20, 40, 20, STYLE_LR_ITEM);
        // lrItem.setConnectable(false);
    } finally {
        graph.getModel().endUpdate();
    }
}

function addState(graph, locX, loxY) {
    // adds a state to the graph on given position and returns the created cell
    let state;
    graph.getModel().beginUpdate();
    try {
        state = graph.insertVertex(graph.getDefaultParent(), null, "", locX, loxY, 80, 30, STYLE_STATE);
    } finally {
        graph.getModel().endUpdate();
    }
    graph.editHandler.editState(graph, state);
    return state;
}




// ------------ Zooming---------------
function zoomIn() {
    if (graph) {
        graph.zoomIn();
    }
}

function zoomOut() {
    if (graph) {
        graph.zoomOut();
    }
}

function resetZoom() {
    if (graph) {
        graph.zoomActual();
    }
}

// ------------ save and load graph -----------
function serializeGraph(graph) {
    /**
     * creates an XML representation of the graph, with mxCodec ans mxUtils.getXml
     * a version attribute is added for compatibility reasons
     */
    const enc = new mxCodec();
    const graph_xml = enc.encode(graph.getModel());
    const root_xml = document.implementation.createDocument(null, "LRTutor", null);
    const root_elem = root_xml.getElementsByTagName('LRTutor')[0];
    root_elem.setAttribute('version', GRAPH_VERSION);
    const graph_node = root_xml.createElement('Graph');
    graph_node.appendChild(graph_xml);
    root_elem.appendChild(graph_node);

    return mxUtils.getPrettyXml(root_xml);
}

function deSerializeGraph(serial) {
    /**
     * deserializes a text/xml representation of the graph and loads it.
     * Version number is checked
     */
    try {
        const doc = mxUtils.parseXml(serial);
        const graph_node = doc.getElementsByTagName('Graph')[0];
        const vers = doc.documentElement.getAttribute('version');
        if (vers !== GRAPH_VERSION) {
            return "Invalid File Version: '" + vers + "', need version: '" + GRAPH_VERSION + "'";
        }

        const graph_doc = mxUtils.parseXml(graph_node.innerHTML);
        const codec = new mxCodec(graph_doc);
        codec.decode(graph_node.firstElementChild, graph.getModel());
    } catch (e) {
        return "Invalid File Format: " + e;
    }
}

function saveGraph() {
    saveFile('graph.xml', serializeGraph(graph), 'text/xml');
}

function loadGraph() {
    loadFile(serial => {
        const error = deSerializeGraph(serial);
        if (error)
            console.log(error);
    });
}

function saveFile(filename, data, type) {
    /**
     * Asks the user to save the data as a file to the given filename
     */
    const blob = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
        // handle IE
        window.navigator.msSaveBlob(blob, filename);
    } else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
        window.URL.revokeObjectURL(elem.href);
    }
}

function loadFile(func) {
    /**
     * asks user to input a file. The content of the file is passed to the argument func(content)
     */
    const elem = window.document.createElement('input');
    elem.type = 'file';
    elem.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            func(content);
        };
        reader.readAsText(file);
    });
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}
