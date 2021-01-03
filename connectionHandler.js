/**
 * Handles the creation af transitions between two states.
 * First the user selects the start state.
 * Second the terminal to use is selected. This terminal can change
 * Finally the target state is chosen and the transition added
 *      If the start state and terminal are selected a click somewhere on the canvas creates the transition
 *      A click on a state uses this state as target, otherwise a new state at this position is created and used
 *      as target Sate
 */

class connectionHandler {

    constructor(graph) {
        this.graph = graph;
        this.startState = null; //start of the transition
        this.terminal = null; //(non) terminal for the transition

        // preview of transition
        this.highlight = new mxCellHighlight(this.graph, '#00ff00', 2) //highlight target cell
        this.previewEdge = null;
        this.previewTerminal = null;
        this.startPoint = null;
        this.previewCell = null;

        this.domElement = I('transitionTerminals')

        this.addListeners();
        this.addTerminalButtons();
    }

    /**
     * Add all the listeners needed for this handler
     * automatically called in the constructor
     */
    addListeners() {
        //When one cell is selected, the user can choose a terminal to create a new transition
        this.graph.getSelectionModel().addListener(mxEvent.CHANGE, (_, evt) => {
            const selectedCells = this.graph.getSelectionCells();
            if (selectedCells.length === 1) {
                let cell = selectedCells[0];
                while (cell != null && cell.getType() !== STYLE_STATE) cell = cell.getParent();
                if (cell != null) this.setStartState(cell);
            } else if (!this.terminal) {
                this.abort();
            }
        });
        //handle the creation of the new transition
        this.graph.addListener(mxEvent.CLICK, (_, evt) => {
            // if (evt.isConsumed()) return;
            if (this.startState != null && this.terminal != null) {
                // add new transition and eventually new state
                // let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
                let cell = evt.getProperty('cell');
                while (cell != null && cell.getType() !== STYLE_STATE) cell = cell.getParent();
                let targetCell;
                if (cell && cell.getType() === STYLE_STATE) {
                    targetCell = cell;
                } else {
                    const event = evt.getProperty('event');
                    const X = event.layerX - STATE_MIN_WIDTH / 2;
                    const Y = event.layerY - STATE_MIN_HEIGHT / 2;
                    targetCell = addState(this.graph, X, Y);
                }

                this.setEndState(targetCell);
                evt.consume();
            } else if (this.startState != null && evt.getProperty('cell') == null) {
                this.abort();
            }
        });

        this.graph.addMouseListener({
            'mouseDown': function () {
            },
            'mouseUp': function () {
            },
            'mouseMove': (sender, evt) => {
                if (!this.terminal) return;
                this.updatePreview(evt.getGraphX(), evt.getGraphY());
            },
        });
    }

    /**
     * Creates the shapes for the preview edge
     */
    createPreview() {
        //start Point of the edge
        const geo = this.startState.getGeometry();
        const x = geo.x + 0.5 * geo.width;
        const y = geo.y + 0.5 * geo.height;
        this.startPoint = new mxPoint(x, y);
        //edge
        const edge = new mxPolyline([], '#0000ff');
        edge.dialect = this.graph.dialect;
        edge.isDashed = true;
        edge.init(this.graph.getView().getBackgroundPane());
        this.previewEdge = edge;
        //value
        const terminal = new mxText(this.terminal, null, null, null, '#0000ff');
        terminal.dialect = this.graph.dialect;
        terminal.init(this.graph.getView().getBackgroundPane());
        this.previewTerminal = terminal;
        //state
        const state = new mxRectangleShape(null, null, '#0000ff')
        state.dialect = this.graph.dialect;
        state.isDashed = true;
        state.init(this.graph.getView().getBackgroundPane());
        this.previewCell = state;
    }

    /**
     * Removes all preview Shapes
     */
    removePreview() {
        this.startPoint = null;

        if (this.previewEdge) this.previewEdge.destroy();
        this.previewEdge = null;

        if (this.previewTerminal) this.previewTerminal.destroy();
        this.previewTerminal = null;

        if (this.previewCell) this.previewCell.destroy();
        this.previewCell = null;

        this.highlight.hide();
    }

    /**
     * Updates the preview cell, state and terminal to its correct position
     * @param mousePosX
     * @param mousePosY
     */
    updatePreview(mousePosX, mousePosY) {
        if (!this.previewEdge) return;
        let cell = this.graph.getCellAt(mousePosX, mousePosY, null, true, false);
        while (cell != null && cell.getType() !== STYLE_STATE) cell = cell.getParent();
        //highlight target cell
        let currentPoint;
        if (cell) { //hovering over a cell. The state is not shown and the edge snaps to the middle of the cell
            this.highlight.highlight(this.graph.view.getState(cell));

            //snap preview edge to mid of cell
            const geo = cell.getGeometry();
            const x = geo.x + 0.5 * geo.width;
            const y = geo.y + 0.5 * geo.height;
            currentPoint = new mxPoint(x, y);

            //hide preview state when hovering on a cell
            this.previewCell.bounds = null;
        } else {
            this.highlight.hide();
            currentPoint = new mxPoint(mousePosX, mousePosY);
            //show preview state on mouse position
            const width = STATE_MIN_WIDTH;
            const height = STATE_MIN_HEIGHT;
            const x = currentPoint.x - width / 2
            const y = currentPoint.y - height / 2;
            this.previewCell.bounds = new mxRectangle(x, y, width, height);
        }
        //move preview terminal
        const vec = {'x': currentPoint.x - this.startPoint.x, 'y': currentPoint.y - this.startPoint.y};
        const l = Math.sqrt(vec.x ** 2 + vec.y ** 2)
        const offset = {'x': vec.y * 10 / l, 'y': -vec.x * 10 / l}; //position the label orthogonal with distance 10
        this.previewTerminal.bounds = new mxRectangle(
            this.startPoint.x + vec.x / 2 + offset.x,
            this.startPoint.y + vec.y / 2 + offset.y, null, null);
        //move preview edge
        this.previewEdge.points = [this.startPoint, currentPoint];

        this.previewEdge.redraw();
        this.previewTerminal.redraw();
        this.previewCell.redraw();
    }

    /**
     * Updates the DOM:
     * the buttons to select the terminal are added.
     * Called once to include the buttons. If the grammar changes, this function needs to be called again.
     * These buttons will be shown if a start state is selected.
     */
    addTerminalButtons() {
        // while (this.domElement.childElementCount > 0) this.domElement.removeChild(this.domElement.firstChild);
        const toRemove = []
        for (const child of this.domElement.children) {
            if (child.tagName.toLowerCase() === 'button') {
                toRemove.push(child)
            }
        }
        for (const child of toRemove) this.domElement.removeChild(child);
        for (const terminal of this.graph.grammar.terminals.concat(this.graph.grammar.nonTerminals)) {
            const btn = document.createElement('button');
            btn.setAttribute('class', 'btn btn-outline-info m-1 align-self-end');
            btn.setAttribute('onClick', 'graph.ownConnectionHandler.useTerminal(\'' + terminal + '\')');
            btn.appendChild(document.createTextNode('' + terminal));
            this.domElement.appendChild(btn);
        }
    }

    /**
     * Show preview edge and buttons in the DOM.
     */
    show() {
        this.createPreview();
        this.domElement.classList.remove('d-none');
    }

    /**
     * Remove preview edge and buttons in the DOM.
     */
    hide() {
        this.removePreview();
        this.domElement.classList.add('d-none');
    }

    /**
     * Set the state as a start state. The state can only be changed if the terminal is not set yet.
     * @param state: start state
     */
    setStartState(state) {
        if (this.terminal) return;
        this.startState = state;
        this.show()
    }

    /**
     * Use (non-)terminal x for the transition. The terminal can change as often as wanted.
     * The terminal can only be set, if there was already a start state selected.
     * @param x: (non-)terminal
     */
    useTerminal(x) {
        if (this.startState) {
            this.terminal = x;
            this.previewTerminal.value = x;
        }
    }

    /**
     * Use the state as target state for the transition.
     * This add the transition to the graph and resets the handler
     * Removes old transitions with the same terminal for the start state, as the graph is deterministic
     * @param state: target state
     */
    setEndState(state) {
        if (this.startState === null || this.terminal === null) return;
        addEdge(this.graph, this.startState, state, this.terminal);
        this.abort();
    }

    /**
     * Reset the handler. Hides the preview and resets all internal variables
     * Using 'setStartState(s)' can then start a new transition again
     */
    abort() {
        this.hide();
        this.startState = null;
        this.terminal = null;
    }

}
