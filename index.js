const GRAPH_VERSION = '0.4';

//Style and type names for the different elements on the canvas
const STYLE_STATE = 'state';
const STYLE_FINAL_STATE = 'final';
const STYLE_EDGE = 'edge';
const STYLE_LR_ITEM = 'lritem';
const STYLE_SHOW_ID = 'showid';

//Colors for the elements
const COLOR_FONT = '#363D45';
const COLOR_STATE = '#93E4F1';
const COLOR_STATE_BORDER = '#0E606C';
const COLOR_EDGE = '#073036';
const COLOR_ID = '#F8F991';
const COLOR_BACKGROUND = '#F5F5F4'

//Set Pixel Values for States and Items
const STATE_MARGIN = 10;
const LRITEM_HEIGHT = 20;
const STATE_MIN_HEIGHT = 40;
const STATE_MIN_WIDTH = 60;

//include files (for development)
document.write('<script src="graph.js"></script>')
document.write('<script src="connectionHandler.js"></script>')
document.write('<script src="editHandler.js"></script>')
document.write('<script src="grammar.js"></script>')
document.write('<script src="checkGraph.js"></script>')
document.write('<script src="utils.js"></script>')
document.write('<script src="io.js"></script>')

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
    I('grammarTextArea').value = "S'➜E\nE➜E + T |T \nT➜T * F |F \nF➜( E ) |int \n"
}

function initGraph(grammar) {
    //setup the mxGraph and its variables
    const g = new mxGraph(I('mxCanvas'), new mxGraphModel());
    g.setAllowDanglingEdges(false);
    g.setDisconnectOnMove(false);
    g.setEdgeLabelsMovable(false);
    g.setAutoSizeCells(true);
    g.setCellsResizable(false);
    g.setCellsCloneable(false);
    g.setAllowNegativeCoordinates(false);
    g.foldingEnabled = false;

    //own Setup
    g.grammar = grammar;

    // add custom handler for editing and connection cells
    g.ownConnectionHandler = new connectionHandler(g)
    g.editHandler = new editHandler(g);

    setStylesheet(g);
    addListeners(g);
    addStartState(g);
    registerCallbacks(g);

    //set global graph information
    graphActive = true;
    graph = g;

    return g;
}

function setStylesheet(graph) {
    let stylesheet = graph.getStylesheet();

    //state
    let state_style = {};
    state_style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE;
    state_style[mxConstants.STYLE_FILLCOLOR] = COLOR_STATE;
    state_style[mxConstants.STYLE_STROKECOLOR] = COLOR_STATE_BORDER;

    state_style[mxConstants.STYLE_EDITABLE] = 0;
    state_style[mxConstants.STYLE_ROUNDED] = 1;
    stylesheet.putCellStyle(STYLE_STATE, state_style);

    //final_state
    let final_state_style = Object.assign({}, state_style); //copy state_style
    final_state_style[mxConstants.STYLE_STROKEWIDTH] = 5;
    stylesheet.putCellStyle(STYLE_FINAL_STATE, final_state_style)

    //lritem
    let lritem_style = {};
    lritem_style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE;
    lritem_style[mxConstants.STYLE_FONTCOLOR] = COLOR_FONT;
    lritem_style[mxConstants.STYLE_STROKECOLOR] = 'none';
    lritem_style[mxConstants.STYLE_FILL_OPACITY] = 0;
    lritem_style[mxConstants.STYLE_MOVABLE] = 0;
    lritem_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_LEFT;
    stylesheet.putCellStyle(STYLE_LR_ITEM, lritem_style);

    //edge
    let edge_style = stylesheet.createDefaultEdgeStyle();
    edge_style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR;
    edge_style[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;
    edge_style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE;
    edge_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
    edge_style[mxConstants.STYLE_STROKECOLOR] = COLOR_EDGE;
    edge_style[mxConstants.STYLE_FONTCOLOR] = COLOR_FONT;
    stylesheet.putCellStyle(STYLE_EDGE, edge_style);

    //show id
    let showid_style = {};
    showid_style[mxConstants.STYLE_MOVABLE] = 0;
    showid_style[mxConstants.STYLE_EDITABLE] = 0;
    showid_style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_ELLIPSE;
    showid_style[mxConstants.STYLE_STROKECOLOR] = 'none';
    showid_style[mxConstants.STYLE_FILLCOLOR] = COLOR_ID;
    showid_style[mxConstants.STYLE_FONTCOLOR] = COLOR_FONT;
    showid_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
    stylesheet.putCellStyle(STYLE_SHOW_ID, showid_style);

    I('mxCanvas').style.backgroundColor = COLOR_BACKGROUND;
}

function addListeners(graph) {
    // example listener
    graph.addListener(null, (_, evt) => {
        //print every event
        // if (evt.name !== "fireMouseEvent")
        //     console.log(evt);
    });

    //add a new State on the Canvas
    graph.addMouseListener({
        'mouseUp': function (_, evt) {
            // needs to be in Mouse Up, cause Mouse Down stops the editing automatically. This stopping is
            // executed automatically after this handler and cannot be changed.
            // Checking if the User was editing is therefore only possible with huge overhead.
            if (evt.isConsumed()) return
            if (graph.getSelectionCells().length > 0) return; //deselect cells and don't add a new state
            //don't add a cell if the canvas was scrolled
            if (this.scrollStart !== I('mxCanvas').scrollLeft + I('mxCanvas').scrollTop) return;

            // if (graph.cellEditor.editingCell) { // ist never editing, because mouse down stops editing
            //     graph.stopEditing(true);
            //     return;
            // }

            const cell = evt.getCell();
            if (cell) return;
            addState(graph, evt.getGraphX(), evt.getGraphY());
        },
        //These are needed for a mouse listener
        'mouseMove': function () {
        },
        'mouseDown': function () {
            this.scrollStart = I('mxCanvas').scrollLeft + I('mxCanvas').scrollTop;
        },
    });

    //redraw start indicator / hide state ids
    graph.addListener(mxEvent.CELLS_MOVED, (_, evt) => {
        const cells = evt.getProperty('cells');
        for (const cell of cells) {
            if (cell === graph.startState) {
                redrawStartIndicator(graph);
            }
        }
        hideIDs();
    });

    //visibility of the action commands, like toggle final state or delete state
    graph.getSelectionModel().addListener(mxEvent.CHANGE, (_, evt) => {
        const selectedCells = graph.getSelectionCells();
        let nrEdges = 0;
        let nrStates = 0;
        for (const cell of selectedCells) {
            if (cell.getType() === STYLE_STATE) nrStates++;
            if (cell.getType() === STYLE_EDGE) nrEdges++;
        }
        const gAction = I("graphActions");
        const aDelete = I("actionDelete");
        const aToggle = I("actionToggleFinal");
        const gErrors = I("graphErrors");

        if (nrStates + nrEdges > 0) {
            gAction.classList.remove("d-none");
            aDelete.classList.remove("d-none");
            gErrors.classList.add("d-none");
        } else {
            gAction.classList.add("d-none");
            aDelete.classList.add("d-none");
            gErrors.classList.remove("d-none");
        }
        if (nrStates > 0) aToggle.classList.remove("d-none");
        else aToggle.classList.add("d-none");

    });

    //keyboard listener
    document.addEventListener('keydown', evt => {
        switch (evt.key) {
            case 'Delete':
                deleteStates();
                break;
            case 'f':
                toggleFinalStates();
                break;
            case 's':
                // setStartState();
                break;
        }
    });
}

/**
 * register some callbacks for the serialization, which cannot register themself
 * @param graph mxGraph
 */
function registerCallbacks(graph) {
    executeBeforeSerialize(graph, hideErrors);
    executeBeforeSerialize(graph, hideIDs);
}

/**
 * Parses the grammar and initializes the graph with the grammar
 * If there is an error in the grammar, no graph will be created,
 * however the error messages will be displayed in the grammarDOM
 *
 * @param plainGrammar Grammar description
 * @param lr0 int to represent the lr type, 0 or 1 is allowed
 */
function setGrammar(plainGrammar, lr0) {
    const lr = lr0 ? 0 : 1;
    const grammar = new Grammar(plainGrammar, lr);
    changeGrammarDOM(grammar);
    if (grammar.error())
        return;
    initGraph(grammar);
}

function changeGrammarDOM(grammar) {
    const grammarTextElement = I("grammarText");
    const grammarErrorElement = I("grammarError");

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

        I("grammarPresent").classList.remove("d-none")
        I("grammarInput").classList.add("d-none");
    }

    //show the graph content
    I("graphContent").classList.remove("d-none");
    I("saveGraph").classList.remove("d-none");
}
