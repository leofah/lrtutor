import {getIdForCell} from "./graph.js";
import {
    ARROW,
    COLOR_EDGE_ERROR,
    COLOR_FONT_ERROR,
    COLOR_STATE_ERROR,
    DOT,
    STYLE_EDGE,
    STYLE_LR_ITEM,
    STYLE_STATE
} from "./constants.js";
import {I, isSetsEqual} from "./utils.js";
import {getGraph} from "./init.js";

const CLASSES_ERROR = "alert alert-danger";
const CLASSES_WARNING = "alert alert-warning";
const CLASSES_CORRECT = "alert alert-success";
const errorElement = document.getElementById("graphErrors");

export function checkGraph() {
    hideErrors();
    const graph = getGraph();
    prepareGraph(graph);

    //check parts of the automaton
    const lrCheck = checkCorrectLrItems(graph);
    const closureCheck = checkCorrectClosure(graph);
    const transitionCheck = checkTransitions(graph);
    const finalCheck = checkFinalStates(graph);
    const correctStart = checkStartState(graph);
    const connected = checkConnected(graph);
    const duplicateStates = checkDuplicateStates(graph);
    const duplicateItems = checkDuplicateLRItems(graph);


    //show the errors
    // &&= does not work due to fast evaluation of boolean operators
    //errors shown on the canvas
    let everythingCorrect = showLRItemsErrors(lrCheck, graph);
    everythingCorrect = showClosureErrors(closureCheck, graph) && everythingCorrect;
    everythingCorrect = showTransitionCanvasErrors(transitionCheck, graph) && everythingCorrect;
    everythingCorrect = showStartErrors(correctStart, graph) && everythingCorrect;
    let errorOnCanvas = !everythingCorrect;
    //errors shown on the side element
    everythingCorrect = showCanvasErrors(errorOnCanvas, graph) && everythingCorrect;
    everythingCorrect = showTransitionErrors(transitionCheck, graph) && everythingCorrect;
    everythingCorrect = showFinalStatesErrors(finalCheck, graph) && everythingCorrect;
    everythingCorrect = showConnectedErrors(connected, graph) && everythingCorrect;
    everythingCorrect = showDuplicateStatesErrors(duplicateStates, graph) && everythingCorrect;
    everythingCorrect = showDuplicateItemsErrors(duplicateItems, graph) && everythingCorrect;
    showCorrect(everythingCorrect, graph);

    //show the DOM elements
    errorElement.classList.remove("d-none")
    I("graphActions").classList.add("d-none");

    //enable bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

}

/**
 * Each show function shows the found errors for the specific result to the user.
 * @return boolean true, if the graph still would be correct, so if there was no error
 */

function showLRItemsErrors(lrCheck, graph) {
    mxUtils.setCellStyles(graph.getModel(), lrCheck.incorrect, mxConstants.STYLE_FONTCOLOR, COLOR_FONT_ERROR);
    return lrCheck.incorrect.length === 0;
}

function showClosureErrors(closureCheck, graph) {
    mxUtils.setCellStyles(graph.getModel(), closureCheck.incorrect, mxConstants.STYLE_FILLCOLOR, COLOR_STATE_ERROR);
    return closureCheck.incorrect.length === 0;
}

/**
 * shows wrong transitions on the canvas
 */
function showTransitionCanvasErrors(transitionCheck, graph) {
    mxUtils.setCellStyles(graph.getModel(), transitionCheck.incorrect, mxConstants.STYLE_STROKECOLOR, COLOR_EDGE_ERROR);
    mxUtils.setCellStyles(graph.getModel(), transitionCheck.incorrect, mxConstants.STYLE_FONTCOLOR, COLOR_FONT_ERROR);
    return transitionCheck.incorrect.length === 0;
}

/**
 * shows a message if an error was marked on the canvas.
 */
function showCanvasErrors(errorOnCanvas, graph) {
    let everythingCorrect = true;
    if (errorOnCanvas) {
        everythingCorrect = false;
        addNode("Please look at the automaton to see the errors",
            "<i>Highlighted LR-Item</i>: The Item could not be parsed correctly.<br><br>" +
            "<i>Highlighted State</i>: The closure of the state is not correct. Invalid LR-Items are ignored<br><br>" +
            "<i>Highlighted transition</i>: The transition is not needed or the target state has not the correct LR-Items " +
            "with closure to be a successor of the start state.", CLASSES_ERROR);
    }
    return everythingCorrect;
}

function showStartErrors(correctStart, graph) {
    if (!correctStart) {
        addNode("The start state does not have the correct closure",
            "The start state needs to be <i>closure(" + graph.grammar.getStartLRItemText() + ")</i>. If the the " +
            "canvas does not indicate an error with the closure, then too many items or lookaheads are written",
            CLASSES_ERROR);
        const startEdge = graph.startIndicatorSource.edges;
        mxUtils.setCellStyles(graph.getModel(), startEdge, mxConstants.STYLE_STROKECOLOR, COLOR_EDGE_ERROR);
    }
    return correctStart;
}

function showTransitionErrors(transitionCheck, graph) {
    let everythingCorrect = true;
    for (const [cellID, errorTransitions] of transitionCheck.stateIncorrectTransitions) {
        const extraTransitions = errorTransitions.extraTransitions;
        const missingTransitions = errorTransitions.missingTransitions;

        if (extraTransitions.length > 0) {
            everythingCorrect = false;
            let message = "State " + getIdForCell(cellID) + " has too many outgoing transitions with (non)terminals: " +
                extraTransitions.join(', ')
            addNode(message, "State " + getIdForCell(cellID) + " has no LR- Item with one of the terminals ["
                + extraTransitions.join(', ') + "] after '" + DOT + "'", CLASSES_ERROR);
        }
        if (missingTransitions.length > 0) {
            everythingCorrect = false;
            let message = "State " + getIdForCell(cellID) + " misses transitions with following (non)terminals: " +
                missingTransitions.join(', ')
            addNode(message, "State " + getIdForCell(cellID) + " has a LR-Item 'A" + ARROW + "B" + DOT + "<b>C</b>D', " +
                "but there is no transition with the (non)terminal 'C'. For every (non)terminal after '" + DOT +
                "', there needs to be a transition.", CLASSES_ERROR);
        }
    }
    return everythingCorrect;
}

function showFinalStatesErrors(finalCheck, graph) {
    let everythingCorrect = true;
    if (finalCheck.incorrect.length > 0) {
        everythingCorrect = false;
        const message = "Not all states have the correct final status: " +
            finalCheck.incorrect.map(cell => getIdForCell(cell.id)).join(', ');
        addNode(message, "A state with a LR-Item A" + ARROW + "B" + DOT + " (dot at the end) must be final, " +
            "all other states must not be final", CLASSES_ERROR);
    }
    return everythingCorrect;
}

function showConnectedErrors(connected, graph) {
    let everythingCorrect = true;
    if (connected.incorrect.length > 0) {
        everythingCorrect = false;
        const message = "Not all states are connected to the start state: " +
            connected.incorrect.map(cell => getIdForCell(cell.id)).join(', ');
        addNode(message, "Not connected states are not critical, however they are not needed for a canonical automaton. " +
            "Maybe you forgot to connect them.", CLASSES_WARNING);
    }
    return everythingCorrect;
}

function showDuplicateStatesErrors(duplicates, graph) {
    let everythingCorrect = true;
    if (duplicates.size > 0) {
        everythingCorrect = false;
        let message = "There are duplicate states in the graph: ";
        for (const key of duplicates.keys()) {
            message = message + '[' + duplicates.get(key).map(id => getIdForCell(id)).join(', ') + '] ';
        }
        addNode(message, "Duplicate states are not critical, but they make the automaton larger than needed. " +
            "Consider moving all transitions to one of the duplicate states and delete the other states." +
            "Invalid LR Items are ignored when finding the duplicate states. ", CLASSES_WARNING);
    }
    return everythingCorrect;
}

function showDuplicateItemsErrors(duplicates, graph) {
    let everythingCorrect = true;
    if (duplicates.size > 0) {
        everythingCorrect = false;
        let message = "There are duplicate LR-Items in some States. ";
        const notes = [];
        for (const key of duplicates.keys()) {
            notes.push('State ' + getIdForCell(key) + ": " + duplicates.get(key) + "");
        }
        message += notes.join(", ");
        addNode(message, "Duplicate LR Items are not critical, but they make a state unnecessary large." +
            "Consider removing the duplicate items.", CLASSES_WARNING);
    }
    return everythingCorrect;
}

function showCorrect(everythingCorrect, graph) {
    if (everythingCorrect)
        addNode("Your automaton is correct", "Well done, you solved the complete automaton", CLASSES_CORRECT);
}

function addNode(message, tooltip, classes) {
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

/**
 * Hides all the elements that indicate errors
 * These elements were added by check graph and so all the show...Errors functions
 */
export function hideErrors() {
    const graph = getGraph();
    //Clear Canvas
    const cells = Object.values(graph.getModel().cells);
    mxUtils.setCellStyles(graph.getModel(), cells.filter(c => c.getType() === STYLE_LR_ITEM), mxConstants.STYLE_FONTCOLOR, null);
    mxUtils.setCellStyles(graph.getModel(), cells.filter(c => c.getType() === STYLE_STATE), mxConstants.STYLE_FILLCOLOR, null);
    mxUtils.setCellStyles(graph.getModel(), cells.filter(c => c.getType() === STYLE_EDGE), mxConstants.STYLE_STROKECOLOR, null);
    mxUtils.setCellStyles(graph.getModel(), cells.filter(c => c.getType() === STYLE_EDGE), mxConstants.STYLE_FONTCOLOR, null);

    //clear DOM element
    while (errorElement.childElementCount > 0) errorElement.removeChild(errorElement.firstChild);
    errorElement.classList.add("d-none");
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

/************************ Check functions ***********************/

/**
 * return every lrItem of the given State as array.
 * invalid lrItems are ignored
 * @param state {mxCell}
 * @param graph {mxGraph}
 * @return {mxCell[]}
 */
function getLRItems(state, graph) {
    const lrItems = [];
    for (const lrItem of state.children) {
        if (lrItem.getType() !== STYLE_LR_ITEM) continue;
        const parsed = graph.grammar.parseLRItem(lrItem.value);
        if (parsed !== false) lrItems.push(parsed)
    }
    return lrItems;
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

        const lrItems = getLRItems(cell, graph);
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

            const lrItems = getLRItems(targetState, graph);
            const closure = graph.grammar.computeEpsilonClosure(shiftedItems)
            if (isSetsEqual(closure, lrItems))
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
 * checks if the start state is closure(startProduction)
 * @return {boolean} true if the start state is correct
 */
function checkStartState(graph) {
    const startState = graph.startState
    const startLRItem = graph.grammar.parseLRItem(graph.grammar.getStartLRItemText());

    const lrItems = getLRItems(startState, graph);
    const closure = graph.grammar.computeEpsilonClosure([startLRItem]);
    return isSetsEqual(closure, lrItems);
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
 * @return {Map<string, string[]>} map of representative states to all states IDs, which are a duplicate of the representative
 *         including the representative
 */
function checkDuplicateStates(graph) {
    const duplicates = new Map();  //result map: representative -> set of duplicate states IDs
    const reprStates = new Map(); //stores representative states as key. The value is the cell id
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const lrItems = getLRItems(cell, graph);
        //clear string representation of all lrItems (sorted and no duplicates)
        const rep = Array.from(new Set(lrItems.map(i => graph.grammar.itemToText(i)))).sort().toString();
        if (!reprStates.has(rep)) {
            //set representative but the state is not yet duplicate
            reprStates.set(rep, cell.id);
            continue;
        }
        const otherCellId = reprStates.get(rep); //found other cell with same lritems
        if (!duplicates.has(otherCellId)) {
            duplicates.set(otherCellId, [reprStates.get(rep), cell.id]);
        } else {
            duplicates.get(reprStates.get(rep)).push(cell.id);
        }

    }
    return duplicates;
}

/**
 * check for states with duplicate LR Items
 * @param graph
 * @return {Map<int, Set<string>>} state id -> LR Items
 */
function checkDuplicateLRItems(graph) {
    const duplicates = new Map(); //result map: state -> duplicate LR Items in this state
    for (const cell of Object.values(graph.getModel().cells)) {
        if (cell.getType() !== STYLE_STATE) continue;

        const lrItems = getLRItems(cell, graph).map(i => graph.grammar.itemToText(i));
        const setItems = new Set(lrItems);
        for (const item of setItems) {
            delete lrItems[lrItems.indexOf(item)];
        }
        const duplicateItems = new Set(lrItems.filter(i => i !== undefined));
        if (duplicateItems.size > 0) {
            duplicates.set(cell.id, Array.from(duplicateItems));
        }
    }
    return duplicates;
}
