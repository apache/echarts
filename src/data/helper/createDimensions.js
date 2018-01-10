/**
 * Substitute `completeDimensions`.
 * `completeDimensions` is to be deprecated.
 */
import completeDimensions from './completeDimensions';

/**
 * @param {module:echarts/data/Source|module:echarts/data/List} source or data.
 * @param {Object|Array} [opt]
 * @param {Array.<string|Object>} [opt.sysDimensions=[]]
 * @param {number} [opt.dimensionsCount]
 * @param {string} [opt.extraPrefix]
 * @param {boolean} [opt.extraFromZero]
 * @return {Array.<Object>} dimensionsInfo
 */
export default function (source, opt) {
    opt = opt || {};
    return completeDimensions(opt.sysDimensions || [], source, {
        dimsDef: source.dimensionsDefine,
        encodeDef: source.encodeDefine,
        dimCount: opt.dimensionsCount,
        extraPrefix: opt.extraPrefix,
        extraFromZero: opt.extraFromZero
    });
}
