import * as zrUtil from 'zrender/src/core/util';
import createListFromArray from './chart/helper/createListFromArray';
import * as axisHelper from './coord/axisHelper';
import axisModelCommonMixin from './coord/axisModelCommonMixin';
import Model from './model/Model';

/**
 * Create a muti dimension List structure from seriesModel.
 * @param  {module:echarts/model/Model} seriesModel
 * @return {module:echarts/data/List} list
 */
export function createList(seriesModel) {
    var data = seriesModel.get('data');
    return createListFromArray(data, seriesModel, seriesModel.ecModel);
}

/**
 * @see {module:echarts/data/helper/completeDimensions}
 */
export {default as completeDimensions} from './data/helper/completeDimensions';

/**
 * Create a symbol element with given symbol configuration: shape, x, y, width, height, color
 * @see http://echarts.baidu.com/option.html#series-scatter.symbol
 * @param {string} symbolDesc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 */
export {createSymbol} from './util/symbol';

/**
 * Create scale
 * @param {Array.<number>} dataExtent
 * @param {Object|module:echarts/Model} option
 */
export function createScale(dataExtent, option) {
    var axisModel = option;
    if (!(option instanceof Model)) {
        axisModel = new Model(option);
        zrUtil.mixin(axisModel, axisModelCommonMixin);
    }

    var scale = axisHelper.createScaleByModel(axisModel);
    scale.setExtent(dataExtent[0], dataExtent[1]);

    axisHelper.niceScaleExtent(scale, axisModel);
    return scale;
}

/**
 * Mixin common methods to axis model,
 *
 * Inlcude methods
 * `getFormattedLabels() => Array.<string>`
 * `getCategories() => Array.<string>`
 * `getMin(origin: boolean) => number`
 * `getMax(origin: boolean) => number`
 * `getNeedCrossZero() => boolean`
 * `setRange(start: number, end: number)`
 * `resetRange()`
 */
export function mixinAxisModelCommonMethods(Model) {
    zrUtil.mixin(Model, axisModelCommonMixin);
}