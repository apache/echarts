define(function (require) {

    var zrUtil = require('zrender/core/util');

    var markerTypeCalculatorWithExtent = function (percent, data, baseAxisDim, valueAxisDim) {
        var extent = data.getDataExtent(valueAxisDim);
        var valueIndex = (valueAxisDim === 'radius' || valueAxisDim === 'x') ? 0 : 1;
        var valueArr = [];
        var min = extent[0];
        var max = extent[1];
        var val = (max - min) * percent + min;
        var dataIndex = data.indexOfNearest(valueAxisDim, val);
        valueArr[1 - valueIndex] = data.get(baseAxisDim, dataIndex);
        valueArr[valueIndex] = data.get(valueAxisDim, dataIndex, true);
        return valueArr;
    };

    // TODO Specified percent
    var markerTypeCalculator = {
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        min: zrUtil.curry(markerTypeCalculatorWithExtent, 0),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        max: zrUtil.curry(markerTypeCalculatorWithExtent, 1),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        average: zrUtil.curry(markerTypeCalculatorWithExtent, 0.5)
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
    var dataFilter = function (coordSys, dimensionInverse, item) {
        var value = [item.value[0], item.value[1]];
        dimensionInverse && value.inverse();
        return coordSys.containData(value);
    }

    return {
        dataTransform: dataTransform,
        dataFilter: dataFilter
    };
});