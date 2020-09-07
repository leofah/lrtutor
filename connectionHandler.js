/**
 * Handles the connections creation between to cells
 */

class connectionHandler {

    margin = 20; //margin for the hover cell

    constructor(graph) {
        this.graph = graph;
        this.cell = null; // cell mouse is over
        this.hoverCell = null; // cell with the terminals to select, if mouse over a state
        this.highlight = new mxCellHighlight(graph, '#00ff00', 2)
        this.isDraggingEdge = false;
        this.draggingTerminal = null; //terminal off the edge to be added
        this.draggingEdge = null;

        //preview
        this.previewEdge = null;
        this.startPoint = null;
        this.previewCell = null;
    }

    mouseDown(sender, evt) {
        let cell = this.graph.getCellAt(evt.getGraphX(), evt.getGraphY(), null, true, false);
        if (cell && cell.getType() === STYLE_HOVER_ITEM) {
            this.isDraggingEdge = true;
            this.draggingTerminal = cell.getValue();

            //create preview
            this.previewEdge = this.createPreviewEdge();

            const geo = this.cell.getGeometry();
            const x = geo.x + 0.5 * geo.width;
            const y = geo.y + 0.5 * geo.height;
            this.startPoint = new mxPoint(x, y);
            this.previewEdge.points = [this.startPoint];

            this.previewCell = this.createPreviewState();
        }
    }

    mouseUp(sender, evt) {
        if (this.isDraggingEdge) {
            //remove preview Edge
            this.removePreview();

            //add new transition
            let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
            cell = this.getHighestParent(cell);
            let targetCell;
            if (cell && cell.getType() === STYLE_STATE) {
                targetCell = cell;
            } else {
                targetCell = addState(this.graph, evt.graphX - 40, evt.graphY - 15);
            }
            this.graph.getModel().beginUpdate();
            try {
                // remove edge with same terminal (discrete algorithm)
                for (const i in this.cell.edges) {
                    let edge = this.cell.getEdgeAt(i);
                    if (edge.getValue() === this.draggingTerminal && edge.getTerminal(true) === this.cell) {
                        this.graph.removeCells([edge]);
                        break;
                    }
                }
                this.graph.insertEdge(
                    this.graph.getDefaultParent(), null, this.draggingTerminal, this.cell, targetCell, STYLE_EDGE);
            } finally {
                this.graph.getModel().endUpdate();
            }
            this.isDraggingEdge = false;
            this.removeHoverCell();
        }
    }

    mouseMove(sender, evt) {
        let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
        let parentCell = this.getHighestParent(cell);
        if (this.isDraggingEdge) {
            //highlight target cell
            let currentPoint;
            if (parentCell && parentCell.getType() === STYLE_STATE) {
                this.highlight.highlight(this.graph.view.getState(parentCell));

                //snap preview edge to mid of cell
                const geo = parentCell.getGeometry();
                const x = geo.x + 0.5 * geo.width;
                const y = geo.y + 0.5 * geo.height;
                currentPoint = new mxPoint(x, y);

                //hide preview state when hovering on a cell
                this.previewCell.bounds = null;
            } else {
                this.highlight.hide();
                currentPoint = new mxPoint(evt.getGraphX(), evt.getGraphY());
                //show preview state on mouse position
                const width = 80;
                const height = 30;
                const x = currentPoint.x - width / 2
                const y = currentPoint.y - height / 2;
                this.previewCell.bounds = new mxRectangle(x, y, width, height);
            }
            //move preview Edge
            this.previewEdge.points = [this.startPoint, currentPoint];
            this.previewEdge.redraw();
            this.previewCell.redraw();
        } else {
            //hightlight hoverItem
            if (cell && cell.getType() === STYLE_HOVER_ITEM) {
                this.highlight.highlight(this.graph.view.getState(cell));
            } else {
                this.highlight.hide();
            }

            if (parentCell === this.hoverCell) {
                // don't switch back if on hoverCell
                return;
            }
            if (parentCell && parentCell.getType() !== STYLE_STATE) {
                parentCell = null;
            }
            if (parentCell !== this.cell) {
                this.cell = parentCell;
                if (this.cell) {
                    this.onMoveInState();
                } else {
                    this.removeHoverCell();
                }
            }
        }
    }

    onMoveInState() {
        //add cell to select the possible edges
        this.graph.getModel().beginUpdate();
        try {
            this.removeHoverCell();
            const geo = this.cell.getGeometry();
            this.hoverCell = this.graph.insertVertex(this.graph.getDefaultParent(), null, "",
                geo.x - this.margin,
                geo.y - this.margin,
                geo.width + 2 * this.margin,
                geo.height + 2 * this.margin,
                STYLE_HOVER);
            this.graph.orderCells(false, [this.cell]);
            //add terminals to hover cell
            //TODO handle number of Terminals
            const layout = new mxStackLayout(this.graph, true, 5, 10, 1);
            layout.isVertexMovable = function () {
                return true;
            }
            const terminals = this.graph.grammar.terminals;
            for (const terminal in terminals) {
                const term = this.graph.insertVertex(this.hoverCell, null, terminals[terminal], 0, 0, 18, 18, STYLE_HOVER_ITEM)
            }
            layout.execute(this.hoverCell);
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    /**
     * Removes all preview Shapes
     */
    removePreview() {
        if (this.previewEdge) {
            this.previewEdge.destroy();
            this.previewEdge = null;
        }
        if (this.previewCell) {
            this.previewCell.destroy();
            this.previewCell = null;
        }
        this.startPoint = null;
    }

    /**
     * creates the shape for the preview edge
     * @returns {mxPolyline} Preview edge
     */
    createPreviewEdge() {
        const edge = new mxPolyline([], '#0000ff');
        edge.dialect = this.graph.dialect;
        edge.isDashed = true;
        edge.init(this.graph.getView().getOverlayPane());
        return edge;
    }

    /**
     * creates the shape for the preview cell
     * @returns {mxRectangleShape} Preview State
     */
    createPreviewState() {
        const state = new mxRectangleShape(null, null, '#0000ff')
        state.dialect = this.graph.dialect;
        state.isDashed = true;
        state.init(this.graph.getView().getOverlayPane());
        return state;
    }

    removeHoverCell() {
        this.graph.getModel().beginUpdate();
        try {
            this.graph.removeCells([this.hoverCell]);
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

// -------- Utils -------
    getHighestParent(cell) {
        if (cell == null) {
            return cell;
        }
        if (cell.getParent() === this.graph.getDefaultParent()) {
            return cell
        } else {
            return this.getHighestParent(cell.getParent());
        }
    }
}
