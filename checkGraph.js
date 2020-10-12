const errorHighlights = [];

function checkGraph() {
    hideErrors()
    const lrCheck = checkCorrectLrItems(graph);
    const closureCheck = checkCorrectClosure(graph);

    //highlight errors:
    for (const cell of lrCheck.incorrect.concat(closureCheck.incorrect)) {
        const errorHighlight = new mxCellHighlight(graph, 'red', 1);
        errorHighlight.highlight(graph.view.getState(cell));
        errorHighlights.push(errorHighlight);
    }
}

function hideErrors() {
    for (h of errorHighlights) {
        h.destroy();
    }
}

function checkCorrectLrItems(graph) {
    /**
     * Checks if each LR Item in the graph is correctly formatted
     * @return all LRItems which are incorrect formatted
     */
    const incorrect = []
    const correct = []
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_LR_ITEM)
            continue;

        if (!graph.grammar.isLRItem(cell.getValue()))
            incorrect.push(cell)
        else
            correct.push(cell)
    }
    return {incorrect, correct}
}

function checkCorrectClosure(graph) {
    /**
     * Checks for each state if the closure of LR Items is correct
     */
    const incorrect = []
    const correct = []
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE)
            continue;

        const lrItems = [];
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) {
                console.log(lrItem + ' has wrong type?!')
                continue;
            }
            if (graph.grammar.isLRItem(lrItem.value)) //TODO faster?
                lrItems.push((lrItem.value))
        }

        const closure = graph.grammar.computeEpsilonClosure(lrItems);

        const isSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
        //TODO handle spaces in lritems
        if (isSetsEqual(new Set(closure), new Set(lrItems)))
            correct.push(cell);
        else {
            incorrect.push(cell);
            console.log("Incorrect Closure on Cell")
            console.log(cell)
        }
    }

    return {incorrect, correct}
}
