import {each, createHashMap} from 'zrender/src/core/util';

export var SPECIAL_DIMENSIONS = createHashMap([
    'tooltip', 'label', 'itemName', 'seriesName'
]);

/**
 * Summarize and cache for avoiding repeat calculation while travel data.
 * @return {Object}
 * {
 *     each of SPECIAL_DIMENSIONS in concrete dim. Array not null/undefined.
 *     lastValueDimension: a set of DIMENSION_TYPES in concrete dim. Array not null/undefined.
 * }
 */
export function summarizeDimensions(data) {
    var summary = {};
    SPECIAL_DIMENSIONS.each(function (v, dimType) {
        summary[dimType] = otherDimToDataDim(data, dimType);
    });
    summary.lastValueDimension = findTheLastValueDimensions(data);
    summary.noDefaultLabel = !(summary.label[0] || summary.lastValueDimension);
    return summary;
}

/**
 * @see {module:echarts/data/helper/createDimensions}
 * @param {module:echarts/data/List} data
 * @param {string} otherDim See OTHER_DIMS
 * @return {Array.<string>} data dimensions on the otherDim.
 */
export function otherDimToDataDim(data, otherDim) {
    var dataDim = [];
    each(data.dimensions, function (dimName) {
        var dimItem = data.getDimensionInfo(dimName);
        var otherDims = dimItem.otherDims;
        var dimIndex = otherDims[otherDim];
        if (dimIndex != null && dimIndex !== false) {
            dataDim[dimIndex] = dimItem.name;
        }
    });
    return dataDim;
}

export function getValueTypeByAxis(axisType) {
    return axisType === 'category'
        ? 'ordinal'
        : axisType === 'time'
        ? 'time'
        : 'float';
}

function findTheLastValueDimensions(data) {
    // Get last value dim
    var dimensions = data.dimensions.slice();
    var valueType;
    var valueDim;
    while (dimensions.length && (
        valueDim = dimensions.pop(),
        valueType = data.getDimensionInfo(valueDim).type,
        valueType === 'ordinal' || valueType === 'time'
    )) {} // jshint ignore:line
    return valueDim;
}
