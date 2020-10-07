const errorHighlights = [];

function checkGraph() {
    checkCorrectLrItems(graph);
}

function hideErrors() {
    for (h of errorHighlights) {
        h.destroy();
    }
}

function checkCorrectLrItems(graph) {
    /**
     * Checks if each LR Item in the graph is correctly formatted
     */
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_LR_ITEM)
            continue;

        if (!graph.grammar.isLRItem(cell.getValue())) {
            const errorHighlight = new mxCellHighlight(graph, 'red', 1);
            errorHighlight.highlight(graph.view.getState(cell));
            errorHighlights.push(errorHighlight);
        }
    }
}
