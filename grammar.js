/**
 * Stores the current grammar and gives functions to parse it
 */

const DOT = '•';
const ARROW = '➜';
const EPSILON = 'Ɛ'
const DELIMITER = '|';
const NOT_ALLOWED_TERMINALS = [DOT, ARROW, EPSILON, '{', '}'];

class Grammar {
    /**
     * parses Grammar to use for the Graph
     * The Grammar does not allow '{', '}', '•', '➜' as terminal nor nonterminal
     * Ɛ or '' is used to use the empty word
     * @param grammar: Description of the Transitions
     * @param lr: 0 or 1 for lr0 or lr1 canonical automaton, higher not implemented
     */
    constructor(grammar, lr) {

        this.lr = lr;
        this.terminals = [];
        this.nonTerminals = [];
        this.productions = [];
        this.plainProductions = [];

        // parse helper
        this._someTerminal = [];
        this._errors = [];

        const split = grammar.split('\n');
        for (const row of split) {
            this.addInputRow(row)
        }

        this.plain = this.plainProductions.join('\n');
        this.plainProductionsShort = this.plainProductions.map(v => v.replaceAll(' ', ''))
        this.terminals = this._someTerminal.filter(v => !this.nonTerminals.includes(v));
        this.startProduction = this.productions[0];
        if (!this.startProduction) {
            this._errors.push("Not enough productions to find a start production");
        }
    }


    //------------parsing-------------
    addInputRow(row) {
        //Format N -> S S S S | S S ; where N is a NonTerminal and S are Some Terminals, these are delimited by a space
        // multiple productions with the same Left Non Terminal can be delimited by |
        // if right side is "" epsilon is added
        if (row.trim() === "")
            return
        row = row.replaceAll('->', ARROW);

        const prodSplit = row.split(ARROW);
        if (prodSplit.length !== 2) {
            this._errors.push(row + ": contains to many or to less Arrows. Use -> for an arrow");
            return
        }
        const left = prodSplit[0].trim();
        if (!this.nonTerminals.includes(left))
            this.nonTerminals.push(left);

        const prods = prodSplit[1].split(DELIMITER);
        for (const prod of prods) {
            const right = [];
            const rightSplit = prod.split(" ");

            for (let someTerminal of rightSplit) {
                if (someTerminal === "")
                    continue;

                someTerminal = someTerminal.trim();
                right.push(someTerminal);
                //right can be Terminals and NonTerminals
                if (!this._someTerminal.includes(someTerminal))
                    if (!NOT_ALLOWED_TERMINALS.includes(someTerminal)) {
                        this._someTerminal.push(someTerminal);
                    } else {
                        this._errors.push("Terminal '" + someTerminal + "' is not allowed");
                    }
            }
            this.addProduction(left, right);
        }
    }

    addProduction(left, right) {
        let rightString;
        if (right.length === 0)
            right = [EPSILON];
        rightString = right.join(" ");
        const prod = left + ARROW + rightString;
        this.productions.push({left, right});
        this.plainProductions.push(prod);
    }

    error() {
        return this._errors.length !== 0;
    }

    isLRItem(itemText) {
        let text = itemText.trim().replaceAll(' ', '');

        if (this.lr === 1) {
            const split = text.split('{');
            if (split.length !== 2) { //one
                return false;
            }
            text = split[0];
            const lr1lookahead = '{' + split[1];
            //TODO check lookahead set
        }
        const shortText = text.replace(DOT, '');
        if (shortText.length + 1 !== text.length) { //only one DOT should be replaced
            return false;
        }
        return this.plainProductionsShort.includes(shortText);
    }

    computeEpsilonClosure(lrItems) {
        /**
         * Computes the Epsilon Closure of given LR Items
         * LRItems: [A->a.b, B->.A]
         * @return list of LRItem texts which are in the closure of the given LR ITems
         */

        //TODO expand LR1 Items a->.b {1,2} => a->.b {1}, a->.b {2}
        let workQueue = [];
        const closure = [];
        for (const item of lrItems) {
            workQueue.push(item);
        }

        while (workQueue.length !== 0) {
            const current = workQueue.pop()
            if (closure.includes(current))
                continue;
            closure.push(current);
            workQueue = workQueue.concat(this.getNextEpsilonLRItems(current));
        }
        // TODO reduce LR1 items again
        return closure;
    }

    getNextEpsilonLRItems(itemText) {
        //TODO handle LR1 items correct
        //TODO handle Epsilon transitions A->.e

        const rightOfDot = itemText.split(DOT)[1];
        if (rightOfDot.length === 0)
            return [];

        const NonTerminal = rightOfDot.split(' ')[0];
        const result = []

        for (const prod of this.productions) {
            if (prod.left !== NonTerminal)
                continue;
            result.push(prod.left + ARROW + DOT + prod.right.join(' '))
        }
        return result;
    }
}
