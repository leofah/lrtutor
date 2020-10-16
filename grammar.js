/**
 * Stores the current grammar and gives functions to parse it
 */

const DOT = '•';
const ARROW = '➜';
const EPSILON = 'Ɛ' //TODO handle epsilon transitions?
const DELIMITER = '|';
const START_NON_TERMINAL = "S'"
const NOT_ALLOWED_TERMINALS = [DOT, ARROW, EPSILON, START_NON_TERMINAL, '->', '.', '{', '}', ','];

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
        this.lrItemMap = {};

        // parse helper
        this._someTerminal = [];
        this._errors = [];

        const split = grammar.split('\n');
        for (const row of split) {
            this.addInputRow(row)
        }

        //start production is always S' -> ...
        //If not present add
        this.startProduction = this.productions.filter(v => v.left === START_NON_TERMINAL)[0];
        if (!this.startProduction) {
            if (this.productions.length === 0)
                this._errors.push("Not enough production to make a reasonable exercise");
            else
                this.startProduction = this.addProduction(START_NON_TERMINAL, [this.productions[0].left]);
        }

        //set object variables
        this.plain = this.plainProductions.join('\n');
        this.plainProductionsShort = this.plainProductions.map(v => v.replaceAll(' ', ''))
        this.terminals = this._someTerminal.filter(v => !this.nonTerminals.includes(v));
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
        if (right.length === 0)
            right = [EPSILON];

        const prod = left + ARROW + right.join(" ");
        this.plainProductions.push(prod);

        const prodObject = {left, right};
        this.productions.push(prodObject);
        return prodObject;
    }

    error() {
        return this._errors.length !== 0;
    }

    parseLRItem(itemText) {
        /**parses the content of an lr item in the graph and returns the relevant parts.
         * The Lookahead set is only returned if this is an LR1 Grammar
         * The LR Item looks like this, with arbitrary many spaces: left -> right1 . right2 { lookahead }
         * If no production can be matched to the item text {} is returned
         * right1, right2 and lookahead are arrays
         @return {left, right1, right2, lookahead} if everything is alright, else 'false'
         */

        if (this.lrItemMap[itemText]) {
            return this.lrItemMap[itemText];
        }
        const result = this.parseLRItemHelp(itemText);
        this.lrItemMap[itemText] = result;
        return result;
    }

    parseLRItemHelp(itemText) {
        let text = itemText.trim().replaceAll(' ', '');

        //check for lookahead set in lr 1 grammars
        let lookahead
        if (this.lr === 1) {
            const split = text.split('{');
            if (split.length !== 2) return false; //exactly one { needed

            text = split[0]; //text without lookahead set
            if (!split[1].endsWith('}')) return false;

            const setString = split[1].replace('}', '');
            const set = setString.split(',');
            for (const terminal of set) {
                if (terminal === EPSILON) continue; //Epsilon Lookahead allowed
                if (!this.terminals.includes(terminal)) return false;
            }
            lookahead = set;
        }

        //retrieve Variables
        const split = text.split(ARROW);
        if (split.length !== 2) return false; //only one ARROW
        const left = split[0].trim();

        const rightSplit = split[1].split(DOT);
        if (rightSplit.length !== 2) return false; //only one DOT
        const right1String = rightSplit[0].trim();
        const right2String = rightSplit[1].trim();

        //TODO parse...
        //check if production exists
        const possibleProductions = this.productions.filter(p => p.left === left);
        let correctProduction;
        for (const prod of possibleProductions) {
            //does not handle similar productions like A -> a b; A -> ab, with a, b, ab as Terminals
            //but this is a bad grammar design and ignored in this case
            const prodRight = prod.right.join('');
            const checkRight = (right1String + right2String).replace(' ', '');
            if (prodRight === checkRight) {
                correctProduction = prod;
                break;
            }
        }
        if (!correctProduction) return false;

        // check if dot is correct location (not in between a terminal like A -> i.nt with 'int' as terminal)
        let right1, right2;
        if (right1String === '') {
            right1 = [];
            right2 = correctProduction.right;
        } else {
            let rightTMP = '';
            for (const i in correctProduction.right) {
                const terminal = correctProduction.right[i];
                rightTMP += terminal;
                if (right1String === rightTMP) {
                    right1 = correctProduction.right.slice(0, i + 1);
                    right2 = correctProduction.right.slice(i + 1, correctProduction.right.length);
                    break;
                }
            }
        }
        if (!right1 && !right2) {
            return false;
        }

        //return result
        if (this.lr === 1)
            return {left, right1, right2, lookahead};
        return {left, right1, right2};
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
