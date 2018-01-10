import {each, createHashMap, assert} from 'zrender/src/core/util';
import { __DEV__ } from '../../config';

export var OTHER_DIMENSIONS = createHashMap([
    'tooltip', 'label', 'itemName', 'seriesName'
]);

export function summarizeDimensions(data) {
    var summary = {};

    var encode = summary.encode = {};
    each(data.dimensions, function (dimName) {
        var dimItem = data.getDimensionInfo(dimName);

        var coordDim = dimItem.coordDim;
        if (coordDim) {
            if (__DEV__) {
                assert(OTHER_DIMENSIONS.get(coordDim) == null);
            }
            var coordDimArr = encode[coordDim];
            if (!encode.hasOwnProperty(coordDim)) {
                coordDimArr = encode[coordDim] = [];
            }
            coordDimArr[dimItem.coordDimIndex] = dimItem.name;
        }

        OTHER_DIMENSIONS.each(function (v, otherDim) {
            var otherDimArr = encode[otherDim];
            if (!encode.hasOwnProperty(otherDim)) {
                otherDimArr = encode[otherDim] = [];
            }

            var dimIndex = dimItem.otherDims[otherDim];
            if (dimIndex != null && dimIndex !== false) {
                otherDimArr[dimIndex] = dimItem.name;
            }
        });
    });

    var labelEncode = summary.encode.label;
    var briefLastValueType = findTheLastValueDimensions(data);
    summary.brief = {
        lastValueType: briefLastValueType,
        noDefaultLabel: !(labelEncode && labelEncode[0]) && briefLastValueType == null
    };

    return summary;
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
