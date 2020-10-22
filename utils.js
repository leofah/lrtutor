//found on https://dmitripavlutin.com/how-to-compare-objects-in-javascript/
function deepEqual(object1, object2) {
    /**
     * checks if two objects have the same keys and values recursively
     * @param object1, object2: objects to compare
     * @return boolean, whether the objects are the same
     */
    function isObject(object) {
        return object != null && typeof object === 'object';
    }

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
 * compares two arrays if their contents are equal (as sets) with deep equality
 * javascript sets don't check for deep equal so two same objects can be in the set
 * @return boolean: true if sets are equal
 */
const isSetsEqual = (a, b) => a.every(value => arrayIncludes(b, value));
