/**
 * Handles the connections creation between to cells
 */

const TERMINALS = ['T', '(', ')']

class connectionHandler {

    margin = 20; //margin for the hover cell

    constructor(graph) {
        this.graph = graph;
        this.cell = null;
        this.hoverCell = null;
        this.isDraggingEdge = false;
        this.dragginTerminal = null;
        this.dragginEdge = null
    }

    mouseDown(sender, evt) {
        let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
        if (cell && cell.getStyle() === STYLE_HOVER_ITEM) {
            this.isDraggingEdge = true;
            this.dragginTerminal = cell.getValue();
            //TODO create Preview
        }
    }

    mouseUp(sender, evt) {
        if (this.isDraggingEdge) {
            let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
            cell = this.getHighestParent(cell);
            let targetCell = null;
            if (cell && cell.getStyle() === STYLE_STATE) {
                targetCell = cell;
            } else {
                targetCell = addState(this.graph, evt.graphX, evt.graphY);
            }
            this.graph.getModel().beginUpdate();
            try {
                // remove edge with same terminal (discrete algorithm)
                for (const i in this.cell.edges) {
                    let edge = this.cell.getEdgeAt(i);
                    console.log(edge);
                    if (edge.getValue() === this.dragginTerminal) {
                        this.graph.removeCells([edge]);
                        break;
                    }
                }
                this.graph.insertEdge(this.graph.getDefaultParent(), null, this.dragginTerminal, this.cell, targetCell);
            } finally {
                this.graph.getModel().endUpdate();
            }
            this.isDraggingEdge = false;
            this.removeHoverCell();
        }
    }

    mouseMove(sender, evt) {
        if (this.isDraggingEdge) {
            //move preview Edge
        } else {
            let cell = this.graph.getCellAt(evt.graphX, evt.graphY, null, true, false);
            cell = this.getHighestParent(cell);
            if (cell === this.hoverCell) {
                return
            }
            if (cell && cell.getStyle() !== STYLE_STATE) {
                cell = null;
            }
            if (cell !== this.cell) {
                this.cell = cell;
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
            for (const terminal in TERMINALS) {
                const term = this.graph.insertVertex(this.hoverCell, null, TERMINALS[terminal], 0, 0, 18, 18, STYLE_HOVER_ITEM)
            }
            layout.execute(this.hoverCell);
        } finally {
            this.graph.getModel().endUpdate();
        }
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
