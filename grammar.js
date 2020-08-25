/**
 * Stores the current grammar and gives functions to parse it
 */

const DOT = '•';
const ARROW = '➜';
const EPSILON = 'Ɛ'

class Grammar {
    constructor() {
        //example grammar
        this.lr = 0; //lr(.) value, either 0 or 1 (higher exists, but is not needed)
        this.terminals = ['(', ')', '+', '*', 'int'];
        this.nonTerminals = ['E', 'T', 'F'];
        this.productions = ["S′➜E","E➜E+T", "E➜T", "T➜T*F","T➜F", "F➜(E)", "F➜int"];
        this.startProduction = this.productions[0];
        this.plain = "S′➜E\n" +
            "E➜E + T |T \n" +
            "T➜T * F |F \n" +
            "F➜( E ) |int \n";
    }

    isLRItem(itemText) {
        let text = itemText.trim().replace(' ', '');

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
        return this.productions.includes(shortText);
    }


}
