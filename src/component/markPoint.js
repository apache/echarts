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
        valueArr[valueIndex] = val;
        var dataIndex = data.indexOfNearest(valueAxisDim, val);
        valueArr[1 - valueIndex] = data.get(baseAxisDim, dataIndex);
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

    var dataTransform = function (data, baseAxisDim, valueAxisDim, item) {
        // If not specify the position with pixel directly
        if (isNaN(item.x) || isNaN(item.y) && !zrUtil.isArray(item.value)) {
            // Clone the option
            // Transform the properties xAxis, yAxis, radiusAxis, angleAxis, geoCoord to value
            // Competitable with 2.x
            item = zrUtil.extend({}, item);

            // Special types, Compatible with 2.0
            if (item.type && markPointTypeCalculator[item.type]
                && baseAxisDim && valueAxisDim) {
                var value = markPointTypeCalculator[item.type](
                    data, baseAxisDim, valueAxisDim
                );
                value.push(+item.value);
                item.value = value;
            }
            else if (!isNaN(item.value)) {
                item.value = [
                    item.xAxis || item.radiusAxis,
                    item.yAxis || item.angleAxis,
                    +item.value
                ];
            }
        }
        return item;
    };

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
        if (dimensions[0] === 'y' || dimensions[0] === 'angle') {
            dimensions.inverse();
        }

        var mpData = new List(dimensions, mpModel);
        mpData.initData(zrUtil.map(mpModel.get('data'), zrUtil.curry(
            dataTransform, seriesData, baseAxis && baseAxis.dim, valueAxis && valueAxis.dim
        )));

        return mpData;
    };
});