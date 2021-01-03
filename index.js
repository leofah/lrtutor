const GRAPH_VERSION = '0.4';

//Style and type names for the different elements on the canvas
const STYLE_STATE = 'state';
const STYLE_FINAL_STATE = 'final'
const STYLE_EDGE = 'edge';
const STYLE_LR_ITEM = 'lritem';

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
    lritem_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_LEFT;

    //edge

    stylesheet.putCellStyle(STYLE_STATE, state_style);
    stylesheet.putCellStyle(STYLE_FINAL_STATE, final_state_style)
    stylesheet.putCellStyle(STYLE_LR_ITEM, lritem_style);
    stylesheet.putCellStyle(STYLE_EDGE, edge_style);
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

    //redraw start indicator
    graph.addListener(mxEvent.CELLS_MOVED, (_, evt) => {
        const cells = evt.getProperty('cells');
        for (const cell of cells) {
            if (cell === graph.startState) {
                redrawStartIndicator(graph);
            }
        }
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
                deletedStates();
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
