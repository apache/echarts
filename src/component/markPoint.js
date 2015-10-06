// HINT Markpoint can't be used too much

define(function (require) {

    var DataSymbol = require('../chart/helper/DataSymbol');
    var zrUtil = require('zrender/core/util');

    var List = require('../data/List');

    require('./marker/MarkPointModel');

    require('../echarts').extendComponentView({

        type: 'markPoint',

        init: function () {
            this._dataSymbolMap = {};
        },

        render: function (markPointModel, ecModel) {
            var dataSymbolMap = this._dataSymbolMap;
            for (var name in dataSymbolMap) {
                dataSymbolMap[name].__keep = false;
            }

            ecModel.eachSeries(function (seriesModel) {
                var mpModel = seriesModel.markPointModel;
                mpModel && this._renderSeriesMP(seriesModel, mpModel);
            }, this);

            for (var name in dataSymbolMap) {
                if (!dataSymbolMap[name].__keep) {
                    dataSymbolMap[name].remove();
                    this.group.remove(dataSymbolMap[name].group);
                }
            }
        },

        _renderSeriesMP: function (seriesModel, mpModel) {
            var coordSys = seriesModel.coordinateSystem;
            var seriesName = seriesModel.name;
            var seriesData = seriesModel.getData();

            var dataSymbolMap = this._dataSymbolMap;
            var dataSymbol = dataSymbolMap[seriesName];
            if (!dataSymbol) {
                dataSymbol = dataSymbolMap[seriesName] = new DataSymbol();
            }

            var mpData = createList(coordSys, seriesData, mpModel);

            mpData.each(['x', 'y'], function (x, y, idx) {
                var itemModel = mpData.getItemModel(idx);

                var xPx = itemModel.getShallow('x');
                var yPx = itemModel.getShallow('y');

                var point = (xPx != null && yPx != null) ? [xPx, yPx] : coordSys.dataToPoint([x, y]);

                mpData.setItemLayout(idx, point);

                mpData.setItemVisual(idx, {
                    symbolSize: itemModel.getShallow('symbolSize'),
                    color: itemModel.get('itemStyle.normal.color')
                        || seriesData.getVisual('color'),
                    symbol: itemModel.getShallow('symbol')
                });
            });

            // TODO Text are wrong
            dataSymbol.updateData(mpData, true);

            this.group.add(dataSymbol.group);

            dataSymbol.__keep = true;
        }
    });

    var markPointTypeCalculatorWithExtent = function (percent, data, baseAxisDim, valueAxisDim) {
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

    var markPointTypeCalculator = {
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        min: zrUtil.curry(markPointTypeCalculatorWithExtent, 0),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        max: zrUtil.curry(markPointTypeCalculatorWithExtent, 1),
        /**
         * @method
         * @param {module:echarts/data/List} data
         * @param {string} baseAxisDim
         * @param {string} valueAxisDim
         */
        average: zrUtil.curry(markPointTypeCalculatorWithExtent, 0.5)
    };

    var dataTransform = function (data, baseAxis, valueAxis, item) {
        // If not specify the position with pixel directly
        if (isNaN(item.x) || isNaN(item.y) && !zrUtil.isArray(item.value)) {
            // Clone the option
            // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
            // Competitable with 2.x
            item = zrUtil.extend({}, item);

            // Special types, Compatible with 2.0
            if (item.type && markPointTypeCalculator[item.type]
                && baseAxis && valueAxis) {
                var value = markPointTypeCalculator[item.type](
                    data, baseAxis.dim, valueAxis.dim
                );
                value.push(+item.value);
                item.value = value;
            }
            else if (!isNaN(item.value)) {
                // FIXME Only has one of xAxis and yAxis.
                item.value = [
                    item.xAxis || item.radiusAxis,
                    item.yAxis || item.angleAxis,
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

    /**
     * @inner
     * @param {module:echarts/coord/*} coordSys
     * @param {module:echarts/data/List} seriesData
     * @param {module:echarts/model/Model} mpModel
     */
    var createList = function (coordSys, seriesData, mpModel) {
        var baseAxis = coordSys && coordSys.getBaseAxis();
        var valueAxis = coordSys && coordSys.getOtherAxis(baseAxis);
        var dimensions = seriesData.dimensions.slice();
        // Polar and cartesian with category axis may have dimensions inversed
        var dimensionInverse = dimensions[0] === 'y' || dimensions[0] === 'angle';
        if (dimensionInverse) {
            dimensions.inverse();
        }

        var mpData = new List(zrUtil.map(
            dimensions, seriesData.getDimensionInfo, seriesData
        ), mpModel);

        mpData.initData(
            zrUtil.filter(
                zrUtil.map(mpModel.get('data'), zrUtil.curry(
                    dataTransform, seriesData, baseAxis, valueAxis
                )),
                zrUtil.curry(dataFilter, coordSys, dimensionInverse)
            )
        );

        return mpData;
    };
});