/**
 * @module echarts/chart/helper/Symbol
 */

import {otherDimToDataDim} from '../../util/model';

export function findLabelValueDim(data) {
    var valueDim;
    var labelDims = otherDimToDataDim(data, 'label');

    if (labelDims.length) {
        valueDim = labelDims[0];
    }
    else {
        // Get last value dim
        var dimensions = data.dimensions.slice();
        var dataType;
        while (dimensions.length && (
            valueDim = dimensions.pop(),
            dataType = data.getDimensionInfo(valueDim).type,
            dataType === 'ordinal' || dataType === 'time'
        )) {} // jshint ignore:line
    }

    return valueDim;
}
