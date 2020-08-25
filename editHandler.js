/**
 * Handles how the lritems in the states are edited
 *
 * if one lritem is edited, a new on is added to edit, so all lritems of on state can be added with ease
 * The edited lritem is checked, if it is a correct lr(0/1)-item and then made pretty with • and ➜
 * if an incorrect lritem is added, the editing is aborted
 */

class editHandler {
    constructor(graph) {
        this.graph = graph;
        graph.setEnterStopsCellEditing(true);
        this.addListeners();
    }

    addListeners() {
        this.graph.addListener(mxEvent.EDITING_STARTED, (sender, evt) => {
            //save which cell is edited, for lookup in edit stopped, as EDITING_STOPPED event has not the cell in it ?!
            this.cur_edit_cell = evt.getProperty('cell');
        });
        this.graph.addListener(mxEvent.EDITING_STOPPED, (sender, evt) => {
            let cell = this.cur_edit_cell;
            this.cur_edit_cell = null;
            if (cell && cell.getStyle() === STYLE_LR_ITEM) {
                //listen only for stopped on LR items
                this.listenEditStopLRItem(this.graph, cell, evt);
                evt.consume();
            }
        });
    }

    listenEditStopLRItem(graph, cell, evt) {
        console.log(evt);
        // lr items escaping and creation
        const value = cell.getValue();
        const newValue = this.checkLRItem(value);
        if (newValue === "error") {
            this.graph.getModel().setValue(cell, "Error");
            return;
        }
        if (newValue === "") {
            //remove empty lr item
            this.graph.getModel().beginUpdate();
            try {
                this.graph.removeCells([cell]);
            } finally {
                this.graph.getModel().endUpdate();
            }
        } else {
            this.graph.getModel().setValue(cell, newValue);
            if (!evt.getProperty('cancel')) {
                //start editing the next lr item in the cell
                const state = cell.getParent();
                const index = state.children.indexOf(cell);
                this.editState(this.graph, state, index + 1);
            } // canceling stops adding of new LRitems
        }
    }

    editState(graph, state, child_index = -1) {
        // edits lr Item on index of state and start editing
        // if index does not exist, new lritem is added
        let item;
        graph.getModel().beginUpdate();
        try {
            item = state.getChildAt(child_index);
            if (!item) {
                item = graph.insertVertex(state, null, "edit here", 0, state.getChildCount() * 20 + 20, 40, 20, STYLE_LR_ITEM);
            }
        } finally {
            graph.getModel().endUpdate();
        }
        graph.startEditingAtCell(item);
    }

    checkLRItem(text) {
        if (text.trim() === "") {
            return "";
        }
        //pretty characters for LR Items
        text = text.replace(".", DOT).replace("->", ARROW);
        //check if correct lritem
        if (!this.graph.grammar.isLRItem(text)) {
            return "error";
        }
        return text;
    }
}
