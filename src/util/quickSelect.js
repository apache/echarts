/**
 * Quick select n-th element in an array.
 *
 * Note: it will change the elements placement in array.
 *
 * @module echarts/core/quickSelect
 * @author Yi Shen(https://github.com/pissang)
 */
define(function (require) {

    function defaultCompareFunc(a, b) {
        return a - b;
    }

    function swapElement(arr, idx0, idx1) {
        var tmp = arr[idx0];
        arr[idx0] = arr[idx1];
        arr[idx1] = tmp;
    }

    function select(arr, left, right, nth, compareFunc) {
        var pivotIdx = left;
        var pivotValue;
        while (right > left) {
            pivotIdx = Math.round((right + left) / 2);
            pivotValue = arr[pivotIdx];
            // Swap pivot to the end
            swapElement(arr, pivotIdx, right);
            pivotIdx = left;
            for (var i = left; i <= right - 1; i++) {
                if (compareFunc(pivotValue, arr[i]) >= 0) {
                    swapElement(arr, i, pivotIdx);
                    pivotIdx++;
                }
            }
            swapElement(arr, right, pivotIdx);

            if (pivotIdx === nth) {
                return pivotIdx;
            }
            else if (pivotIdx < nth) {
                left = pivotIdx + 1;
            }
            else {
                right = pivotIdx - 1;
            }
        }
        // Left == right
        return left;
    }

    /**
     * @alias module:echarts/core/quickSelect
     * @param {Array} arr
     * @param {number} [left]
     * @param {number} [right]
     * @param {number} nth
     * @param {Function} [compareFunc]
     * @example
     *     var quickSelect = require('echarts/core/quickSelect');
     *     var arr = [5, 2, 1, 4, 3]
     *     quickSelect(arr, 3);
     *     quickSelect(arr, 0, 3, 1, function (a, b) {return a - b});
     *
     * @return {number}
     */
    function quickSelect(arr, left, right, nth, compareFunc) {
        if (arguments.length <= 3) {
            nth = left;
            if (arguments.length == 2) {
                compareFunc = defaultCompareFunc;
            }
            else {
                compareFunc = right;
            }
            left = 0;
            right = arr.length - 1;
        }
        return select(arr, left, right, nth, compareFunc);
    }

    return quickSelect;
});