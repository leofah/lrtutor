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