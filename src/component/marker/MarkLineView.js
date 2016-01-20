define(function (require) {

    var zrUtil = require('zrender/core/util');
    var List = require('../../data/List');
    var formatUtil = require('../../util/format');
    var modelUtil = require('../../util/model');
    var numberUtil = require('../../util/number');

    var addCommas = formatUtil.addCommas;
    var encodeHTML = formatUtil.encodeHTML;

    var markerHelper = require('./markerHelper');

    var LineDraw = require('../../chart/helper/LineDraw');

    var markLineTransform = function (data, coordSys, baseAxis, valueAxis, precision, item) {
        // Special type markLine like 'min', 'max', 'average'
        var mlType = item.type;
        if (!zrUtil.isArray(item)
            && mlType === 'min' || mlType === 'max' || mlType === 'average'
        ) {
            if (item.valueIndex != null) {
                baseAxis = coordSys.getAxis(coordSys.dimensions[1 - item.valueIndex]);
                valueAxis = coordSys.getAxis(coordSys.dimensions[item.valueIndex]);
            }
            var baseAxisKey = baseAxis.dim + 'Axis';
            var valueAxisKey = valueAxis.dim + 'Axis';
            var baseScaleExtent = baseAxis.scale.getExtent();

            var mlFrom = zrUtil.extend({}, item);
            var mlTo = {};

            mlFrom.type = null;

            // FIXME Polar should use circle
            mlFrom[baseAxisKey] = baseScaleExtent[0];
            mlTo[baseAxisKey] = baseScaleExtent[1];

            var value = mlType === 'average'
                ? data.getSum(valueAxis.dim, true) / data.count()
                : data.getDataExtent(valueAxis.dim)[mlType === 'max' ? 1 : 0];

            // Round if axis is cateogry
            value = valueAxis.coordToData(valueAxis.dataToCoord(value));

            mlFrom[valueAxisKey] = mlTo[valueAxisKey] = value;

            item = [mlFrom, mlTo, { // Extra option for tooltip and label
                type: mlType,
                // Force to use the value of calculated value.
                value: +value.toFixed(precision)
            }];
        }
        item = [
            markerHelper.dataTransform(data, coordSys, item[0]),
            markerHelper.dataTransform(data, coordSys, item[1]),
            zrUtil.extend({}, item[2])
        ];

        // Merge from option and to option into line option
        zrUtil.merge(item[2], item[0]);
        zrUtil.merge(item[2], item[1]);

        return item;
    };

    function markLineFilter(coordSys, item) {
        return markerHelper.dataFilter(coordSys, item[0])
            && markerHelper.dataFilter(coordSys, item[1]);
    }

    var markLineFormatMixin = {
        formatTooltip: function (dataIndex) {
            var data = this._data;
            var value = this.getRawValue(dataIndex);
            var formattedValue = zrUtil.isArray(value)
                ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
            var name = data.getName(dataIndex);
            return this.name + '<br />'
                + ((name ? encodeHTML(name) + ' : ' : '') + formattedValue);
        },

        getRawDataArray: function () {
            return this.option.data;
        },

        getData: function () {
            return this._data;
        },

        setData: function (data) {
            this._data = data;
        }
    };

    zrUtil.defaults(markLineFormatMixin, modelUtil.dataFormatMixin);

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

        render: function (markLineModel, ecModel, api) {
            var lineDrawMap = this._markLineMap;
            for (var name in lineDrawMap) {
                lineDrawMap[name].__keep = false;
            }

            ecModel.eachSeries(function (seriesModel) {
                var mlModel = seriesModel.markLineModel;
                mlModel && this._renderSeriesML(seriesModel, mlModel, ecModel, api);
            }, this);

            for (var name in lineDrawMap) {
                if (!lineDrawMap[name].__keep) {
                    this.group.remove(lineDrawMap[name].group);
                }
            }
        },

        _renderSeriesML: function (seriesModel, mlModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            var seriesName = seriesModel.name;
            var seriesData = seriesModel.getData();

            var lineDrawMap = this._markLineMap;
            var lineDraw = lineDrawMap[seriesName];
            if (!lineDraw) {
                lineDraw = lineDrawMap[seriesName] = new LineDraw();
            }
            this.group.add(lineDraw.group);

            var mlData = createList(coordSys, seriesData, mlModel);
            var dims = coordSys.dimensions;

            var fromData = mlData.from;
            var toData = mlData.to;
            var lineData = mlData.line;

            // Line data for tooltip and formatter
            zrUtil.extend(mlModel, markLineFormatMixin);
            mlModel.setData(lineData);

            var symbolType = mlModel.get('symbol');
            var symbolSize = mlModel.get('symbolSize');
            if (!zrUtil.isArray(symbolType)) {
                symbolType = [symbolType, symbolType];
            }
            if (typeof symbolSize === 'number') {
                symbolSize = [symbolSize, symbolSize];
            }

            // Update visual and layout of from symbol and to symbol
            mlData.from.each(function (idx) {
                updateDataVisualAndLayout(fromData, idx, true);
                updateDataVisualAndLayout(toData, idx);
            });

            // Update visual and layout of line
            lineData.each(function (idx) {
                var lineColor = lineData.getItemModel(idx).get('lineStyle.normal.color');
                lineData.setItemVisual(idx, {
                    color: lineColor || fromData.getItemVisual(idx, 'color')
                });
                lineData.setItemLayout(idx, [
                    fromData.getItemLayout(idx),
                    toData.getItemLayout(idx)
                ]);
            });

            lineDraw.updateData(lineData, fromData, toData);

            // Set host model for tooltip
            // FIXME
            mlData.line.eachItemGraphicEl(function (el, idx) {
                el.traverse(function (child) {
                    child.hostModel = mlModel;
                });
            });

            function updateDataVisualAndLayout(data, idx, isFrom) {
                var itemModel = data.getItemModel(idx);

                var point;
                var xPx = itemModel.get('x');
                var yPx = itemModel.get('y');
                if (xPx != null && yPx != null) {
                    point = [
                        numberUtil.parsePercent(xPx, api.getWidth()),
                        numberUtil.parsePercent(yPx, api.getHeight())
                    ];
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

            lineDraw.__keep = true;
        }
    });

    /**
     * @inner
     * @param {module:echarts/coord/*} coordSys
     * @param {module:echarts/data/List} seriesData
     * @param {module:echarts/model/Model} mpModel
     */
    function createList(coordSys, seriesData, mlModel) {
        // var dataDimensions = seriesData.dimensions;
        // var dimensionInfosMap = zrUtil.map(
        //         dataDimensions, seriesData.getDimensionInfo, seriesData
        //     );

        // Mark line get the dimensions from coordinate system
        // Because user specify the data by xAxis, yAxis
        var dimensions = coordSys.dimensions;
        var fromData = new List(dimensions, mlModel);
        var toData = new List(dimensions, mlModel);
        // No dimensions
        var lineData = new List([], mlModel);

        if (coordSys) {
            var baseAxis = coordSys.getBaseAxis();
            var valueAxis = coordSys.getOtherAxis(baseAxis);
            var precision = mlModel.get('precision');

            var optData = zrUtil.filter(
                zrUtil.map(mlModel.get('data'), zrUtil.curry(
                    markLineTransform, seriesData, coordSys, baseAxis, valueAxis, precision
                )),
                zrUtil.curry(markLineFilter, coordSys)
            );
            fromData.initData(
                zrUtil.map(optData, function (item) { return item[0]; }),
                null,
                markerHelper.dimValueGetter
            );
            toData.initData(
                zrUtil.map(optData, function (item) { return item[1]; }),
                null,
                markerHelper.dimValueGetter
            );
            lineData.initData(
                zrUtil.map(optData, function (item) { return item[2]; })
            );

        }
        return {
            from: fromData,
            to: toData,
            line: lineData
        };
    }
});