import {each, createHashMap, assert} from 'zrender/src/core/util';
import { __DEV__ } from '../../config';

export var OTHER_DIMENSIONS = createHashMap([
    'tooltip', 'label', 'itemName', 'itemId', 'seriesName'
]);

export function summarizeDimensions(data) {
    var summary = {};
    var encode = summary.encode = {};
    var coordDimMap = summary.coordDimMap = createHashMap();
    var defaultedLabel = [];

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
            coordDimArr[dimItem.coordDimIndex] = dimName;

            if (dimItem.isSysCoord && mayLabelDimType(dimItem.type)) {
                // Use the last coord dim (and label friendly) as default label,
                // because both show x, y on label is not look good, and usually
                // y axis is more focusd conventionally.
                defaultedLabel[0] = dimName;
            }

            coordDimMap.set(coordDim, 1);
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

    var dataDimsOnCoord = [];
    coordDimMap.each(function (v, coordDim) {
        dataDimsOnCoord = dataDimsOnCoord.concat(encode[coordDim]);
    });
    summary.dataDimsOnCoord = dataDimsOnCoord;

    var encodeLabel = encode.label;
    // FIXME `encode.label` is not recommanded, because formatter can not be set
    // in this way. Use label.formatter instead. May be remove this approach someday.
    if (encodeLabel && encodeLabel.length) {
        defaultedLabel = encodeLabel.slice();
    }

    var defaultedTooltip = defaultedLabel.slice();
    var encodeTooltip = encode.tooltip;
    if (encodeTooltip && encodeTooltip.length) {
        defaultedTooltip = encodeTooltip.slice();
    }

    encode.defaultedLabel = defaultedLabel;
    encode.defaultedTooltip = defaultedTooltip;

    return summary;
}

export function getDimensionTypeByAxis(axisType) {
    return axisType === 'category'
        ? 'ordinal'
        : axisType === 'time'
        ? 'time'
        : 'float';
}

function mayLabelDimType(dimType) {
    // In most cases, ordinal and time do not suitable for label.
    // Ordinal info can be displayed on axis. Time is too long.
    return !(dimType === 'ordinal' || dimType === 'time');
}

// function findTheLastDimMayLabel(data) {
//     // Get last value dim
//     var dimensions = data.dimensions.slice();
//     var valueType;
//     var valueDim;
//     while (dimensions.length && (
//         valueDim = dimensions.pop(),
//         valueType = data.getDimensionInfo(valueDim).type,
//         valueType === 'ordinal' || valueType === 'time'
//     )) {} // jshint ignore:line
//     return valueDim;
// }
