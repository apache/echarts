import {each, createHashMap, assert} from 'zrender/src/core/util';
import { __DEV__ } from '../../config';

export var OTHER_DIMENSIONS = createHashMap([
    'tooltip', 'label', 'itemName', 'itemId', 'seriesName'
]);

export function summarizeDimensions(data) {
    var summary = {};
    var encode = summary.encode = {};
    var notExtraCoordDimMap = createHashMap();
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

            if (!dimItem.isExtraCoord) {
                notExtraCoordDimMap.set(coordDim, 1);

                // Use the last coord dim (and label friendly) as default label,
                // because when dataset is used, it is hard to guess which dimension
                // can be value dimension. If both show x, y on label is not look good,
                // and conventionally y axis is focused more.
                if (mayLabelDimType(dimItem.type)) {
                    defaultedLabel[0] = dimName;
                }
            }
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
    var encodeFirstDimNotExtra = {};

    notExtraCoordDimMap.each(function (v, coordDim) {
        var dimArr = encode[coordDim];
        // ??? FIXME extra coord should not be set in dataDimsOnCoord.
        // But should fix the case that radar axes: simplify the logic
        // of `completeDimension`, remove `extraPrefix`.
        encodeFirstDimNotExtra[coordDim] = dimArr[0];
        // Not necessary to remove duplicate, because a data
        // dim canot on more than one coordDim.
        dataDimsOnCoord = dataDimsOnCoord.concat(dimArr);
    });

    summary.dataDimsOnCoord = dataDimsOnCoord;
    summary.encodeFirstDimNotExtra = encodeFirstDimNotExtra;

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
