import {setGrammar} from "./init.js";
import {checkGraph, hideErrors} from "./checkGraph.js";
import {deleteStates, resetCanvas, toggleFinalStates} from "./graph.js";
import {loadGraph, saveGraph} from "./io.js";

window.setGrammar = setGrammar;
window.checkGraph = checkGraph;
window.hideErrors = hideErrors;
window.resetCanvas = resetCanvas;
window.deleteStates = deleteStates;
window.toggleFinalStates = toggleFinalStates;
window.loadGraph = loadGraph;
window.saveGraph = saveGraph;
