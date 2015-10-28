define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    var getPrecision = function (data, valueAxisDim, dataIndex) {
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
    };

    var markerTypeCalculatorWithExtent = function (percent, data, baseAxisDim, valueAxisDim) {
        var extent = data.getDataExtent(valueAxisDim);
        var valueIndex = (valueAxisDim === 'angle' || valueAxisDim === 'x') ? 0 : 1;
        var valueArr = [];
        var min = extent[0];
        var max = extent[1];
        var val = (max - min) * percent + min;
        var dataIndex = data.indexOfNearest(valueAxisDim, val);
        valueArr[1 - valueIndex] = data.get(baseAxisDim, dataIndex);
        valueArr[valueIndex] = data.get(valueAxisDim, dataIndex, true);

        var precision = getPrecision(data, valueAxisDim, dataIndex);
        if (precision >= 0) {
            valueArr[valueIndex] = +valueArr[valueIndex].toFixed(precision);
        }

        return valueArr;
    };

    var curry = zrUtil.curry;
    // TODO Specified percent
    var markerTypeCalculator = {
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        min: curry(markerTypeCalculatorWithExtent, 0),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        max: curry(markerTypeCalculatorWithExtent, 1),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        average: curry(markerTypeCalculatorWithExtent, 0.5)
    };

    var dataTransform = function (data, baseAxis, valueAxis, item) {
        // 1. If not specify the position with pixel directly
        // 2. If value is not a data array. Which uses xAxis, yAxis to specify the value on each dimension
        if (isNaN(item.x) || isNaN(item.y) && !zrUtil.isArray(item.value)) {
            // Clone the option
            // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
            // Competitable with 2.x
            item = zrUtil.extend({}, item);

            // Special types, Compatible with 2.0
            if (item.type && markerTypeCalculator[item.type]
                && baseAxis && valueAxis) {
                var value = markerTypeCalculator[item.type](
                    data, baseAxis.dim, valueAxis.dim
                );
                value.push(+item.value);
                item.value = value;
            }
            else {
                // FIXME Only has one of xAxis and yAxis.
                item.value = [
                    item.xAxis != null ? item.xAxis : item.radiusAxis,
                    item.yAxis != null ? item.yAxis : item.angleAxis,
                    +item.value
                ];
            }
        }
        return item;
    };

    // Filter data which is out of coordinateSystem range
    var dataFilter = function (coordSys, coordDataIdx, item) {
        var value = item.value;
        value = [value[coordDataIdx[0]], value[coordDataIdx[1]]];
        return coordSys.containData(value);
    }

    return {
        dataTransform: dataTransform,
        dataFilter: dataFilter
    };
});