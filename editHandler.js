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
            if (cell && cell.getType() === STYLE_LR_ITEM) {
                //listen only for stopped on LR items
                this.listenEditStopLRItem(cell, evt);
                mxEvent.consume(evt);
            }
        });

        //Double click to start editing the State on click position
        this.graph.addListener(mxEvent.DOUBLE_CLICK, (_, evt) => {
            const cell = evt.getProperty('cell');
            if (!cell || cell.getType() !== STYLE_STATE) return;
            graph.getSelectionModel().clear();
            this.editState(cell);
            mxEvent.consume(evt);
        });
    }

    //The user stopped editing the lritem cell
    listenEditStopLRItem(cell, evt) {
        const state = cell.getParent();

        //set new escaped value
        const value = cell.getValue();
        const newValue = this.checkLRItem(value);
        this.graph.getModel().beginUpdate();
        try {
            this.graph.getModel().setValue(cell, newValue);
            if (newValue === "") {
                this.graph.removeCells([cell]);
            }
        } finally {
            this.graph.getModel().endUpdate();
        }

        // if stopped editing in the last cell, create a new LRItem at the end
        // otherwise the editing is stopped
        const index = state.children.indexOf(cell);
        if (index !== -1 && index + 1 === state.getChildCount()) {
            this.editState(state);
        } else {
            this.resizeState(state);
            graph.setSelectionCell(state);
        }
    }

    resizeState(state) {
        //remove empty lines in State
        //resize state height and width
        this.graph.getModel().beginUpdate();
        try {
            let maxItemWidth = STATE_MIN_WIDTH;
            //move Items to empty spaces
            for (const i in state.children) {
                const item = state.getChildAt(i);
                this.graph.moveCells([item], 0, STATE_MARGIN + i * LRITEM_HEIGHT - item.getGeometry().y)
                const width = item.getGeometry().width
                if (width > maxItemWidth) maxItemWidth = width;
            }

            //resize state
            const targetWidth = maxItemWidth + 2 * STATE_MARGIN;
            const targetHeight = state.getChildCount() * LRITEM_HEIGHT + 2 * STATE_MARGIN;
            const oldGeo = state.getGeometry()
            const newGeo = oldGeo.clone();
            if (oldGeo.width !== targetWidth) {
                newGeo.width = targetWidth;
            }
            if (oldGeo.height !== targetHeight) {
                newGeo.height = targetHeight;
            }
            this.graph.getModel().setGeometry(state, newGeo);

            if (this.graph.startState === state) {
                redrawStartIndicator(this.graph);
            }
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    editState(state, child_index = -1) {
        // edits lr Item on index of state and start editing
        // if index does not exist, new lritem is added
        let item;
        this.graph.getModel().beginUpdate();
        try {
            item = state.getChildAt(child_index);
            if (!item) {
                item = this.graph.insertVertex(state, null, "", STATE_MARGIN,
                    state.getChildCount() * LRITEM_HEIGHT + STATE_MARGIN, 40, LRITEM_HEIGHT, STYLE_LR_ITEM);
                //redraw start indicator if start state
                if (this.graph.startState === state) redrawStartIndicator(this.graph);
            }
        } finally {
            this.graph.getModel().endUpdate();
        }
        this.graph.startEditingAtCell(item);
    }

    checkLRItem(text) {
        if (text.trim() === "") {
            return "";
        }
        //pretty characters for LR Items
        text = text.replace(".", DOT).replace("->", ARROW);
        //check if correct lritem
        if (!this.graph.grammar.parseLRItem(text)) {
            // return "error";
        }
        return text;
    }
}
