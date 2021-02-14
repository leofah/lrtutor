import {
    LRITEM_HEIGHT,
    STATE_MARGIN,
    STATE_MIN_HEIGHT,
    STATE_MIN_WIDTH,
    STYLE_EDGE,
    STYLE_FINAL_STATE,
    STYLE_LR_ITEM,
    STYLE_SHOW_ID,
    STYLE_STATE
} from "./constants.js";
import {getGraph} from "./init.js";

/**
 * adds a state to the graph on given position and starts editing the first LR item
 * @param graph mxGraph
 * @param locX X location of top left corner for new state
 * @param locY Y location of top left corner for new state
 * @return {mxCell} the created State
 */
export function addState(graph, locX, locY) {
    let state;
    graph.getModel().beginUpdate();
    try {
        // xml node as value, to store attributes for the state
        // const node = mxUtils.createXmlDocument().createElement('State');
        const node = null
        state = graph.insertVertex(graph.getDefaultParent(), null, node, locX, locY, STATE_MIN_WIDTH, STATE_MIN_HEIGHT, STYLE_STATE);
    } finally {
        graph.getModel().endUpdate();
    }
    graph.editHandler.editState(state);
    return state;
}

/**
 * Add a new Edge to the graph. If an edge with the same terminal and source
 * already exists, this edge is removed, as the graph is deterministic.
 *
 * @param graph mxGraph
 * @param source Source of the edge
 * @param target Target of the edge
 * @param terminal Terminal to use as label for the edge
 * @return the created edge
 */
export function addEdge(graph, source, target, terminal) {
    graph.getModel().beginUpdate();
    try {
        // remove edge with same terminal (deterministic graph)
        for (const i in source.edges) {
            let edge = source.getEdgeAt(i);
            if (edge.getValue() === terminal && edge.getTerminal(true) === source) {
                graph.removeCells([edge]);
                break;
            }
        }
        const edge = graph.insertEdge(
            graph.getDefaultParent(), null, terminal, source, target, STYLE_EDGE);
        //position the label of the edge
        edge.geometry.x = 0; //position on the edge (-1, 1)
        edge.geometry.y = 10; //orthogonal distance from edge in pixels
    } finally {
        graph.getModel().endUpdate();
    }
    graph.getSelectionModel().clear();
}

/**
 * Adds the first State to the Graph. This will always be the start State of the graph.
 * All identifiers for the start state are added accordingly. The first LR Item for the
 * start production of the grammar is also added.
 *
 * @param graph
 */
export function addStartState(graph) {
    //add start state to graph
    graph.getModel().beginUpdate();
    const X = 50, Y = 50;
    try {
        const node = null;
        const startState = graph.insertVertex(graph.getDefaultParent(), null, node, X, Y, STATE_MIN_WIDTH, STATE_MIN_HEIGHT, STYLE_STATE);
        // Add LR ITem
        graph.insertVertex(startState, null, graph.grammar.getStartLRItemText(),
            STATE_MARGIN, STATE_MARGIN, 30, LRITEM_HEIGHT, STYLE_LR_ITEM);

        // set start state and add startIndicator edge
        setStartStateIntern(graph, startState);
        graph.editHandler.resizeState(startState);
    } finally {
        graph.getModel().endUpdate();
    }
}

/**
 * Helper to set the variables in the graph to find the start state
 * Could be used, if the start state changes to a new state.
 *
 * @param graph mxGraph
 * @param state new start State
 */
function setStartStateIntern(graph, state) {
    if (state == null)
        return;
    const geo = state.getGeometry();
    const source = graph.insertVertex(graph.getDefaultParent(), null, null,
        geo.x - 30, geo.y + geo.height / 2, 0, 0);
    const startIndicator = graph.insertEdge(graph.getDefaultParent(), null, null, source, state, STYLE_EDGE);
    graph.startState = state;
    graph.getModel().remove(graph.startIndicatorSource);
    graph.startIndicatorSource = source;
}

/**
 * move start state startIndicator to its correct position, so it is horizontal.
 * Used if the start state moved.
 *
 * @param graph
 */
export function redrawStartIndicator(graph) {
    const geoStart = graph.startState.getGeometry();
    const geoSource = graph.startIndicatorSource.getGeometry().clone()
    geoSource.x = geoStart.x - 30;
    geoSource.y = geoStart.y + geoStart.height / 2
    graph.getModel().setGeometry(graph.startIndicatorSource, geoSource);
}

/**
 * toggles the final state attribute on the selected States
 */
export function toggleFinalStates() {
    const graph = getGraph();
    if (graph.isEditing()) return;
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
 * The start state is not deleted.
 */
export function deleteStates() {
    const graph = getGraph();
    if (graph.isEditing()) return;
    const selection = graph.getSelectionCells()
    const startIndicator = graph.startIndicatorSource.edges[0];
    graph.getModel().beginUpdate();
    try {
        for (const cell of selection) {
            if (cell.getType() === STYLE_STATE || cell.getType() === STYLE_EDGE) {
                if (graph.startState === cell || startIndicator === cell) continue; //start state cannot be deleted
                graph.removeCells([cell]);
            }
        }
    } finally {
        graph.getModel().endUpdate();
    }
}

let stateIds = new Map();

/**
 * Generates numerical ids, starting from 0, for the states and shows the ids on the canvas.
 * mxGraph cells already have ids, however the numbers can get quite large, so these
 * ids are only used to notify the user, all other ids are always built in mxCell ids.
 */
export function showIDs(graph) {
    hideIDs(graph);
    //generate ids
    const ids = new Map();
    let i = 0;
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;
        ids.set(cell.id, i++);
    }
    //show ids in graph
    graph.getModel().beginUpdate();
    try {
        for (const [cellId, i] of ids) {
            const h = LRITEM_HEIGHT;
            const geo = graph.getModel().getCell(cellId).geometry;
            const v = graph.insertVertex(graph.getDefaultParent(), null, i,
                geo.x - h / 2, geo.y - h / 2, h, h, STYLE_SHOW_ID);
            stateIds.set(cellId, v);
        }
    } finally {
        graph.getModel().endUpdate();
    }
}

/**
 * deletes the shown ids of the states
 */
export function hideIDs(graph) {
    graph.getModel().beginUpdate();
    try {
        for (const cell of Object.values(graph.getModel().cells)) {
            if (cell.getType() !== STYLE_SHOW_ID) continue;
            graph.removeCells([cell]);
        }
    } finally {
        graph.getModel().endUpdate();
    }
    stateIds = new Map();
}

/**
 * moves the state id indicator
 * @param cellId
 */
export function moveStateId(cellId) {
    const graph = getGraph();
    if (!stateIds.has(cellId)) return;
    const id = stateIds.get(cellId);
    const geoCell = graph.getModel().getCell(cellId).getGeometry();
    const geo = id.getGeometry().clone();
    geo.x = geoCell.x - LRITEM_HEIGHT / 2;
    geo.y = geoCell.y - LRITEM_HEIGHT / 2;
    graph.getModel().setGeometry(id, geo);

}

/**
 * returns the shown ID of the given state
 * This only works if the ids are currently shown
 * @param cellId of the State
 * @return int id of given state or undefined
 */
export function getIdForCell(cellId) {
    return stateIds.get(cellId)?.value;
}

export function resetCanvas() {
    const graph = getGraph();
    //delete all states and add the start state again
    graph.getModel().beginUpdate();
    try {
        graph.getModel().clear();
        addStartState(graph);
    } finally {
        graph.getModel().endUpdate();

    }
}

/**
 * returns the is saved status of the graph
 * @param graph {mxGraph}
 * @return {boolean}
 */
export function getGraphSaved(graph) {
    if (graph?.saved === undefined)
        return false;
    return graph.saved;
}

/**
 * Sets the is saved status of the graph.
 * @param graph {mxGraph}
 * @param value {boolean}
 */
export function setGraphSaved(graph, value) {
    if (graph === undefined) return;
    graph.saved = value;
}

/**
 * If the graph was updated since the latest save, the user is asked to confirm a deletion of the unsaved graph.
 * returns true if it is not a problem to delete the graph
 * @return {boolean} indicating if the graph can be deleted
 */
export function confirmDeleteGraph(graph) {
    if (graph === undefined) return true;
    if(getGraphSaved(graph)) return true;
    return window.confirm("This action will delete the unsaved automaton. Do you want to proceed?");

}
