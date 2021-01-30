import {
    addStartState,
    addState,
    deleteStates,
    moveStateId,
    redrawStartIndicator,
    showIDs,
    toggleFinalStates
} from "./graph.js";
import Grammar from "./grammar.js";
import editHandler from "./editHandler.js";
import connectionHandler from "./connectionHandler.js";
import {
    COLOR_BACKGROUND,
    COLOR_EDGE,
    COLOR_FONT,
    COLOR_ID,
    COLOR_STATE,
    COLOR_STATE_BORDER,
    STYLE_EDGE,
    STYLE_FINAL_STATE,
    STYLE_LR_ITEM,
    STYLE_SHOW_ID,
    STYLE_STATE
} from "./constants.js";
import {I} from "./utils.js";
import {executeBeforeSerialize} from "./io.js";
import {hideErrors} from "./checkGraph.js";

/**
 * prototype function for cell to get the type (state, LR-Item) of the cell
 * cell.style cannot be returned as name, as it can contain overwritten style information, like a new color
 * However the Type Names need to be designed s.t. none includes another
 */
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
    } else if (style.includes(STYLE_SHOW_ID)) {
        return STYLE_SHOW_ID;
    }
    return '';
}
mxCell.prototype.isFinal = function () {
    const style = this.getStyle();
    return style.includes(STYLE_FINAL_STATE);
}

if (!mxClient.isBrowserSupported()) {
    mxUtils.error('Unsupported Browser', 200, false);
}

let graph = undefined;

export function getGraph() {
    return graph;
}

export function initGraph(grammar) {
    //setup the mxGraph and its variables
    const g = new mxGraph(I('mxCanvas'), new mxGraphModel());
    g.setAllowDanglingEdges(false);
    g.setDisconnectOnMove(false);
    g.setEdgeLabelsMovable(false);
    g.setAutoSizeCells(true);
    g.setCellsResizable(false);
    g.setCellsCloneable(false);
    g.setAllowNegativeCoordinates(false);
    g.setCellsDisconnectable(false); //don't allow edges to be move to different states
    g.foldingEnabled = false; //dont' show the folding action/icon in nested cells (states)

    //own Setup
    g.grammar = grammar;
    g.ownConnectionHandler = new connectionHandler(g)
    g.editHandler = new editHandler(g);

    setStylesheet(g);
    addListeners(g);
    addStartState(g);
    registerCallbacks(g);

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
    lritem_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_LEFT;
    lritem_style[mxConstants.STYLE_MOVABLE] = 0;
    stylesheet.putCellStyle(STYLE_LR_ITEM, lritem_style);

    //edge
    let edge_style = stylesheet.createDefaultEdgeStyle();
    edge_style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR;
    edge_style[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;
    edge_style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE;
    edge_style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
    edge_style[mxConstants.STYLE_STROKECOLOR] = COLOR_EDGE;
    edge_style[mxConstants.STYLE_FONTCOLOR] = COLOR_FONT;
    edge_style[mxConstants.STYLE_MOVABLE] = 0;
    edge_style[mxConstants.STYLE_EDITABLE] = 0;
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

    //rectangular selection
    new mxRubberband(graph);

    //add a new State on the Canvas
    graph.addMouseListener({
        scrollStart: undefined,
        'mouseUp': function (_, evt) {
            // needs to be in Mouse Up, cause Mouse Down stops editing of the new cell automatically.
            // This stopping is executed after this handler and cannot be changed.
            // Checking if the user was editing is therefore only possible with huge overhead.
            if (evt.isConsumed()) return
            if (graph.getSelectionCells().length > 0) return; //deselect cells and don't add a new state
            //don't add a cell if the canvas was scrolled
            if (this.scrollStart !== I('mxCanvas').scrollLeft + I('mxCanvas').scrollTop) return;

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

    // handle stateIds placement
    graph.addListener(null, (_, evt) => {
        if (evt.name === mxEvent.MOVE_CELLS) {
            //move indicator
            const cells = evt.getProperty('cells');
            for (const cell of cells.filter(c => c.getType() === STYLE_STATE)) {
                moveStateId(cell.getId());
            }
        }
        if (evt.name === mxEvent.ADD_CELLS || evt.name === mxEvent.REMOVE_CELLS) {
            //generate new indicators
            const cells = evt.getProperty('cells');
            if (cells.filter(c => c.getType() === STYLE_STATE).length > 0) {
                showIDs(graph);
            }
        }
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
}

/**
 * Parses the grammar and initializes the graph with the grammar
 * If there is an error in the grammar, no graph will be created,
 * however the error messages will be displayed in the grammarDOM
 *
 * @param plainGrammar Grammar description
 * @param lr0 int to represent the lr type, 0 or 1 is allowed
 */
export function setGrammar(plainGrammar, lr0) {
    const lr = lr0 ? 0 : 1;
    const grammar = new Grammar(plainGrammar, lr);
    changeGrammarDOM(grammar);
    if (grammar.error())
        return;
    initGraph(grammar);
}

export function changeGrammarDOM(grammar) {
    const grammarTextElement = I("grammarText");
    const grammarErrorElement = I("grammarError");

    //Set default state
    while (grammarTextElement.hasChildNodes()) grammarTextElement.removeChild(grammarTextElement.firstChild);
    while (grammarErrorElement.hasChildNodes()) grammarErrorElement.removeChild(grammarErrorElement.firstChild);
    grammarErrorElement.classList.add("d-none")

    //input new grammar information
    if (grammar.error()) {
        grammarErrorElement.appendChild(document.createTextNode("Errors In the Grammar definition:\n"));
        const list = document.createElement("ul");
        for (const e of grammar._errors) {
            const li = document.createElement("li");
            li.textContent = e;
            list.appendChild(li);
        }
        grammarErrorElement.appendChild(list);

        grammarErrorElement.classList.remove("d-none")
    } else {
        const pre = document.createElement("pre");
        pre.appendChild(document.createTextNode(grammar));
        grammarTextElement.appendChild(pre);

        grammarTextElement.appendChild(document.createTextNode("Terminals: " + grammar.terminals));
        grammarTextElement.appendChild(document.createElement("br"));
        grammarTextElement.appendChild(document.createTextNode("Nonterminals: " + grammar.nonTerminals));

        I("graphHeading").textContent = "Canonical LR(" + grammar.lr + ") Automaton";

        grammarTextElement.classList.remove("d-none")
        I("grammarInput").classList.add("d-none");
        I("grammarInputButtons").classList.add("d-none");

        //show the graph content
        I("graphContent").classList.remove("d-none");
    }
}
