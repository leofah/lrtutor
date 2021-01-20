//found on https://dmitripavlutin.com/how-to-compare-objects-in-javascript/
/**
 * checks if two objects have the same keys and values recursively
 * @param object1: object to compare
 * @param object2: object to compare
 * @return boolean, whether the objects are the same
 */
function deepEqual(object1, object2) {
    function isObject(object) {
        return object != null && typeof object === 'object';
    }

    if (object1 === object2) return true;

    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (areObjects && !deepEqual(val1, val2) || !areObjects && val1 !== val2) {
            return false;
        }
    }
    return true;
}

/**
 * checks if array includes the value with deepEqual
 * @return boolean: whether the array includes the value
 */
const arrayIncludes = (array, value) => array.filter(v => deepEqual(v, value)).length > 0;


/**
 * compares two arrays if their contents are equal (as sets) with deep equality.
 * @return boolean: true if sets are equal
 */
const isSetsEqual = (a, b) => a.every(v => arrayIncludes(b, v)) && b.every(v => arrayIncludes(a, v));

/**
 * shortcut for get Element By ID
 */
function I(elementID) {
    return document.getElementById(elementID);
}
