const errorHighlights = [];

function checkGraph() {
    hideErrors();
    const lrCheck = checkCorrectLrItems(graph);
    const closureCheck = checkCorrectClosure(graph);
    const transitionCheck = checkTransitions(graph);
    console.log(transitionCheck);

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
    const incorrect = [];
    const correct = [];
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_LR_ITEM) continue;

        const valueCorrect = graph.grammar.parseLRItem(cell.getValue());
        if (valueCorrect === false) incorrect.push(cell);
        else correct.push(cell);
    }
    return {incorrect, correct};
}

function checkCorrectClosure(graph) {
    /**
     * Checks for each state if the closure of LR Items is correct
     */
    const incorrect = [];
    const correct = [];
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const lrItems = [];
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;

            if (graph.grammar.parseLRItem(lrItem.value) !== false)
                lrItems.push((lrItem.value))
        }

        const closure = graph.grammar.computeEpsilonClosure(lrItems);

        if (isSetsEqual(closure, lrItems.map(item => graph.grammar.parseLRItem(item))))
            correct.push(cell);
        else {
            incorrect.push(cell);
        }
    }

    return {incorrect, correct}
}

function checkTransitions(graph) {
    const incorrectClosure = [];
    const correctClosure = [];

    const stateNeedsItems = new Map();
    const stateIncorrectTransitions = new Map();

    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        //outgoing transitions to check
        const needsTransitions = new Set();
        const transitions = new Map();
        for (const edge of cell.edges) {
            if (edge.getTerminal(true) !== cell) continue;
            transitions.set(edge.value, edge.getTerminal(false).id);
        }

        //shift each lrItem and check the transitions for the shifted terminal
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;

            const parsedItem = graph.grammar.parseLRItem(lrItem.value);
            if (parsedItem === false) continue;

            const shift = graph.grammar.shiftLrItem(parsedItem);
            if (!shift) continue; //final items don't shift

            const item = shift[0];
            const terminal = shift[1];
            const toState = transitions.get(terminal);

            needsTransitions.add(terminal);
            if (toState) stateNeedsItems.set(toState, [item].concat(stateNeedsItems.get(toState)));
            //TODO check closure here
        }

        //filter for extra and missing transitions
        const hasTransitions = [...transitions.keys()];
        const extraTransitions = hasTransitions.filter(v => needsTransitions.has(v));
        for (const label of hasTransitions) {
            needsTransitions.delete(label);
        }
        stateIncorrectTransitions.set(cell.id, {extraTransitions, needsTransitions});
    }

    //check exact closure of target States
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const needsItems = stateNeedsItems.get(cell.id) ? stateNeedsItems.get(cell.id).filter(v => v) : [];
        const closure = graph.grammar.computeEpsilonClosure(needsItems, true)

        const lrItems = [];
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;
            if (graph.grammar.parseLRItem(lrItem.value) !== false) lrItems.push((lrItem.value))
        }

        if (isSetsEqual(closure, lrItems.map(item => graph.grammar.parseLRItem(item)))) correctClosure.push(cell);
        else incorrectClosure.push(cell);

    }

    return {incorrectClosure, correctClosure, stateIncorrectTransitions};
}
