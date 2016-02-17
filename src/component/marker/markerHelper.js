define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var indexOf = zrUtil.indexOf;

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
        mlType, data, baseDataDim, valueDataDim, baseCoordIndex, valueCoordIndex
    ) {
        var coordArr = [];
        var value = mlType === 'average'
            ? data.getSum(valueDataDim, true) / data.count()
            : data.getDataExtent(valueDataDim, true)[mlType === 'max' ? 1 : 0];

        var dataIndex = data.indexOfNearest(valueDataDim, value, true);
        coordArr[baseCoordIndex] = data.get(baseDataDim, dataIndex, true);
        coordArr[valueCoordIndex] = data.get(valueDataDim, dataIndex, true);

        var precision = getPrecision(data, valueDataDim, dataIndex);
        if (precision >= 0) {
            coordArr[valueCoordIndex] = +coordArr[valueCoordIndex].toFixed(precision);
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
    var dataTransform = function (seriesModel, item) {
        var data = seriesModel.getData();
        var coordSys = seriesModel.coordinateSystem;

        // 1. If not specify the position with pixel directly
        // 2. If `coord` is not a data array. Which uses `xAxis`,
        // `yAxis` to specify the coord on each dimension
        if ((isNaN(item.x) || isNaN(item.y))
            && !zrUtil.isArray(item.coord)
            && coordSys
        ) {
            var baseAxis;
            var baseDataDim;
            var valueDataDim;
            var valueAxis;

            if (item.valueIndex != null || item.valueDim != null) {
                valueDataDim = item.valueIndex != null
                    ? data.getDimension(item.valueIndex) : item.valueDim;
                valueAxis = coordSys.getAxis(seriesModel.getCoordDimensionInfo(valueDataDim).name);
                baseAxis = coordSys.getOtherAxis(valueAxis);
                baseDataDim = seriesModel.getDimensionsOnAxis(baseAxis.dim)[0];
            }
            else {
                baseAxis = seriesModel.getBaseAxis();
                valueAxis = coordSys.getOtherAxis(baseAxis);
                baseDataDim = seriesModel.getDimensionsOnAxis(baseAxis.dim)[0];
                valueDataDim = seriesModel.getDimensionsOnAxis(valueAxis.dim)[0];
            }

            // Clone the option
            // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
            item = zrUtil.clone(item);

            if (item.type && markerTypeCalculator[item.type] && baseAxis && valueAxis) {
                var dims = coordSys.dimensions;
                var baseCoordIndex = indexOf(dims, baseAxis.dim);
                var valueCoordIndex = indexOf(dims, valueAxis.dim);

                item.coord = markerTypeCalculator[item.type](
                    data, baseDataDim, valueDataDim, baseCoordIndex, valueCoordIndex
                );
                // Force to use the value of calculated value.
                item.value = item.coord[valueCoordIndex];
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