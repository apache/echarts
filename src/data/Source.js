import {extend, createHashMap} from 'zrender/src/core/util';

/**
 * [sourceFormat]
 *
 * + "seriesOriginal":
 * This format is only used in series.data, where
 * itemStyle can be specified in data item.
 *
 * + "array2d":
 * [
 *     ['product', 'score', 'amount'],
 *     ['Matcha Latte', 89.3, 95.8],
 *     ['Milk Tea', 92.1, 89.4],
 *     ['Cheese Cocoa', 94.4, 91.2],
 *     ['Walnut Brownie', 85.4, 76.9]
 * ]
 *
 * + "keyValues":
 * [
 *     {product: 'Matcha Latte', score: 89.3, amount: 95.8},
 *     {product: 'Milk Tea', score: 92.1, amount: 89.4},
 *     {product: 'Cheese Cocoa', score: 94.4, amount: 91.2},
 *     {product: 'Walnut Brownie', score: 85.4, amount: 76.9}
 * ]
 *
 * + "keyArrays":
 * {
 *     'product': ['Matcha Latte', 'Milk Tea', 'Cheese Cocoa', 'Walnut Brownie'],
 *     'count': [823, 235, 1042, 988],
 *     'score': [95.8, 81.4, 91.2, 76.9]
 * }
 *
 * + "typedArray"
 *
 * + null/undefined
 *
 */

/**
 * @constructor
 * @param {Object} fields
 * @param {string} fields.modelUID Not null/undefined.
 * @param {Array|Object} fields.data Not null/undefined.
 * @param {Array.<Object|string>} dimensionsDefine  Original define, can be null/undefined.
 * @param {string} seriesLayoutBy 'row' or 'column'
 * @param {HashMap} encodeDefine Original define, can be null/undefined.
 * @param {string} sourceFormat See also"detectSourceFormat".
 */
function Source(fields) {
    extend(this, fields);
    if (this.encodeDefine) {
        this.encodeDefine = createHashMap(this.encodeDefine);
    }
}

export default Source;