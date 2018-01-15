import {createHashMap, isTypedArray} from 'zrender/src/core/util';
import {enableClassCheck} from '../util/clazz';
import {
    SOURCE_FORMAT_ORIGINAL,
    SERIES_LAYOUT_BY_COLUMN,
    SOURCE_FORMAT_UNKNOWN,
    SOURCE_FORMAT_TYPED_ARRAY,
    SOURCE_FORMAT_KEYED_COLUMNS
} from './helper/sourceType';

/**
 * [sourceFormat]
 *
 * + "original":
 * This format is only used in series.data, where
 * itemStyle can be specified in data item.
 *
 * + "arrayRows":
 * [
 *     ['product', 'score', 'amount'],
 *     ['Matcha Latte', 89.3, 95.8],
 *     ['Milk Tea', 92.1, 89.4],
 *     ['Cheese Cocoa', 94.4, 91.2],
 *     ['Walnut Brownie', 85.4, 76.9]
 * ]
 *
 * + "objectRows":
 * [
 *     {product: 'Matcha Latte', score: 89.3, amount: 95.8},
 *     {product: 'Milk Tea', score: 92.1, amount: 89.4},
 *     {product: 'Cheese Cocoa', score: 94.4, amount: 91.2},
 *     {product: 'Walnut Brownie', score: 85.4, amount: 76.9}
 * ]
 *
 * + "keyedColumns":
 * {
 *     'product': ['Matcha Latte', 'Milk Tea', 'Cheese Cocoa', 'Walnut Brownie'],
 *     'count': [823, 235, 1042, 988],
 *     'score': [95.8, 81.4, 91.2, 76.9]
 * }
 *
 * + "typedArray"
 *
 * + "unknown"
 */

/**
 * @constructor
 * @param {Object} fields
 * @param {string} fields.sourceFormat
 * @param {Array|Object} fields.fromDataset
 * @param {Array|Object} [fields.data]
 * @param {string} [seriesLayoutBy='column']
 * @param {Array.<Object|string>} [dimensionsDefine]
 * @param {Objet|HashMap} [encodeDefine]
 * @param {number} [startIndex=0]
 * @param {number} [dimensionsDetectCount]
 */
function Source(fields) {

    /**
     * @type {boolean}
     */
    this.fromDataset = fields.fromDataset;

    /**
     * Not null/undefined.
     * @type {Array|Object}
     */
    this.data = fields.data || (
        fields.sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS ? {} : []
    );

    /**
     * See also "detectSourceFormat".
     * Not null/undefined.
     * @type {string}
     */
    this.sourceFormat = fields.sourceFormat || SOURCE_FORMAT_UNKNOWN;

    /**
     * 'row' or 'column'
     * Not null/undefined.
     * @type {string} seriesLayoutBy
     */
    this.seriesLayoutBy = fields.seriesLayoutBy || SERIES_LAYOUT_BY_COLUMN;

    /**
     * dimensions definition in option.
     * can be null/undefined.
     * @type {Array.<Object|string>}
     */
    this.dimensionsDefine = fields.dimensionsDefine;

    /**
     * encode definition in option.
     * can be null/undefined.
     * @type {Objet|HashMap}
     */
    this.encodeDefine = fields.encodeDefine && createHashMap(fields.encodeDefine);

    /**
     * Not null/undefined, uint.
     * @type {number}
     */
    this.startIndex = fields.startIndex || 0;

    /**
     * Can be null/undefined (when unknown), uint.
     * @type {number}
     */
    this.dimensionsDetectCount = fields.dimensionsDetectCount;
}

/**
 * Wrap original series data for some compatibility cases.
 */
Source.seriesDataToSource = function (data) {
    return new Source({
        data: data,
        sourceFormat: isTypedArray(data)
            ? SOURCE_FORMAT_TYPED_ARRAY
            : SOURCE_FORMAT_ORIGINAL,
        fromDataset: false
    });
};

enableClassCheck(Source);

export default Source;