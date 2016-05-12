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

    var markLineTransform = function (seriesModel, coordSys, mlModel, item) {
        var data = seriesModel.getData();
        // Special type markLine like 'min', 'max', 'average'
        var mlType = item.type;

        if (!zrUtil.isArray(item)
            && (
                mlType === 'min' || mlType === 'max' || mlType === 'average'
                // In case
                // data: [{
                //   yAxis: 10
                // }]
                || (item.xAxis != null || item.yAxis != null)
            )
        ) {
            var valueAxis;
            var valueDataDim;
            var value;

            if (item.yAxis != null || item.xAxis != null) {
                valueDataDim = item.yAxis != null ? 'y' : 'x';
                valueAxis = coordSys.getAxis(valueDataDim);

                value = zrUtil.retrieve(item.yAxis, item.xAxis);
            }
            else {
                var axisInfo = markerHelper.getAxisInfo(item, data, coordSys, seriesModel);
                valueDataDim = axisInfo.valueDataDim;
                valueAxis = axisInfo.valueAxis;
                value = markerHelper.numCalculate(data, valueDataDim, mlType);
            }
            var valueIndex = valueDataDim === 'x' ? 0 : 1;
            var baseIndex = 1 - valueIndex;

            var mlFrom = zrUtil.clone(item);
            var mlTo = {};

            mlFrom.type = null;

            mlFrom.coord = [];
            mlTo.coord = [];
            mlFrom.coord[baseIndex] = -Infinity;
            mlTo.coord[baseIndex] = Infinity;

            var precision = mlModel.get('precision');
            if (precision >= 0) {
                value = +value.toFixed(precision);
            }

            mlFrom.coord[valueIndex] = mlTo.coord[valueIndex] = value;

            item = [mlFrom, mlTo, { // Extra option for tooltip and label
                type: mlType,
                valueIndex: item.valueIndex,
                // Force to use the value of calculated value.
                value: value
            }];
        }

        item = [
            markerHelper.dataTransform(seriesModel, item[0]),
            markerHelper.dataTransform(seriesModel, item[1]),
            zrUtil.extend({}, item[2])
        ];

        // Avoid line data type is extended by from(to) data type
        item[2].type = item[2].type || '';

        // Merge from option and to option into line option
        zrUtil.merge(item[2], item[0]);
        zrUtil.merge(item[2], item[1]);

        return item;
    };

    function isInifinity(val) {
        return !isNaN(val) && !isFinite(val);
    }

    // If a markLine has one dim
    function ifMarkLineHasOnlyDim(dimIndex, fromCoord, toCoord, coordSys) {
        var otherDimIndex = 1 - dimIndex;
        var dimName = coordSys.dimensions[dimIndex];
        return isInifinity(fromCoord[otherDimIndex]) && isInifinity(toCoord[otherDimIndex])
            && fromCoord[dimIndex] === toCoord[dimIndex] && coordSys.getAxis(dimName).containData(fromCoord[dimIndex]);
    }

    function markLineFilter(coordSys, item) {
        if (coordSys.type === 'cartesian2d') {
            var fromCoord = item[0].coord;
            var toCoord = item[1].coord;
            // In case
            // {
            //  markLine: {
            //    data: [{ yAxis: 2 }]
            //  }
            // }
            if (
                ifMarkLineHasOnlyDim(1, fromCoord, toCoord, coordSys)
                || ifMarkLineHasOnlyDim(0, fromCoord, toCoord, coordSys)
            ) {
                return true;
            }
        }
        return markerHelper.dataFilter(coordSys, item[0])
            && markerHelper.dataFilter(coordSys, item[1]);
    }

    function updateSingleMarkerEndLayout(
        data, idx, isFrom, mlType, valueIndex, seriesModel, api
    ) {
        var coordSys = seriesModel.coordinateSystem;
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
            // Chart like bar may have there own marker positioning logic
            if (seriesModel.getMarkerPosition) {
                // Use the getMarkerPoisition
                point = seriesModel.getMarkerPosition(
                    data.getValues(data.dimensions, idx)
                );
            }
            else {
                var dims = coordSys.dimensions;
                var x = data.get(dims[0], idx);
                var y = data.get(dims[1], idx);
                point = coordSys.dataToPoint([x, y]);
            }
            // Expand line to the edge of grid if value on one axis is Inifnity
            // In case
            //  markLine: {
            //    data: [{
            //      yAxis: 2
            //      // or
            //      type: 'average'
            //    }]
            //  }
            if (coordSys.type === 'cartesian2d') {
                var xAxis = coordSys.getAxis('x');
                var yAxis = coordSys.getAxis('y');
                var dims = coordSys.dimensions;
                if (isInifinity(data.get(dims[0], idx))) {
                    point[0] = xAxis.toGlobalCoord(xAxis.getExtent()[isFrom ? 0 : 1]);
                }
                else if (isInifinity(data.get(dims[1], idx))) {
                    point[1] = yAxis.toGlobalCoord(yAxis.getExtent()[isFrom ? 0 : 1]);
                }
            }
        }

        data.setItemLayout(idx, point);
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

        updateLayout: function (markLineModel, ecModel, api) {
            ecModel.eachSeries(function (seriesModel) {
                var mlModel = seriesModel.markLineModel;
                if (mlModel) {
                    var mlData = mlModel.getData();
                    var fromData = mlModel.__from;
                    var toData = mlModel.__to;
                    // Update visual and layout of from symbol and to symbol
                    fromData.each(function (idx) {
                        var lineModel = mlData.getItemModel(idx);
                        var mlType = lineModel.get('type');
                        var valueIndex = lineModel.get('valueIndex');
                        updateSingleMarkerEndLayout(fromData, idx, true, mlType, valueIndex, seriesModel, api);
                        updateSingleMarkerEndLayout(toData, idx, false, mlType, valueIndex, seriesModel, api);
                    });
                    // Update layout of line
                    mlData.each(function (idx) {
                        mlData.setItemLayout(idx, [
                            fromData.getItemLayout(idx),
                            toData.getItemLayout(idx)
                        ]);
                    });

                    this._markLineMap[seriesModel.name].updateLayout();
                }
            }, this);
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

            var mlData = createList(coordSys, seriesModel, mlModel);

            var fromData = mlData.from;
            var toData = mlData.to;
            var lineData = mlData.line;

            mlModel.__from = fromData;
            mlModel.__to = toData;
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
                var lineModel = lineData.getItemModel(idx);
                var mlType = lineModel.get('type');
                var valueIndex = lineModel.get('valueIndex');
                updateDataVisualAndLayout(fromData, idx, true, mlType, valueIndex);
                updateDataVisualAndLayout(toData, idx, false, mlType, valueIndex);
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

                lineData.setItemVisual(idx, {
                    'fromSymbolSize': fromData.getItemVisual(idx, 'symbolSize'),
                    'fromSymbol': fromData.getItemVisual(idx, 'symbol'),
                    'toSymbolSize': toData.getItemVisual(idx, 'symbolSize'),
                    'toSymbol': toData.getItemVisual(idx, 'symbol')
                });
            });

            lineDraw.updateData(lineData);

            // Set host model for tooltip
            // FIXME
            mlData.line.eachItemGraphicEl(function (el, idx) {
                el.traverse(function (child) {
                    child.dataModel = mlModel;
                });
            });

            function updateDataVisualAndLayout(data, idx, isFrom, mlType, valueIndex) {
                var itemModel = data.getItemModel(idx);

                updateSingleMarkerEndLayout(
                    data, idx, isFrom, mlType, valueIndex, seriesModel, api
                );

                data.setItemVisual(idx, {
                    symbolSize: itemModel.get('symbolSize') || symbolSize[isFrom ? 0 : 1],
                    symbol: itemModel.get('symbol', true) || symbolType[isFrom ? 0 : 1],
                    color: itemModel.get('itemStyle.normal.color') || seriesData.getVisual('color')
                });
            }

            lineDraw.__keep = true;
        }
    });

    /**
     * @inner
     * @param {module:echarts/coord/*} coordSys
     * @param {module:echarts/model/Series} seriesModel
     * @param {module:echarts/model/Model} mpModel
     */
    function createList(coordSys, seriesModel, mlModel) {

        var coordDimsInfos;
        if (coordSys) {
            coordDimsInfos = zrUtil.map(coordSys && coordSys.dimensions, function (coordDim) {
                var info = seriesModel.getData().getDimensionInfo(
                    seriesModel.coordDimToDataDim(coordDim)[0]
                ) || {}; // In map series data don't have lng and lat dimension. Fallback to same with coordSys
                info.name = coordDim;
                return info;
            });
        }
        else {
            coordDimsInfos =[{
                name: 'value',
                type: 'float'
            }];
        }

        var fromData = new List(coordDimsInfos, mlModel);
        var toData = new List(coordDimsInfos, mlModel);
        // No dimensions
        var lineData = new List([], mlModel);

        var optData = zrUtil.map(mlModel.get('data'), zrUtil.curry(
            markLineTransform, seriesModel, coordSys, mlModel
        ));
        if (coordSys) {
            optData = zrUtil.filter(
                optData, zrUtil.curry(markLineFilter, coordSys)
            );
        }
        var dimValueGetter = coordSys ? markerHelper.dimValueGetter : function (item) {
            return item.value;
        };
        fromData.initData(
            zrUtil.map(optData, function (item) { return item[0]; }),
            null, dimValueGetter
        );
        toData.initData(
            zrUtil.map(optData, function (item) { return item[1]; }),
            null, dimValueGetter
        );
        lineData.initData(
            zrUtil.map(optData, function (item) { return item[2]; })
        );
        return {
            from: fromData,
            to: toData,
            line: lineData
        };
    }
});