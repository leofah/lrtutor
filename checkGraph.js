const errorHighlights = [];

function checkGraph() {
    hideErrors();
    const lrCheck = checkCorrectLrItems(graph);
    const closureCheck = checkCorrectClosure(graph);
    const transitionCheck = checkTransitions(graph);
    const finalCheck = checkFinalStates(graph);
    const correctStart = checkStartState(graph);
    const connected = checkConnected(graph);
    const duplicates = checkDuplicateStated(graph);

    //highlight errors:
    for (const cell of lrCheck.incorrect.concat(closureCheck.incorrect).concat(transitionCheck.incorrect)) {
        const errorHighlight = new mxCellHighlight(graph, 'red', 1);
        errorHighlight.highlight(graph.view.getState(cell));
        errorHighlights.push(errorHighlight);
    }
    for (const cell of lrCheck.correct.concat(closureCheck.correct).concat(transitionCheck.correct)) {
        const errorHighlight = new mxCellHighlight(graph, 'green', 1);
        errorHighlight.highlight(graph.view.getState(cell));
        errorHighlights.push(errorHighlight);
    }
    const startHighlight = new mxCellHighlight(graph, correctStart ? 'green' : 'red', 1);
    const cell = graph.startIndicatorSource.edges[0];
    startHighlight.highlight(graph.view.getState(cell));
    errorHighlights.push(startHighlight);

}

/*  */
function hideErrors() {
    for (h of errorHighlights) {
        h.destroy();
    }
}

/**
 * Checks if each LR Item in the graph is correctly formatted
 * @return {{incorrect: [], correct: []}}
 *      incorrect: LRItems which are incorrect formatted
 *      correct: LRItems which are correctly formatted
 */
function checkCorrectLrItems(graph) {
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

/**
 * Checks for each state if the closure of LR Items is correct
 * @return {{incorrect: [], correct: []}}
 *      incorrect: states where the closure is not correct
 *      correct: the closure of the LRItems in the state is the same as all LRItems in the state
 */
function checkCorrectClosure(graph) {
    const incorrect = [];
    const correct = [];
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const lrItems = [];
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;

            if (graph.grammar.parseLRItem(lrItem.value) !== false)
                lrItems.push(graph.grammar.parseLRItem(lrItem.value))
        }

        const closure = graph.grammar.computeEpsilonClosure(lrItems);

        if (isSetsEqual(closure, lrItems))
            correct.push(cell);
        else {
            incorrect.push(cell);
        }
    }

    return {incorrect, correct}
}

/**
 * check if all states of the graph have all needed transitions.
 * If a transition is present, check if the target state has exactly the correct lr-items.
 * The closure of the target must be correct and no additional LRItems should be present in the target
 * @param graph
 * @return {{incorrect: [], correct: [], stateIncorrectTransitions: Map<state.id, {extraTransitions, missingTransitions}>}}
 *      incorrect: Edges which lead to an incorrect state
 *      correct: Edges which lead to a correct state
 *      stateIncorrectTransitions: Map state.id ->
 *          extraTransitions: edges, which are not needed in this state
 *          missingTransitions: list of terminals, which need a transition in this state (e.G. 'e', if S -> .e is an LRItem in this state)
 */
function checkTransitions(graph) {
    const incorrect = [];
    const correct = [];

    const stateIncorrectTransitions = new Map();

    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const missingTransitions = new Set();
        const needsTransitions = new Set();
        //map needed cause multiple LRItems can have the same shift terminal and then multiple closures needs to be built
        const targetItems = new Map(); // maps 'targedID terminal' -> shiftedItems

        //shift each lrItem and check the transitions for the shifted terminal
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;

            const parsedItem = graph.grammar.parseLRItem(lrItem.value);
            if (parsedItem === false) continue;

            const shift = graph.grammar.shiftLrItem(parsedItem);
            if (!shift) continue; //final items don't shift

            const shiftedItem = shift[0];
            const terminal = shift[1];
            needsTransitions.add(terminal);

            //find the transition and check it
            const edge = cell.edges.filter(e => e.value === terminal && e.getTerminal(true) === cell)[0]
            if (!edge) {
                //no transition found -> is missing and check next lrItem
                missingTransitions.add(terminal);
                continue;
            }

            //check if the targetState has the correct closure for this transition
            const targetState = edge.getTerminal(false);
            const key = targetState.id + ' ' + terminal;
            targetItems.set(key, [shiftedItem].concat(targetItems.get(key)))
        }

        //check the closure for the target items
        for (const e of targetItems.entries()) {
            const key = e[0];
            const targetID = key.split(' ')[0];
            const terminal = key.split(' ')[1];
            const shiftedItem = e[1];
            const targetState = graph.getModel().getCell(targetID);
            const edge = cell.edges.filter(e => e.value === terminal && e.getTerminal(true) === cell)[0]

            const closure = graph.grammar.computeEpsilonClosure(shiftedItem)

            const lrItems = [];
            for (const lrItem of targetState.children) {
                if (lrItem.getType() !== STYLE_LR_ITEM) continue;
                if (graph.grammar.parseLRItem(lrItem.value) !== false) lrItems.push((lrItem.value))
            }

            if (isSetsEqual(closure, lrItems.map(item => graph.grammar.parseLRItem(item))))
                correct.push(edge);
            else
                incorrect.push(edge);

        }

        //filter for extra and missing transitions
        const hasTransitions = cell.edges.filter(e => e.getTerminal(true) === cell).map(e => e.value);
        const extraTransitions = hasTransitions.filter(v => !needsTransitions.has(v));
        stateIncorrectTransitions.set(cell.id, {extraTransitions, missingTransitions});
    }

    return {incorrect, correct, stateIncorrectTransitions};
}

/**
 * checks if the start state has the start production
 * @return boolean, whether the start state is correct
 */
function checkStartState(graph) {
    const startState = graph.startState
    const startLRItem = graph.grammar.parseLRItem(graph.grammar.getStartLRItemText());

    for (const lrItem of startState.children) {
        if (lrItem.getType() !== STYLE_LR_ITEM) continue;
        const parsed = graph.grammar.parseLRItem(lrItem.value);
        if (graph.grammar.lr === 1) {
            if (!parsed.lookahead.includes(DOLLAR)) continue;
            parsed.lookahead = [DOLLAR]; // start LR Item only has DOLLAR in its lookahead
        }
        if (deepEqual(parsed, startLRItem)) {
            return true;
        }
    }
    return false;
}

/**
 * check if all states have the correct final status.
 * A state must be final if a LRItem S -> aaa. exists in the state (DOT at the end)
 * @param graph
 * @return {{incorrect: [], correct: []}}
 *      incorrect: states with wrong final status
 *      correct: states with right final status
 */
function checkFinalStates(graph) {
    const incorrect = [];
    const correct = [];
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const final = cell.isFinal();
        let graphFinal = false;
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;
            const parsedItem = graph.grammar.parseLRItem(lrItem.value);
            if (parsedItem !== false && parsedItem.right2.length === 0) {
                graphFinal = true;
                break;
            }
        }
        if (final !== graphFinal) incorrect.push(cell);
        else correct.push(cell)
    }
    return {incorrect, correct}
}

/**
 * checks if all states are connected to the start state with an incoming transition
 * @param graph
 * @return {{incorrect: [], correct: []}}
 *          incorrect: states, which are not connected,
 *          correct: states which are connected to the start state
 */
function checkConnected(graph) {
    const workQueue = [graph.startState];
    const connectedStates = [];

    //DFS on the graph
    while (workQueue.length > 0) {
        const current = workQueue.pop();
        if (!connectedStates.includes(current)) {
            connectedStates.push(current);
            for (const edge of current.edges) {
                workQueue.push(edge.getTerminal(false));
            }
        }
    }

    const incorrect = [];
    const correct = [];
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;
        if (connectedStates.includes(cell)) correct.push(cell);
        else incorrect.push(cell);
    }
    return {incorrect, correct};
}

/**
 * check if there are duplicate states with the same LRItems in the graph. This is not false for the canonical automatan,
 * however it is not the smallest possible graph and a nice feature to see irrelevant states
 * @param graph
 * @return {[]} List of Tuples: [cell1_id, cell2_id] where cell1 and cell2 are duplicate. cell1 only appearing on index 0,
 *  every duplicate cell2 of cell1 gets one entry in the list. If further cell3 ist the same, no entry [cell2_id, cell3_id] will exist,
 *  but the entry [cell1_id, cell3_id]
 */

function checkDuplicateStated(graph) {
    const duplicates = [];
    const presentStates = {}; //stores present states as key. The value is the cell id
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const lrItems = [];
        for (const lrItem of cell.children) {
            if (lrItem.getType() !== STYLE_LR_ITEM) continue;
            const parsedItem = graph.grammar.parseLRItem(lrItem.value);
            if (parsedItem)
                lrItems.push(graph.grammar.itemToText(parsedItem));
        }

        lrItems.sort();
        if (presentStates[lrItems]) {
            duplicates.push([presentStates[lrItems], cell.id]);
        } else {
            presentStates[lrItems] = cell.id;
        }
    }
    return duplicates;
}
