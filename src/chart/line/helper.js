import {isDimensionStacked} from '../../data/helper/dataStackHelper';
import {map} from 'zrender/src/core/util';

/**
 * @param {Object} coordSys
 * @param {module:echarts/data/List} data
 * @param {string} valueOrigin lineSeries.option.areaStyle.origin
 */
export function prepareDataCoordInfo(coordSys, data, valueOrigin) {
    var baseAxis = coordSys.getBaseAxis();
    var valueAxis = coordSys.getOtherAxis(baseAxis);
    var valueStart = getValueStart(valueAxis, valueOrigin);

    var baseAxisDim = baseAxis.dim;
    var valueAxisDim = valueAxis.dim;
    var valueDim = data.mapDimension(valueAxisDim);
    var baseDim = data.mapDimension(baseAxisDim);
    var baseDataOffset = valueAxisDim === 'x' || valueAxisDim === 'radius' ? 1 : 0;

    var stacked = isDimensionStacked(data, valueDim, baseDim);

    var dataDimsForPoint = map(coordSys.dimensions, function (coordDim) {
        return data.mapDimension(coordDim);
    });

    return {
        dataDimsForPoint: dataDimsForPoint,
        valueStart: valueStart,
        valueAxisDim: valueAxisDim,
        baseAxisDim: baseAxisDim,
        stacked: stacked,
        valueDim: valueDim,
        baseDim: baseDim,
        baseDataOffset: baseDataOffset,
        stackedOverDimension: data.getCalculationInfo('stackedOverDimension')
    };
}

function getValueStart(valueAxis, valueOrigin) {
    var valueStart = 0;
    var extent = valueAxis.scale.getExtent();

    if (valueOrigin === 'start') {
        valueStart = extent[0];
    }
    else if (valueOrigin === 'end') {
        valueStart = extent[1];
    }
    // auto
    else {
        // Both positive
        if (extent[0] > 0) {
            valueStart = extent[0];
        }
        // Both negative
        else if (extent[1] < 0) {
            valueStart = extent[1];
        }
        // If is one positive, and one negative, onZero shall be true
    }

    return valueStart;
}

export function getStackedOnPoint(dataCoordInfo, coordSys, data, idx) {
    var value = NaN;
    if (dataCoordInfo.stacked) {
        value = data.get(data.getCalculationInfo('stackedOverDimension'), idx);
    }
    if (isNaN(value)) {
        value = dataCoordInfo.valueStart;
    }

    var baseDataOffset = dataCoordInfo.baseDataOffset;
    var stackedData = [];
    stackedData[baseDataOffset] = data.get(dataCoordInfo.baseDim, idx);
    stackedData[1 - baseDataOffset] = value;

    return coordSys.dataToPoint(stackedData);
}
