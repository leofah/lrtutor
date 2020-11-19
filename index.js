const GRAPH_VERSION = '0.4';

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
document.write('<script src="checkGraph.js"></script>')
document.write('<script src="utils.js"></script>')

//add prototype function for cell to get the type (state, LR-Item) of the cell
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
mxCell.prototype.isFinal = function () {
    const style = this.getStyle();
    return style.includes(STYLE_FINAL_STATE);
}

let graph = new mxGraph();
let graphActive = false; //indicates if a graph and grammar is already loaded

function main() {
    //checks if browser is supported
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error('Unsupported Browser', 200, false);
    }
    // temporary
    document.getElementById('grammarTextArea').value = "S'➜E\nE➜E + T |T \nT➜T * F |F \nF➜( E ) |int \n"
}

function initGraph(grammar) {
    const g = new mxGraph(document.getElementById('mxCanvas'), new mxGraphModel());
    // graph.setEnabled(false);
    g.setAllowDanglingEdges(false);
    g.setDisconnectOnMove(false);
    // graph.setConnectable(true); //not needed if custom connectionHandler implemented and activated
    // graph.setAllowLoops(true); //works with the built in mxGraph connection Handler
    g.setEdgeLabelsMovable(false);
    g.setAutoSizeCells(true); //TODO autosize
    g.setCellsResizable(false);
    g.foldingEnabled = false;

    g.ownConnectionHandler = new connectionHandler(g)
    g.addMouseListener(g.ownConnectionHandler);
    g.editHandler = new editHandler(g);
    g.grammar = grammar;

    setStylsheet(g);
    addListeners(g);
    addStartState(g);

    //set global graph information
    graphActive = true;
    graph = g;

    return g;
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
    lritem_style[mxConstants.STYLE_STROKECOLOR] = 'none';

    //edge

    //hover
    let hover_style = stylesheet.createDefaultVertexStyle();
    let hitem_style = stylesheet.createDefaultVertexStyle();
    stylesheet.putCellStyle(STYLE_HOVER, hover_style);
    stylesheet.putCellStyle(STYLE_HOVER_ITEM, hitem_style);
    //background
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
        const cells = evt.getProperty('cells');
        for (const cell of cells) {
            if (cell === graph.startState) {
                redrawStartIndicator(graph)
            }
        }
    });
    graph.getSelectionModel().addListener(mxEvent.CHANGE, (_, evt) => {
        //visibility of the action commands on the graph like toggle final state or delete state
        const selectedCells = graph.getSelectionCells();
        let nrEdges = 0;
        let nrStates = 0;
        for (const cell of selectedCells) {
            if (cell.getType() === STYLE_STATE) nrStates++;
            if (cell.getType() === STYLE_EDGE) nrEdges++;
        }
        const gAction = document.getElementById("graphActions");
        const aDelete = document.getElementById("actionDelete");
        const aToggle = document.getElementById("actionToggleFinal");
        const aSetStart = document.getElementById("actionSetStart");

        console.log("State: " + nrStates + ", Edges: " + nrEdges + ", Sum: " + (nrStates + nrEdges))

        if (nrStates + nrEdges > 0) {
            gAction.classList.remove("d-none");
            aDelete.classList.remove("d-none");
        } else {
            gAction.classList.add("d-none")
            aDelete.classList.add("d-none");
        }
        if (nrStates > 0) aToggle.classList.remove("d-none");
        else aToggle.classList.add("d-none");

        if (nrStates === 1) aSetStart.classList.remove("d-none");
        else aSetStart.classList.add("d-none");

    });
}

// ---------------- stuff ------------------------

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
        graph.insertVertex(startState, null, graph.grammar.getStartLRItemText(), 5, 5, 40, 20, STYLE_LR_ITEM);

        // set start state and add startIndicator edge
        setStartStateIntern(graph, startState);
    } finally {
        graph.getModel().endUpdate();
    }
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
    graph.startIndicatorSource = source;
}

function redrawStartIndicator(graph) {
    // move start state startIndicator if start state moved
    const geoStart = graph.startState.getGeometry();
    const geoSource = graph.startIndicatorSource.getGeometry().clone()
    geoSource.x = geoStart.x - 30;
    geoSource.y = geoStart.y + geoStart.height / 2
    graph.getModel().setGeometry(graph.startIndicatorSource, geoSource);
}

// ------------ selected Cells actions-----------

/**
 * toggles the final state attribute on the selected States
 */
function toggleFinalStates() {
    const selection = graph.getSelectionCells()
    for (const cell of selection) {
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
    const selection = graph.getSelectionCells()
    graph.getModel().beginUpdate();
    try {
        for (const cell of selection) {
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
    const selection = graph.getSelectionCells()
    graph.getModel().beginUpdate();
    try {
        let newStartState = null;
        for (const cell of selection) {
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
    if (graphActive) {
        graph.zoomIn();
    }
}

function zoomOut() {
    if (graphActive) {
        graph.zoomOut();
    }
}

function resetZoom() {
    if (graphActive) {
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
    const graphXml = enc.encode(graph.getModel());

    const rootXml = document.implementation.createDocument(null, "LRTutor", null);
    const rootElem = rootXml.getElementsByTagName('LRTutor')[0];
    rootElem.setAttribute('version', GRAPH_VERSION);

    const graphNode = rootXml.createElement('Graph');
    graphNode.appendChild(graphXml);
    rootElem.appendChild(graphNode);

    //save grammar
    const grammarNode = rootXml.createElement('Grammar');
    grammarNode.setAttribute('lr', graph.grammar.lr);
    grammarNode.setAttribute('plain', graph.grammar);
    rootElem.appendChild(grammarNode);

    //save start state
    graphNode.setAttribute('startState', graph.startState.id)
    graphNode.setAttribute('startSource', graph.startIndicatorSource.id)
    return mxUtils.getPrettyXml(rootXml);
}

function deSerializeGraph(serial) {
    /**
     * deserializes a text/xml representation of the graph and loads it.
     * Version number is checked
     */
    try {
        const doc = mxUtils.parseXml(serial);
        const graphNode = doc.getElementsByTagName('Graph')[0];
        const vers = doc.documentElement.getAttribute('version');
        if (vers !== GRAPH_VERSION) {
            return "Invalid File Version: '" + vers + "', need version: '" + GRAPH_VERSION + "'";
        }

        //add grammar
        const grammarNode = doc.getElementsByTagName('Grammar')[0];
        const grammar = new Grammar(grammarNode.getAttribute('plain'), parseInt(grammarNode.getAttribute('lr')));
        changeGrammarDOM(grammar);
        if (grammar.error())
            return;
        if (!graphActive)
            initGraph(grammar);
        else
            graph.grammar = grammar;

        const graphDocument = mxUtils.parseXml(graphNode.innerHTML);
        const codec = new mxCodec(graphDocument);
        codec.decode(graphNode.firstElementChild, graph.getModel());

        //set start state
        const startID = graphNode.getAttribute('startState');
        graph.startState = graph.getModel().cells[startID];
        const startSourceID = graphNode.getAttribute('startSource');
        graph.startIndicatorSource = graph.getModel().cells[startSourceID];

    } catch (e) {
        return "Invalid File Format: " + e;
    }
}

function saveGraph() {
    if (graphActive)
        saveFile('graph.xml', serializeGraph(graph), 'text/xml');
}

function loadGraph() {
    loadFile(serial => {
        // remove grammar input
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

function setGrammar(plainGrammar, lr0) {
    const lr = lr0 ? 0 : 1;
    const grammar = new Grammar(plainGrammar, lr);
    changeGrammarDOM(grammar);
    if (grammar.error())
        return;
    initGraph(grammar);
}

function changeGrammarDOM(grammar) {
    const grammarTextElement = document.getElementById("grammarText");
    const grammarErrorElement = document.getElementById("grammarError");

    //Set default state
    while (grammarTextElement.hasChildNodes()) grammarTextElement.removeChild(grammarTextElement.firstChild);
    while (grammarErrorElement.hasChildNodes()) grammarErrorElement.removeChild(grammarErrorElement.firstChild);
    grammarErrorElement.classList.add("d-none")

    //input new grammar information
    if (grammar.error()) {
        grammarErrorElement.appendChild(document.createTextNode("Errors In the Grammar definition:\n"));
        grammarErrorElement.appendChild(document.createTextNode(grammar._errors.join('\n')));

        grammarErrorElement.classList.remove("d-none")
    } else {
        grammarTextElement.appendChild(document.createTextNode(grammar));

        document.getElementById("grammarPresent").classList.remove("d-none")
        document.getElementById("grammarInput").classList.add("d-none");
    }
}
