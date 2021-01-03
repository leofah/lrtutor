// adds a state to the graph on given position and starts editing the first LR item
// returns the created cell
function addState(graph, locX, loxY) {
    let state;
    graph.getModel().beginUpdate();
    try {
        // xml node as value, to store attributes for the state
        // const node = mxUtils.createXmlDocument().createElement('State');
        const node = null
        state = graph.insertVertex(graph.getDefaultParent(), null, node, locX, loxY, STATE_MIN_WIDTH, STATE_MIN_HEIGHT, STYLE_STATE);
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
function addEdge(graph, source, target, terminal) {
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
function addStartState(graph) {
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
    const startIndicator = graph.insertEdge(graph.getDefaultParent(), null, null, source, state);
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
function redrawStartIndicator(graph) {
    const geoStart = graph.startState.getGeometry();
    const geoSource = graph.startIndicatorSource.getGeometry().clone()
    geoSource.x = geoStart.x - 30;
    geoSource.y = geoStart.y + geoStart.height / 2
    graph.getModel().setGeometry(graph.startIndicatorSource, geoSource);
}

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
                if (graph.startState !== cell) { //start state cannot be deleted
                    graph.getModel().remove(cell);
                }
            }
        }
    } finally {
        graph.getModel().endUpdate();
    }
}