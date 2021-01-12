const errorHighlights = [];

// TODO add help why the graph is not correct
// TODO check for duplicate LR Items

function checkGraph() {
    hideErrors();
    prepareGraph(graph);
    const lrCheck = checkCorrectLrItems(graph);
    const closureCheck = checkCorrectClosure(graph);
    const transitionCheck = checkTransitions(graph);
    const finalCheck = checkFinalStates(graph);
    const correctStart = checkStartState(graph);
    const connected = checkConnected(graph);
    const duplicates = checkDuplicateStated(graph);

    //get Cell Ids
    showIDs();

    //highlight errors:
    for (const cell of lrCheck.incorrect.concat(closureCheck.incorrect).concat(transitionCheck.incorrect)) {
        const errorHighlight = new mxCellHighlight(graph, 'red', 1);
        errorHighlight.highlight(graph.view.getState(cell));
        errorHighlights.push(errorHighlight);
    }
    // for (const cell of lrCheck.correct.concat(closureCheck.correct).concat(transitionCheck.correct)) {
    //     const errorHighlight = new mxCellHighlight(graph, 'green', 1);
    //     errorHighlight.highlight(graph.view.getState(cell));
    //     errorHighlights.push(errorHighlight);
    // }
    // const startHighlight = new mxCellHighlight(graph, correctStart ? 'green' : 'red', 1);
    // const cell = graph.startIndicatorSource.edges[0];
    // startHighlight.highlight(graph.view.getState(cell));
    // errorHighlights.push(startHighlight);

    //print errors in HTML
    let everythingCorrect = true;
    const errorElement = I("graphErrors");

    const CLASSES_ERROR = "alert alert-danger";
    const CLASSES_WARNING = "alert alert-warning";
    const CLASSES_CORRECT = "alert alert-success";


    if (lrCheck.incorrect.length > 0 || closureCheck.incorrect.length > 0 || transitionCheck.incorrect.length > 0) {
        everythingCorrect = false;
        addNode(
            "Please look at the graph to see the errors",
            "<i>Highlighted LR-Item</i>: The Item could be parsed correctly. Look here[TODO] to see " +
            "how write the LR Items<br><br>" +
            "<i>Highlighted State</i>: The closure of the state is not correct. Invalid LR-Items are ignored<br><br>" +
            "<i>Highlighted transition</i>: The transition is not needed or the target state has not the correct LR-Items " +
            "with closure to be a successor of the start state.",
            errorElement, CLASSES_ERROR);
    }
    if (!correctStart) {
        everythingCorrect = false
        addNode(
            "The start state is not correct or missing",
            "The start state needs the LR-Item '" + graph.grammar.getStartLRItemText() + "', maybe you deleted it",
            errorElement, CLASSES_ERROR);
    }

    for (const [cellID, errorTransitions] of transitionCheck.stateIncorrectTransitions) {
        const extraTransitions = errorTransitions.extraTransitions;
        const missingTransitions = errorTransitions.missingTransitions;

        if (extraTransitions.length > 0) {
            everythingCorrect = false;
            let message = "State " + getIdForCell(cellID) + " has to many outgoing transitions with (non)terminals: " +
                extraTransitions.join(', ')
            addNode(message,
                "State " + getIdForCell(cellID) + " has no LR- Item with one of the terminals ["
                + extraTransitions.join(', ') + "] after '" + DOT + "'",
                errorElement, CLASSES_ERROR);
        }
        if (missingTransitions.length > 0) {
            everythingCorrect = false;
            let message = "State " + getIdForCell(cellID) + " misses transitions with following (non)terminals: " +
                missingTransitions.join(', ')
            addNode(message,
                "State " + getIdForCell(cellID) + " has a LR-Item 'A" + ARROW + "B" + DOT + "<b>C</b>D', " +
                "but there is no transition with the (non)terminal 'C'. For every (non)terminal after '" + DOT +
                "', there needs to be a transition.",
                errorElement, CLASSES_ERROR);
        }
    }

    // final states correct
    if (finalCheck.incorrect.length > 0) {
        everythingCorrect = false;
        const message = "Not all states have the correct final status: " +
            finalCheck.incorrect.map(cell => getIdForCell(cell.id)).join(', ');
        addNode(message,
            "A state with a LR-Item A" + ARROW + "B" + DOT + " (dot at the end) must be final, " +
            "all other states must not be final",
            errorElement, CLASSES_ERROR);
    }
    // graph connected
    if (connected.incorrect.length > 0) {
        everythingCorrect = false;
        const message = "Not all states are connected to the start state: " +
            connected.incorrect.map(cell => getIdForCell(cell.id)).join(', ');
        addNode(message,
            "Not connected states are not critical, however they are not needed for a canonical automaton. " +
            "Maybe you forgot to connect them.",
            errorElement, CLASSES_WARNING);
    }
    // duplicates
    if (Object.keys(duplicates).length > 0) {
        everythingCorrect = false;
        let message = "There are duplicate states in the graph: ";
        for (const key in duplicates) {
            message = message + '[' + duplicates[key].map(id => getIdForCell(id)).join(', ') + '] ';
        }
        addNode(message,
            "Duplicate states are not critical, but they make the automaton larger than needed. " +
            "Consider moving all transitions to one of the duplicate states and delete the other states." +
            "Invalid LR Items are ignored when finding the duplicate states. ",
            errorElement, CLASSES_WARNING);
    }

    if (everythingCorrect) addNode("Your Graph is correct",
        "Well done, you solved the complete graph",
        errorElement, CLASSES_CORRECT);

    errorElement.classList.remove("d-none")
    I("graphActions").classList.add("d-none");

    //enable bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
}

function addNode(message, tooltip, errorElement, classes) {
    const div = document.createElement("div");
    div.setAttribute("class", classes);
    if (tooltip) {
        div.setAttribute("data-toggle", "tooltip");
        div.setAttribute("data-placement", "top");
        div.setAttribute("data-html", "true");
        div.setAttribute("title", tooltip);
    }
    div.appendChild(document.createTextNode(message));
    errorElement.appendChild(div);
}

/*  */
function hideErrors() {
    for (h of errorHighlights) {
        h.destroy();
    }

    const errorElement = I("graphErrors");
    while (errorElement.childElementCount > 0) errorElement.removeChild(errorElement.firstChild);
    errorElement.classList.add("d-none");
    hideIDs();
}

/**
 * sets needed variables in the graph items
 * @param graph mxGraph
 */
function prepareGraph(graph) {
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;
        if (cell.children === null) cell.children = [];
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
 *          extraTransitions: list of terminal which have a transition that is not needed in this state
 *          missingTransitions: list of terminals which need a transition in this state (e.G. 'e', if S -> .e is an LRItem in this state)
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
            let edge;
            if (cell.edges) edge = cell.edges.filter(e => e.value === terminal && e.getTerminal(true) === cell)[0]
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
            const shiftedItems = e[1];
            const targetState = graph.getModel().getCell(targetID);
            const edge = cell.edges.filter(e => e.value === terminal && e.getTerminal(true) === cell)[0]

            const closure = graph.grammar.computeEpsilonClosure(shiftedItems)

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
        const edges = cell.edges
        let hasTransitions = []
        if (edges) hasTransitions = cell.edges.filter(e => e.getTerminal(true) === cell).map(e => e.value);
        const extraTransitions = hasTransitions.filter(v => !needsTransitions.has(v));
        stateIncorrectTransitions.set(cell.id, {
            'extraTransitions': extraTransitions,
            'missingTransitions': Array.from(missingTransitions)
        });
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
 * check if there are duplicate states with the same LRItems in the graph. This is not false for the canonical automaton,
 * however it is not the smallest possible graph and a nice feature to see irrelevant states
 * @param graph
 * @return  map of representative states to set all states, which are a duplicate of the representative
 */

function checkDuplicateStated(graph) {
    const duplicates = {};  //result map: representative -> set of duplicate states
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
        const otherCellId = presentStates[lrItems];
        if (otherCellId === undefined) presentStates[lrItems] = cell.id;
        else if (duplicates[otherCellId] === undefined) duplicates[otherCellId] = [presentStates[lrItems], cell.id];
        else duplicates[otherCellId].push(cell.id);

    }
    return duplicates;
}
