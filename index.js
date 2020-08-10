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

function check_evt(sender, evt) {
    console.log("event")
}

function initGraph(container) {
    const graph = new mxGraph(container, new mxGraphModel());
    // graph.setEnabled(false);
    graph.setAllowDanglingEdges(false);
    graph.setDisconnectOnMove(false);
    // graph.setConnectable(true);
    graph.setEdgeLabelsMovable(false);
    graph.setAutoSizeCells(true); //TODO autosize
    graph.setCellsResizable(false);
    graph.setEnterStopsCellEditing(true);
    return graph;
}

function setStylsheet(graph) {
    let stylesheet = graph.getStylesheet();
    let state_style = stylesheet.createDefaultVertexStyle();
    let lritem_style = stylesheet.createDefaultVertexStyle();
    stylesheet.putCellStyle('state', state_style);
    stylesheet.putCellStyle('lritem', lritem_style);

    //state
    state_style[mxConstants.STYLE_EDITABLE] = 0;
    state_style[mxConstants.STYLE_ROUNDED] = 1;

    //lritem
    lritem_style[mxConstants.STYLE_MOVABLE] = 0;
}


// ------------- Listener ---------------
function addListeners(graph) {
    //listen editing start stop
    let cur_edit_cell = null;
    graph.addListener(null, (_, evt) => {
        //print every event
        if (evt.name !== "fireMouseEvent")
            console.log(evt);
    });
    graph.addListener(mxEvent.EDITING_STARTED, (sender, evt) => {
        cur_edit_cell = evt.getProperty('cell');
    });
    graph.addListener(mxEvent.EDITING_STOPPED, (sender, evt) => {
        let cell = cur_edit_cell;
        cur_edit_cell = null;
        if (cell && cell.getStyle() === 'lritem') {
            listenEditStopLRItem(graph, cell, evt);
            evt.consume();
        }
    });

    graph.addListener(mxEvent.CLICK, listenClick);
}

function listenClick(sender, evt) {
    const cell = evt.getProperty('cell');
    const mainEvent = evt.getProperty('event');
    if (!cell) {
        // click on canvas
        if (!evt.consumed) {
            // click has not be used for another action
            // TODO: filter unselect clicks and done editing clicks
            addState(graph, mainEvent.clientX , mainEvent.clientY );
            console.log('Cell added');
        }
    }
}

function listenEditStopLRItem(graph, cell, evt) {
    // lr items escaping and creation
    const value = cell.getValue();
    const newValue = escapeLRItem(value);
    let edit_cell = null;
    if (newValue === "") {
        //remove empty lr item
        graph.getModel().beginUpdate();
        try {
            graph.removeCells([cell]);
        } finally {
            graph.getModel().endUpdate();
        }
    } else {
        graph.getModel().setValue(cell, newValue);
        if (!evt.getProperty('cancel')) {
            //start editing the next lr item in the cell
            const state = cell.getParent();
            const index = state.children.indexOf(cell);
            editState(graph, state, index + 1);
        }
    }
}

// ---------------- stuff ------------------------
function escapeLRItem(text) {
    //pretty characters for LR Items
    text = text.replace("\\.", "•").replace("\\->", "➜");
    return text;
}

function addStartState(graph) {
    //add start state to graph
    graph.getModel().beginUpdate();
    try {
        const startState = graph.insertVertex(graph.getDefaultParent(), null, "", 200, 200, 80, 30, 'state');
        const lrItem = graph.insertVertex(startState, null, "S' ➜ •S", 0, 20, 40, 20, 'lritem');
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
        state = graph.insertVertex(graph.getDefaultParent(), null, "", locX, loxY, 80, 30, 'state');
    } finally {
        graph.getModel().endUpdate();
    }
    editState(graph, state);
    return state;
}

function editState(graph, state, index = -1) {
    // edits lr Item on index of state and start editing
    // if index does not exist, new lritem is added
    let item;
    graph.getModel().beginUpdate();
    try {
        item = state.getChildAt(index);
        if (!item) {
            item = graph.insertVertex(state, null, "", 0, state.getChildCount() * 20 + 20, 40, 20, 'lritem');
        }
    } finally {
        graph.getModel().endUpdate();
    }
    graph.startEditingAtCell(item);
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