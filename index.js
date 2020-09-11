const GRAPH_VERSION = '0.2';

const STYLE_STATE = 'state';
const STYLE_FINAL_STATE = 'final'
const STYLE_EDGE = 'edge';
const STYLE_LR_ITEM = 'lritem';
const STYLE_HOVER = 'hover';
const STYLE_HOVER_ITEM = 'hitem';

const ATTR_START = 'start';
const ATTR_FINAL = 'final';

//include files (for development)
document.write('<script src="connectionHandler.js"></script>')
document.write('<script src="editHandler.js"></script>')
document.write('<script src="grammar.js"></script>')

//add protoype function for cell to get the type (state, LR-Item) of the cell
mxCell.prototype.getType = function () {
    const style = this.getStyle()
    if (!style) {
        return ''
    } else if (style.includes(STYLE_LR_ITEM)) {
        return STYLE_LR_ITEM;
    } else if (style.includes(STYLE_FINAL_STATE) || style.includes(STYLE_STATE)) {
        return STYLE_STATE;
    } else if (style.includes(STYLE_EDGE)) {
        return STYLE_EDGE;
    } else if (style.includes(STYLE_HOVER)) {
        return STYLE_HOVER;
    } else if (style.includes(STYLE_HOVER_ITEM)) {
        return STYLE_HOVER_ITEM;
    }
    return '';
}

let graph = new mxGraph();

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

    graph.ownConnectionHandler = new connectionHandler(graph)
    graph.addMouseListener(graph.ownConnectionHandler);
    graph.editHandler = new editHandler(graph);
    graph.grammar = new Grammar();

    //values of states are XML Node, which need to have a name, but not displayed
    // graph.convertValueToString = function (cell) {
    //     const value = cell.value
    //     if (mxUtils.isNode(value)) {
    //         return '';
    //     } else if (typeof (value.toString) == 'function') {
    //         return value.toString();
    //     }
    //     return '';
    // }

    return graph;
}

function setStylsheet(graph) {
    let stylesheet = graph.getStylesheet();
    let state_style = stylesheet.createDefaultVertexStyle();
    let lritem_style = stylesheet.createDefaultVertexStyle();
    let edge_style = stylesheet.createDefaultEdgeStyle();

    //state
    state_style[mxConstants.STYLE_EDITABLE] = 0;
    state_style[mxConstants.STYLE_ROUNDED] = 1;

    //final_state
    let final_state_style = Object.assign({}, state_style); //copy state_style
    final_state_style[mxConstants.STYLE_STROKEWIDTH] = 5;

    //lritem
    lritem_style[mxConstants.STYLE_MOVABLE] = 0;

    //edge

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

    stylesheet.putCellStyle(STYLE_STATE, state_style);
    stylesheet.putCellStyle(STYLE_FINAL_STATE, final_state_style)
    stylesheet.putCellStyle(STYLE_LR_ITEM, lritem_style);
    stylesheet.putCellStyle(STYLE_EDGE, edge_style);
}


// ------------- Listener ---------------
function addListeners(graph) {
    graph.addListener(null, (_, evt) => {
        //print every event
        // if (evt.name !== "fireMouseEvent")
        //     console.log(evt);
    });
    graph.addListener(mxEvent.CELLS_MOVED, (_, evt) => {
        console.log(evt);
        const cells = evt.getProperty('cells');
        for (const i in cells) {
            const cell = cells[i];
            if (cell === graph.startState) {
                // move start state startIndicator if start state moved
                const geo_start = cell.getGeometry();
                const geo_source = graph.startIndicatorSource.getGeometry().clone()
                geo_source.x = geo_start.x - 30;
                geo_source.y = geo_start.y + geo_start.height / 2
                graph.getModel().setGeometry(graph.startIndicatorSource, geo_source);
            }
        }
    });
}

// ---------------- stuff ------------------------

function addStartState(graph) {
    //add start state to graph
    graph.getModel().beginUpdate();
    const X = 200, Y = 200;
    const width = 80;
    const height = 30;
    try {
        const node = null;
        const startState = graph.insertVertex(graph.getDefaultParent(), null, node, X, Y, width, height, STYLE_STATE);
        // Add LR ITem
        graph.insertVertex(startState, null, "S' ➜ •E", 0, 20, 40, 20, STYLE_LR_ITEM);

        // set start state and add startIndicator edge
        setStartStateIntern(graph, startState);
    } finally {
        graph.getModel().endUpdate();
    }
}

function addState(graph, locX, loxY) {
    // adds a state to the graph on given position and returns the created cell
    let state;
    graph.getModel().beginUpdate();
    try {
        // xml node as value, to store attributes for the state
        // const node = mxUtils.createXmlDocument().createElement('State');
        const node = null
        state = graph.insertVertex(graph.getDefaultParent(), null, node, locX, loxY, 80, 30, STYLE_STATE);
    } finally {
        graph.getModel().endUpdate();
    }
    graph.editHandler.editState(graph, state);
    return state;
}

function setStartStateIntern(graph, state) {
    if (state == null)
        return;
    const geo = state.getGeometry();
    const source = graph.insertVertex(graph.getDefaultParent(), null, null,
        geo.x - 30, geo.y + geo.height / 2, 0, 0);
    const startIndicator = graph.insertEdge(graph.getDefaultParent(), null, null, source, state);
    graph.startState = state;
    graph.getModel().remove(graph.startIndicatorSource);
    graph.getModel().remove(graph.startIndicatorEdge);
    graph.startIndicatorSource = source;
    graph.startIndicatorEdge = startIndicator;
}

/**
 * toggles the final state attribute on the selected States
 */
function toggleFinalStates() {
    const selection = graph.getSelectionModel().cells;
    for (const i in selection) {
        const cell = selection[i];
        if (cell.getType() === STYLE_STATE) {
            if (cell.getStyle() === STYLE_FINAL_STATE) {
                graph.getModel().setStyle(cell, STYLE_STATE)
            } else {
                graph.getModel().setStyle(cell, STYLE_FINAL_STATE)
            }
        }
    }
}

/**
 * deletes the selected states and edges
 * connected edges are deleted as well
 */
function deletedStates() {
    const selection = graph.getSelectionModel().cells;
    graph.getModel().beginUpdate();
    try {
        for (const i in selection) {
            const cell = selection[i];
            if (cell.getType() === STYLE_STATE || cell.getType() === STYLE_EDGE) {
                if (graph.startState !== cell) { //start state cannot be deleted (now)
                    graph.getModel().remove(cell);
                }
            }
        }
    } finally {
        graph.getModel().endUpdate();
    }
}

/**
 * sets the selected state to the start State if only one state is selected
 */
function setStartState() {
    const selection = graph.getSelectionModel().cells;
    graph.getModel().beginUpdate();
    try {
        let newStartState = null;
        for (const i in selection) {
            const cell = selection[i];
            if (cell.getType() === STYLE_STATE) {
                if (newStartState === null) {
                    newStartState = cell;
                } else {
                    console.log("Only one state can be start State, but multiple states were selected")
                    newStartState = null;
                    break;
                }
            }
        }
        setStartStateIntern(graph, newStartState);
    } finally {
        graph.getModel().endUpdate();
    }
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
/**
 * creates an XML representation of the graph, with mxCodec ans mxUtils.getXml
 * a version attribute is added for compatibility reasons
 */
function serializeGraph(graph) {

    //remove temporary shapes added to the graph, they should not be saved
    graph.ownConnectionHandler.removePreview();
    graph.ownConnectionHandler.removeHoverCell();

    //use mxCodec to create an XML representations of the graph
    const enc = new mxCodec();
    const graph_xml = enc.encode(graph.getModel());
    const root_xml = document.implementation.createDocument(null, "LRTutor", null);
    const root_elem = root_xml.getElementsByTagName('LRTutor')[0];
    root_elem.setAttribute('version', GRAPH_VERSION);
    const graph_node = root_xml.createElement('Graph');
    graph_node.appendChild(graph_xml);
    root_elem.appendChild(graph_node);

    //save start state
    graph_node.setAttribute('start_state', graph.startState.id)
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

        //set start state
        const start_id = graph_node.getAttribute('start_state');
        graph.startState = graph.getModel().cells[start_id];

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
