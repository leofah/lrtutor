/**
 * Stores the current grammar and gives functions to parse it
 */

const DOT = '•';
const ARROW = '➜';
const EPSILON = 'Ɛ';
const DELIMITER = '|';
const DOLLAR = '$';
const START_NON_TERMINAL = "S'";
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
        this.lrItemMap = new Map();

        // parse helper
        this._someTerminal = [];
        this._errors = [];

        //first1sets
        this.canBeEmpty = {};
        this.first1Set = {};

        const split = grammar.split('\n');
        for (const row of split) {
            this.addInputRow(row)
        }

        //start production is always S' -> ...
        //If not present add
        this.startProduction = this.productions.filter(v => v.left === START_NON_TERMINAL)[0];
        if (!this.startProduction) {
            if (this.productions.length === 0)
                this._errors.push("Not enough production to set a start production");
            else {
                this.startProduction = {'left': START_NON_TERMINAL, 'right': [this.productions[0].left]};
                this.productions.push(this.startProduction);
            }
        }

        //set object variables
        this.terminals = this._someTerminal.filter(v => !this.nonTerminals.includes(v));

        this.computeEmpty();
        this.computeFirst1();
    }

    toString() {
        const plainProductions = [];
        for (const prod of this.productions) {
            plainProductions.push(prod.left + ARROW + (prod.right.length === 0 ? EPSILON : prod.right.join(" ")));
        }
        return plainProductions.join('\n');
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
        if (left !== START_NON_TERMINAL && !this.nonTerminals.includes(left))
            this.nonTerminals.push(left);

        const prods = prodSplit[1].split(DELIMITER);
        for (const prod of prods) {
            const right = [];
            const rightSplit = prod.split(" ");

            for (let someTerminal of rightSplit) {
                if (someTerminal === "" || someTerminal === EPSILON)
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
            this.productions.push({left, right});
        }
    }

    error() {
        return this._errors.length !== 0;
    }

    getStartLRItemText() {
        let prodString = this.startProduction.left + ARROW + DOT + this.startProduction.right.join(" ");
        if (this.lr === 1) {
            prodString += " {" + DOLLAR + "}";
        }
        return prodString;
    }

    /**parses the content of an lr item in the graph and returns the relevant parts.
     * The Lookahead set is only returned if this is an LR1 Grammar
     * this is the lrItems format with arbitrary many spaces: left -> right1 . right2 { lookahead }
     * If no production can be matched 'false' is returned
     * right1, right2 and lookahead are arrays
     @return {left, right1, right2, lookahead} if everything is alright, else 'false'
     */
    parseLRItem(itemText) {
        if (this.lrItemMap.has(itemText)) {
            return this.lrItemMap.get(itemText);
        }
        const result = this.parseLRItemHelp(itemText);
        this.lrItemMap.set(itemText, result);
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
            if (!split[1].trim().endsWith('}')) return false;

            const setString = split[1].replace('}', '');
            const set = setString.split(',');
            for (const terminal of set) {
                if (terminal === DOLLAR) continue;
                if (!this.terminals.includes(terminal)) return false;
            }
            lookahead = set.sort();
        }

        //retrieve Variables
        const split = text.split(ARROW);
        if (split.length !== 2) return false; //only one ARROW
        const left = split[0].trim();

        const rightSplit = split[1].split(DOT);
        if (rightSplit.length !== 2) return false; //only one DOT
        const right1String = rightSplit[0].trim().replace(' ', '');
        const right2String = rightSplit[1].trim().replace(' ', '');

        //check if production exists
        const possibleProductions = this.productions.filter(p => p.left === left);
        let correctProduction;
        for (const prod of possibleProductions) {
            //does not handle similar productions like A -> a b; A -> ab, with a, b, ab as Terminals
            //but this is a bad grammar design and ignored in this case
            const prodRight = prod.right.join('');
            const checkRight = (right1String + right2String);
            if (prodRight === checkRight) {
                correctProduction = prod;
                break;
            }
        }
        if (!correctProduction) return false;

        // check if dot is in correct location (not in between a terminal like A -> i.nt with 'int' as terminal)
        // and splices the array for the result
        let right1, right2;
        if (right1String === '') {
            right1 = [];
            right2 = correctProduction.right;
        } else {
            let rightTMP = '';
            for (let i = 0; i < correctProduction.right.length; i++) {
                const terminal = correctProduction.right[i];
                rightTMP += terminal;
                if (right1String === rightTMP) {
                    right1 = correctProduction.right.slice(0, i + 1);
                    right2 = correctProduction.right.slice(i + 1, correctProduction.right.length);
                    break;
                }
            }
            if (!right1 && !right2) return false;
        }

        //return result
        if (this.lr === 1)
            return {left, right1, right2, lookahead};
        return {left, right1, right2};
    }

    itemToText(item) {
        let asArray = [item.left, ARROW, ...item.right1, DOT, ...item.right2];
        if (item.lookahead) {
            const lookahead = item.lookahead.join(', ');
            asArray.push('{' + lookahead + '}');
        }
        return asArray.join(' ');
    }

    /**
     * Computes the Epsilon Closure of given LR Items
     * @param lrItems: [A->a.b, B->.A] list of parsed LR Items
     * @return list of parsed LRItem texts which are in the closure of the given LR Items
     */
    computeEpsilonClosure(lrItems) {
        let workQueue = [];
        let closure = [];
        for (const parsedItem of lrItems) {
            if (parsedItem === false || parsedItem === undefined) continue;
            workQueue.push({...parsedItem});
        }

        while (workQueue.length !== 0) {
            const current = workQueue.pop()
            // if (closure.includes(current)) // does not work cause strict equality is needed
            if (arrayIncludes(closure, current)) continue;
            closure.push(current);
            workQueue = workQueue.concat(this.getNextEpsilonLRItems(current));
        }

        //compact lookahead sets
        if (this.lr === 1) {
            const INFO = ".parsed";

            const itemsToSet = {};
            for (const item of closure) {
                const text = this.itemToText({'left': item.left, 'right1': item.right1, 'right2': item.right2});
                if (itemsToSet[text] === undefined) {
                    itemsToSet[text] = item.lookahead;
                    itemsToSet[text + INFO] = item;
                } else {
                    itemsToSet[text] = itemsToSet[text].concat(item.lookahead);
                }
            }

            closure = []
            for (const itemText in itemsToSet) {
                if (itemText.endsWith(INFO)) continue;
                const item = itemsToSet[itemText + INFO];
                item.lookahead = Array.from(new Set(itemsToSet[itemText])).sort();
                closure.push(item);
            }
        }
        return closure;
    }

    getNextEpsilonLRItems(parsedItem) {
        const NonTerminal = parsedItem.right2[0];
        const result = []

        for (const prod of this.productions) {
            if (prod.left !== NonTerminal) continue;
            if (this.lr === 1) {
                //compute new lookahead set
                let newLookahead = [];
                const rightSide = parsedItem.right2.slice(1, parsedItem.right2.length);
                while (true) {
                    if (rightSide.length === 0) {
                        newLookahead = newLookahead.concat(parsedItem.lookahead)
                        break;
                    }
                    const symb = rightSide.shift();
                    const first1 = this.first1Set[symb];
                    newLookahead = newLookahead.concat(first1);
                    if (!this.canBeEmpty[symb]) break;
                }
                newLookahead = Array.from(new Set(newLookahead)).sort() // filter duplicates

                result.push({
                    'left': prod.left,
                    'right1': [],
                    'right2': prod.right,
                    'lookahead': newLookahead,
                });
            } else {
                result.push({
                    'left': prod.left,
                    'right1': [],
                    'right2': prod.right,
                });
            }
        }
        return result;
    }


    /**
     * shifts the dot in an parsed LR Item
     * @param parsedItem
     * @return {({left: *, right1: *, right2: *}|*)[]|undefined}
     *      undefined: if the item is final and thus cannot be shifted
     *      res[1]: The (non)terminal, that got shifted
     */
    shiftLrItem(parsedItem) {
        if (parsedItem.right2.length === 0) return undefined;
        const shiftTerm = parsedItem.right2[0];
        const item = {
            'left': parsedItem.left,
            'right1': parsedItem.right1.concat([shiftTerm]),
            'right2': parsedItem.right2.slice(1, parsedItem.right2.length),
        }
        if (this.lr === 1) {
            item['lookahead'] = parsedItem.lookahead;
        }
        return [item, shiftTerm];
    }

    /**Compute Empty value for each symbol*/
    computeEmpty() {
        for (const terminal of this.terminals) this.canBeEmpty[terminal] = false;
        for (const nonTerminal of this.nonTerminals) this.canBeEmpty[nonTerminal] = false;
        this.canBeEmpty[START_NON_TERMINAL] = false;

        let changed = true;
        while (changed) {
            changed = false;
            for (const prod of this.productions) {
                let empty = true;
                for (const symb of prod.right) {
                    const emptySymbol = this.canBeEmpty[symb];
                    if (!emptySymbol) {
                        empty = false;
                        break
                    }
                }
                if (empty && this.canBeEmpty[prod.left] !== true) {
                    this.canBeEmpty[prod.left] = true;
                    changed = true;
                }
            }
        }
    }

    /**Compute all first1 sets for the symbols */
    computeFirst1() {
        for (const terminal of this.terminals) this.first1Set[terminal] = [terminal]
        for (const nonTerminal of this.nonTerminals) this.first1Set[nonTerminal] = []
        this.first1Set[START_NON_TERMINAL] = [];

        let changed = true;
        while (changed) {
            changed = false;
            for (const prod of this.productions) {
                const oldSet = this.first1Set[prod.left];
                let newElements = [];
                for (const symb of prod.right) {
                    newElements = newElements.concat(this.first1Set[symb]);
                    if (!this.canBeEmpty[symb]) break;
                }
                for (const elem of newElements) {
                    if (oldSet.includes(elem)) continue;
                    this.first1Set[prod.left].push(elem);
                    changed = true;
                }
            }
        }
    }
}
