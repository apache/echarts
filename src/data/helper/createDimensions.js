/**
 * Substitute `completeDimensions`.
 * `completeDimensions` is to be deprecated.
 */
import {__DEV__} from '../../config';
import completeDimensions from './completeDimensions';
import {isArrayLike, isTypedArray} from 'zrender/src/core/util';

/**
 * @param {Object|Array} opt
 * @param {Array} [opt.data]
 * @param {Array.<string|Object>} [opt.sysDimensions=[]]
 * @param {Object|HashMap} [opt.encodeDefine={}]
 * @param {Array.<string|Object>} [opt.dimensionsDefine={}]
 * @param {number} [opt.dimensionsCount]
 * @param {string} [opt.extraPrefix]
 * @param {boolean} [opt.extraFromZero]
 * @return {Array.<Object>} dimensionsInfo
 */
export default function (opt) {
    var data = opt.data || [];

    if (__DEV__) {
        if (!isArrayLike(data)) {
            throw new Error('Invalid data.');
        }
    }

    var dimensionsCount = opt.dimensionsCount;

    var isDataTypedArray = isTypedArray(data);
    if (isDataTypedArray) {
        if (__DEV__) {
            if (!opt.dimensionsDefine) {
                throw new Error('dimensions must be given if data is a ' + Object.prototype.toString.call(data));
            }
        }
        dimensionsCount = opt.dimensionsDefine.length;
    }

    return completeDimensions(opt.sysDimensions || [], data, {
        dimsDef: opt.dimensionsDefine,
        encodeDef: opt.encodeDefine,
        dimCount: dimensionsCount,
        extraPrefix: opt.extraPrefix,
        extraFromZero: opt.extraFromZero
    });
}
