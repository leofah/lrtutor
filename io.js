/**
 * creates an XML representation of the graph, with mxCodec ans mxUtils.getXml
 * a version attribute is added for compatibility reasons
 */
function serializeGraph(graph) {

    //remove temporary shapes added to the graph, they should not be saved
    graph.ownConnectionHandler.hide();

    //use mxCodec to create an XML representations of the graph
    const enc = new mxCodec();
    const graphXml = enc.encode(graph.getModel());

    const rootXml = document.implementation.createDocument(null, "LRTutor", null);
    const rootElem = rootXml.getElementsByTagName('LRTutor')[0];
    rootElem.setAttribute('version', GRAPH_VERSION);

    const graphNode = rootXml.createElement('Graph');
    graphNode.appendChild(graphXml);
    rootElem.appendChild(graphNode);

    //save grammar
    const grammarNode = rootXml.createElement('Grammar');
    grammarNode.setAttribute('lr', graph.grammar.lr);
    grammarNode.setAttribute('plain', graph.grammar);
    rootElem.appendChild(grammarNode);

    //save start state
    graphNode.setAttribute('startState', graph.startState.id)
    graphNode.setAttribute('startSource', graph.startIndicatorSource.id)
    return mxUtils.getPrettyXml(rootXml);
}

function deSerializeGraph(serial) {
    /**
     * deserializes a text/xml representation of the graph and loads it.
     * Version number is checked
     */
    try {
        const doc = mxUtils.parseXml(serial);
        const graphNode = doc.getElementsByTagName('Graph')[0];
        const vers = doc.documentElement.getAttribute('version');
        if (vers !== GRAPH_VERSION) {
            return "Invalid File Version: '" + vers + "', need version: '" + GRAPH_VERSION + "'";
        }

        //add grammar
        const grammarNode = doc.getElementsByTagName('Grammar')[0];
        const grammar = new Grammar(grammarNode.getAttribute('plain'), parseInt(grammarNode.getAttribute('lr')));
        changeGrammarDOM(grammar);
        if (grammar.error())
            return;
        if (!graphActive)
            initGraph(grammar);
        else
            graph.grammar = grammar;

        const graphDocument = mxUtils.parseXml(graphNode.innerHTML);
        const codec = new mxCodec(graphDocument);
        codec.decode(graphNode.firstElementChild, graph.getModel());

        //set start state
        const startID = graphNode.getAttribute('startState');
        graph.startState = graph.getModel().cells[startID];
        const startSourceID = graphNode.getAttribute('startSource');
        graph.startIndicatorSource = graph.getModel().cells[startSourceID];

        //reset the connection Handler
        graph.ownConnectionHandler.abort();
        graph.ownConnectionHandler.addTerminalButtons();

    } catch (e) {
        return "Invalid File Format: " + e;
    }
}

function saveGraph() {
    if (graphActive)
        saveFile('graph.xml', serializeGraph(graph), 'text/xml');
}

function loadGraph() {
    loadFile(serial => {
        // remove grammar input
        const error = deSerializeGraph(serial);
        if (error)
            console.log(error);
    });
}

function saveFile(filename, data, type) {
    /**
     * Asks the user to save the data as a file to the given filename
     */
    const blob = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
        // handle IE
        window.navigator.msSaveBlob(blob, filename);
    } else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
        window.URL.revokeObjectURL(elem.href);
    }
}

function loadFile(func) {
    /**
     * asks user to input a file. The content of the file is passed to the argument func(content)
     */
    const elem = window.document.createElement('input');
    elem.type = 'file';
    elem.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            func(content);
        };
        reader.readAsText(file);
    });
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}