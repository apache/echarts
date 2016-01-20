define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

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

    function markerTypeCalculatorWithExtent(mlType, data, baseAxisDim, valueAxisDim, valueIndex) {
        var coordArr = [];
        var value = mlType === 'average'
            ? data.getSum(valueAxisDim, true) / data.count()
            : data.getDataExtent(valueAxisDim)[mlType === 'max' ? 1 : 0];

        var dataIndex = data.indexOfNearest(valueAxisDim, value);
        coordArr[1 - valueIndex] = data.get(baseAxisDim, dataIndex);
        coordArr[valueIndex] = data.get(valueAxisDim, dataIndex, true);

        var precision = getPrecision(data, valueAxisDim, dataIndex);
        if (precision >= 0) {
            coordArr[valueIndex] = +coordArr[valueIndex].toFixed(precision);
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
     * @param  {module:echarts/data/List} data
     * @param  {module:echarts/coord/*} [coordSys]
     * @param  {Object} item
     * @return {Object}
     */
    var dataTransform = function (data, coordSys, item) {
        // 1. If not specify the position with pixel directly
        // 2. If `coord` is not a data array. Which uses `xAxis`, `yAxis` to specify the coord on each dimension
        if ((isNaN(item.x) || isNaN(item.y))
            && !zrUtil.isArray(item.coord)
            && coordSys
        ) {
            var valueAxisDim;
            var baseAxisDim;
            var valueAxis;
            var baseAxis;
            if (item.valueIndex != null) {
                valueAxisDim = coordSys.dimensions[item.valueIndex];
                baseAxisDim = coordSys.dimensions[1 - item.valueIndex];
                valueAxis = coordSys.getAxis(valueAxisDim);
                baseAxis = coordSys.getAxis(baseAxisDim);
            }
            else {
                baseAxis = coordSys.getBaseAxis();
                valueAxis = coordSys.getOtherAxis(baseAxis);
                baseAxisDim = baseAxis.dim;
                valueAxisDim = valueAxis.dim;
            }
            var valueIndex = item.valueIndex != null
                ? item.valueIndex
                : ((valueAxisDim === 'angle' || valueAxisDim === 'x') ? 0 : 1);
            // Clone the option
            // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
            item = zrUtil.extend({}, item);
            if (item.type && markerTypeCalculator[item.type] && baseAxis && valueAxis) {
                item.coord = markerTypeCalculator[item.type](
                    data, baseAxis.dim, valueAxisDim, valueIndex
                );
                // Force to use the value of calculated value.
                item.value = item.coord[valueIndex];
            }
            else {
                // FIXME Only has one of xAxis and yAxis.
                item.coord = [
                    item.xAxis != null ? item.xAxis : item.radiusAxis,
                    item.yAxis != null ? item.yAxis : item.angleAxis
                ];
            }
        }
        return item;
    };


    /**
     * Filter data which is out of coordinateSystem range
     * [dataFilter description]
     * @param  {module:echarts/coord/*} [coordSys]
     * @param  {Object} item
     * @return {boolean}
     */
    var dataFilter = function (coordSys, item) {
        // Alwalys return true if there is no coordSys
        return (coordSys && item.coord && (item.x == null || item.y == null))
            ? coordSys.containData(item.coord) : true;
    };

    var dimValueGetter = function (item, dimName, dataIndex, dimIndex) {
        // x, y, radius, angle
        if (dimIndex < 2) {
            return item.coord && item.coord[dimIndex];
        }
        else {
            item.value;
        }
    };

    return {
        dataTransform: dataTransform,
        dataFilter: dataFilter,
        dimValueGetter: dimValueGetter
    };
});