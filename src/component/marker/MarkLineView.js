define(function (require) {

    var zrUtil = require('zrender/core/util');
    var List = require('../../data/List');

    var markerHelper = require('./markerHelper');

    var SeriesMarkLine = require('./SeriesMarkLine');

    var markLineTransform = function (data, baseAxis, valueAxis, item) {
        // Special type markLine like 'min', 'max', 'average'
        var mlType = item.type;
        if (!zrUtil.isArray(item)
            && mlType === 'min' || mlType === 'max' || mlType === 'average'
            ) {
            var baseAxisKey = baseAxis.dim + 'Axis';
            var valueAxisKey = valueAxis.dim + 'Axis';
            var baseScaleExtent = baseAxis.scale.getExtent();

            var mlFrom = zrUtil.extend({}, item);
            var mlTo = {};

            var extent = data.getDataExtent(valueAxis.dim, true);

            delete mlFrom.type; // Remove type

            mlFrom[baseAxisKey] = baseScaleExtent[0];
            mlTo[baseAxisKey] = baseScaleExtent[1];

            var percent = mlType === 'average' ?
                0.5 : (mlType === 'max' ? 1 : 0);

            var value = (extent[1] - extent[0]) * percent + extent[0];

            mlFrom[valueAxisKey] = mlTo[valueAxisKey] = value;

            item = [
                mlFrom,
                mlTo
            ];
        };
        return [
            markerHelper.dataTransform(data, baseAxis, valueAxis, item[0]),
            markerHelper.dataTransform(data, baseAxis, valueAxis, item[1])
        ];
    };

    function markLineFilter(coordSys, dimensionInverse, item) {
        return markerHelper.dataFilter(coordSys, dimensionInverse, item[0])
            && markerHelper.dataFilter(coordSys, dimensionInverse, item[1]);
    }

    require('../../echarts').extendComponentView({

        type: 'markLine',

        init: function () {
            /**
             * Markline grouped by series
             * @private
             * @type {Object}
             */
            this._markLineMap = {};
        },

        render: function (markLineModel, ecModel) {
            var seriesMarkLineMap = this._markLineMap;
            for (var name in seriesMarkLineMap) {
                seriesMarkLineMap[name].__keep = false;
            }

            ecModel.eachSeries(function (seriesModel) {
                var mlModel = seriesModel.markLineModel;
                mlModel && this._renderSeriesML(seriesModel, mlModel);
            }, this);

            for (var name in seriesMarkLineMap) {
                if (!seriesMarkLineMap[name].__keep) {
                    this.group.remove(seriesMarkLineMap[name].group);
                }
            }
        },

        _renderSeriesML: function (seriesModel, mlModel) {
            var coordSys = seriesModel.coordinateSystem;
            var seriesName = seriesModel.name;
            var seriesData = seriesModel.getData();

            var seriesMarkLineMap = this._markLineMap;
            var seriesMarkLine = seriesMarkLineMap[seriesName];
            if (!seriesMarkLine) {
                seriesMarkLine = seriesMarkLineMap[seriesName] = new SeriesMarkLine();
            }
            this.group.add(seriesMarkLine.group);

            var mlData = createList(coordSys, seriesData, mlModel)
            var dims = mlData.from.dimensions.slice(0, 2);

            var fromData = mlData.from;
            var toData = mlData.to;

            var symbolType = mlModel.get('symbol');
            var symbolSize = mlModel.get('symbolSize');
            if (!zrUtil.isArray(symbolType)) {
                symbolType = [symbolType, symbolType];
            }
            if (typeof (+symbolSize) === 'number') {
                symbolSize = [symbolSize, symbolSize];
            }

            mlData.from.each(function (idx) {
                updateDataVisualAndLayout(fromData, idx, true);
                updateDataVisualAndLayout(toData, idx);
            });

            seriesMarkLine.update(fromData, toData);

            function updateDataVisualAndLayout(data, idx, isFrom) {
                var itemModel = data.getItemModel(idx);

                var point;
                var xPx = itemModel.get('x');
                var yPx = itemModel.get('y');
                if (xPx != null && yPx != null) {
                    point = [xPx, yPx];
                }
                else {
                    var x = data.get(dims[0], idx);
                    var y = data.get(dims[1], idx);
                    point = coordSys.dataToPoint([x, y]);
                }

                data.setItemLayout(idx, point);

                data.setItemVisual(idx, {
                    symbolSize: itemModel.get('symbolSize')
                        || symbolSize[isFrom ? 0 : 1],
                    symbol: itemModel.get('symbol', true)
                        || symbolType[isFrom ? 0 : 1],
                    color: itemModel.get('itemStyle.normal.color')
                        || seriesData.getVisual('color')
                });
            }

            seriesMarkLine.__keep = true;
        }
    });

    /**
     * @inner
     * @param {module:echarts/coord/*} coordSys
     * @param {module:echarts/data/List} seriesData
     * @param {module:echarts/model/Model} mpModel
     */
    function createList(coordSys, seriesData, mlModel) {
        var baseAxis = coordSys && coordSys.getBaseAxis();
        var valueAxis = coordSys && coordSys.getOtherAxis(baseAxis);
        var dimensions = seriesData.dimensions.slice();
        // Polar and cartesian with category axis may have dimensions inversed
        var dimensionInverse = dimensions[0] === 'y' || dimensions[0] === 'angle';
        if (dimensionInverse) {
            dimensions.inverse();
        }

        var dimensionInfosMap = zrUtil.map(
            dimensions, seriesData.getDimensionInfo, seriesData
            );
        var fromData = new List(dimensionInfosMap, mlModel);
        var toData = new List(dimensionInfosMap, mlModel);

        var optData = zrUtil.filter(
            zrUtil.map(mlModel.get('data'), zrUtil.curry(
                markLineTransform, seriesData, baseAxis, valueAxis
                )),
            zrUtil.curry(
                markLineFilter, coordSys, dimensionInverse
                )
            );
        fromData.initData(
            zrUtil.map(optData, function (item) { return item[0]; })
            );
        toData.initData(
            zrUtil.map(optData, function (item) { return item[1]; })
            );

        return {
            from: fromData,
            to: toData
        };
    };
});