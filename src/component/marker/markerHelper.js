import * as zrUtil from 'zrender/src/core/util';
import * as numberUtil from '../../util/number';

var indexOf = zrUtil.indexOf;

function hasXOrY(item) {
    return !(isNaN(parseFloat(item.x)) && isNaN(parseFloat(item.y)));
}

function hasXAndY(item) {
    return !isNaN(parseFloat(item.x)) && !isNaN(parseFloat(item.y));
}

function getPrecision(data, valueAxisDim, dataIndex) {
    var precision = -1;
    do {
        precision = Math.max(
            numberUtil.getPrecision(data.get(
                valueAxisDim, dataIndex
            )),
            precision
        );
        data = data.stackedOn;
    } while (data);

    return precision;
}

function markerTypeCalculatorWithExtent(
    mlType, data, otherDataDim, targetDataDim, otherCoordIndex, targetCoordIndex
) {
    var coordArr = [];
    var value = numCalculate(data, targetDataDim, mlType);

    var dataIndex = data.indicesOfNearest(targetDataDim, value, true)[0];
    coordArr[otherCoordIndex] = data.get(otherDataDim, dataIndex, true);
    coordArr[targetCoordIndex] = data.get(targetDataDim, dataIndex, true);

    var precision = getPrecision(data, targetDataDim, dataIndex);
    precision = Math.min(precision, 20);
    if (precision >= 0) {
        coordArr[targetCoordIndex] = +coordArr[targetCoordIndex].toFixed(precision);
    }

    return coordArr;
}

var curry = zrUtil.curry;
// TODO Specified percent
var markerTypeCalculator = {
    /**
     * @method
     * @param {module:echarts/data/List} data
     * @param {string} baseAxisDim
     * @param {string} valueAxisDim
     */
    min: curry(markerTypeCalculatorWithExtent, 'min'),
    /**
     * @method
     * @param {module:echarts/data/List} data
     * @param {string} baseAxisDim
     * @param {string} valueAxisDim
     */
    max: curry(markerTypeCalculatorWithExtent, 'max'),

    /**
     * @method
     * @param {module:echarts/data/List} data
     * @param {string} baseAxisDim
     * @param {string} valueAxisDim
     */
    average: curry(markerTypeCalculatorWithExtent, 'average')
};

/**
 * Transform markPoint data item to format used in List by do the following
 * 1. Calculate statistic like `max`, `min`, `average`
 * 2. Convert `item.xAxis`, `item.yAxis` to `item.coord` array
 * @param  {module:echarts/model/Series} seriesModel
 * @param  {module:echarts/coord/*} [coordSys]
 * @param  {Object} item
 * @return {Object}
 */
export function dataTransform(seriesModel, item) {
    var data = seriesModel.getData();
    var coordSys = seriesModel.coordinateSystem;

    // 1. If not specify the position with pixel directly
    // 2. If `coord` is not a data array. Which uses `xAxis`,
    // `yAxis` to specify the coord on each dimension

    // parseFloat first because item.x and item.y can be percent string like '20%'
    if (item && !hasXAndY(item) && !zrUtil.isArray(item.coord) && coordSys) {
        var dims = coordSys.dimensions;
        var axisInfo = getAxisInfo(item, data, coordSys, seriesModel);

        // Clone the option
        // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
        item = zrUtil.clone(item);

        if (item.type
            && markerTypeCalculator[item.type]
            && axisInfo.baseAxis && axisInfo.valueAxis
        ) {
            var otherCoordIndex = indexOf(dims, axisInfo.baseAxis.dim);
            var targetCoordIndex = indexOf(dims, axisInfo.valueAxis.dim);

            item.coord = markerTypeCalculator[item.type](
                data, axisInfo.baseDataDim, axisInfo.valueDataDim,
                otherCoordIndex, targetCoordIndex
            );
            // Force to use the value of calculated value.
            item.value = item.coord[targetCoordIndex];
        }
        else {
            // FIXME Only has one of xAxis and yAxis.
            var coord = [
                item.xAxis != null ? item.xAxis : item.radiusAxis,
                item.yAxis != null ? item.yAxis : item.angleAxis
            ];
            // Each coord support max, min, average
            for (var i = 0; i < 2; i++) {
                if (markerTypeCalculator[coord[i]]) {
                    var dataDim = seriesModel.coordDimToDataDim(dims[i])[0];
                    coord[i] = numCalculate(data, dataDim, coord[i]);
                }
            }
            item.coord = coord;
        }
    }
    return item;
}

export function getAxisInfo(item, data, coordSys, seriesModel) {
    var ret = {};

    if (item.valueIndex != null || item.valueDim != null) {
        ret.valueDataDim = item.valueIndex != null
            ? data.getDimension(item.valueIndex) : item.valueDim;
        ret.valueAxis = coordSys.getAxis(seriesModel.dataDimToCoordDim(ret.valueDataDim));
        ret.baseAxis = coordSys.getOtherAxis(ret.valueAxis);
        ret.baseDataDim = seriesModel.coordDimToDataDim(ret.baseAxis.dim)[0];
    }
    else {
        ret.baseAxis = seriesModel.getBaseAxis();
        ret.valueAxis = coordSys.getOtherAxis(ret.baseAxis);
        ret.baseDataDim = seriesModel.coordDimToDataDim(ret.baseAxis.dim)[0];
        ret.valueDataDim = seriesModel.coordDimToDataDim(ret.valueAxis.dim)[0];
    }

    return ret;
}

/**
 * Filter data which is out of coordinateSystem range
 * [dataFilter description]
 * @param  {module:echarts/coord/*} [coordSys]
 * @param  {Object} item
 * @return {boolean}
 */
export function dataFilter(coordSys, item) {
    // Alwalys return true if there is no coordSys
    return (coordSys && coordSys.containData && item.coord && !hasXOrY(item))
        ? coordSys.containData(item.coord) : true;
}

export function dimValueGetter(item, dimName, dataIndex, dimIndex) {
    // x, y, radius, angle
    if (dimIndex < 2) {
        return item.coord && item.coord[dimIndex];
    }
    return item.value;
}

export function numCalculate(data, valueDataDim, type) {
    if (type === 'average') {
        var sum = 0;
        var count = 0;
        data.each(valueDataDim, function (val, idx) {
            if (!isNaN(val)) {
                sum += val;
                count++;
            }
        }, true);
        return sum / count;
    }
    else {
        return data.getDataExtent(valueDataDim, true)[type === 'max' ? 1 : 0];
    }
}
