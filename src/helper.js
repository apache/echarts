import * as zrUtil from 'zrender/src/core/util';
import createListFromArray from './chart/helper/createListFromArray';
// import createGraphFromNodeEdge from './chart/helper/createGraphFromNodeEdge';
import * as axisHelper from './coord/axisHelper';
import axisModelCommonMixin from './coord/axisModelCommonMixin';
import Model from './model/Model';
import {getLayoutRect} from './util/layout';
import {enableDataStack, isDimensionStacked} from './data/helper/dataStackHelper';

/**
 * Create a muti dimension List structure from seriesModel.
 * @param  {module:echarts/model/Model} seriesModel
 * @return {module:echarts/data/List} list
 */
export function createList(seriesModel) {
    return createListFromArray(seriesModel.getSource(), seriesModel);
}

// export function createGraph(seriesModel) {
//     var nodes = seriesModel.get('data');
//     var links = seriesModel.get('links');
//     return createGraphFromNodeEdge(nodes, links, seriesModel);
// }

export {getLayoutRect};

/**
 * // TODO: @deprecated
 */
export {default as completeDimensions} from './data/helper/completeDimensions';

export {default as createDimensions} from './data/helper/createDimensions';

export var dataStack = {
    isDimensionStacked: isDimensionStacked,
    enableDataStack: enableDataStack
};

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
    if (!Model.isInstance(option)) {
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