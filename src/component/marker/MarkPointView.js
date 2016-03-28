define(function (require) {

    var SymbolDraw = require('../../chart/helper/SymbolDraw');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../../util/format');
    var modelUtil = require('../../util/model');
    var numberUtil = require('../../util/number');

    var addCommas = formatUtil.addCommas;
    var encodeHTML = formatUtil.encodeHTML;

    var List = require('../../data/List');

    var markerHelper = require('./markerHelper');

    function updateMarkerLayout(mpData, seriesModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        mpData.each(function (idx) {
            var itemModel = mpData.getItemModel(idx);
            var point;
            var xPx = itemModel.getShallow('x');
            var yPx = itemModel.getShallow('y');
            if (xPx != null && yPx != null) {
                point = [
                    numberUtil.parsePercent(xPx, api.getWidth()),
                    numberUtil.parsePercent(yPx, api.getHeight())
                ];
            }
            // Chart like bar may have there own marker positioning logic
            else if (seriesModel.getMarkerPosition) {
                // Use the getMarkerPoisition
                point = seriesModel.getMarkerPosition(
                    mpData.getValues(mpData.dimensions, idx)
                );
            }
            else if (coordSys) {
                var x = mpData.get(coordSys.dimensions[0], idx);
                var y = mpData.get(coordSys.dimensions[1], idx);
                point = coordSys.dataToPoint([x, y]);
            }

            mpData.setItemLayout(idx, point);
        });
    }

    // FIXME
    var markPointFormatMixin = {
        getRawDataArray: function () {
            return this.option.data;
        },

        formatTooltip: function (dataIndex) {
            var data = this.getData();
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

    zrUtil.defaults(markPointFormatMixin, modelUtil.dataFormatMixin);

    require('../../echarts').extendComponentView({

        type: 'markPoint',

        init: function () {
            this._symbolDrawMap = {};
        },

        render: function (markPointModel, ecModel, api) {
            var symbolDrawMap = this._symbolDrawMap;
            for (var name in symbolDrawMap) {
                symbolDrawMap[name].__keep = false;
            }

            ecModel.eachSeries(function (seriesModel) {
                var mpModel = seriesModel.markPointModel;
                mpModel && this._renderSeriesMP(seriesModel, mpModel, api);
            }, this);

            for (var name in symbolDrawMap) {
                if (!symbolDrawMap[name].__keep) {
                    symbolDrawMap[name].remove();
                    this.group.remove(symbolDrawMap[name].group);
                }
            }
        },

        updateLayout: function (markPointModel, ecModel, api) {
            ecModel.eachSeries(function (seriesModel) {
                var mpModel = seriesModel.markPointModel;
                if (mpModel) {
                    updateMarkerLayout(mpModel.getData(), seriesModel, api);
                    this._symbolDrawMap[seriesModel.name].updateLayout(mpModel);
                }
            }, this);
        },

        _renderSeriesMP: function (seriesModel, mpModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            var seriesName = seriesModel.name;
            var seriesData = seriesModel.getData();

            var symbolDrawMap = this._symbolDrawMap;
            var symbolDraw = symbolDrawMap[seriesName];
            if (!symbolDraw) {
                symbolDraw = symbolDrawMap[seriesName] = new SymbolDraw();
            }

            var mpData = createList(coordSys, seriesModel, mpModel);

            // FIXME
            zrUtil.mixin(mpModel, markPointFormatMixin);
            mpModel.setData(mpData);

            updateMarkerLayout(mpModel.getData(), seriesModel, api);

            mpData.each(function (idx) {
                var itemModel = mpData.getItemModel(idx);
                var symbolSize = itemModel.getShallow('symbolSize');
                if (typeof symbolSize === 'function') {
                    // FIXME 这里不兼容 ECharts 2.x，2.x 貌似参数是整个数据？
                    symbolSize = symbolSize(
                        mpModel.getRawValue(idx), mpModel.getDataParams(idx)
                    );
                }
                mpData.setItemVisual(idx, {
                    symbolSize: symbolSize,
                    color: itemModel.get('itemStyle.normal.color')
                        || seriesData.getVisual('color'),
                    symbol: itemModel.getShallow('symbol')
                });
            });

            // TODO Text are wrong
            symbolDraw.updateData(mpData);
            this.group.add(symbolDraw.group);

            // Set host model for tooltip
            // FIXME
            mpData.eachItemGraphicEl(function (el) {
                el.traverse(function (child) {
                    child.dataModel = mpModel;
                });
            });

            symbolDraw.__keep = true;
        }
    });

    /**
     * @inner
     * @param {module:echarts/coord/*} [coordSys]
     * @param {module:echarts/model/Series} seriesModel
     * @param {module:echarts/model/Model} mpModel
     */
    function createList(coordSys, seriesModel, mpModel) {
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

        var mpData = new List(coordDimsInfos, mpModel);
        var dataOpt = zrUtil.map(mpModel.get('data'), zrUtil.curry(
                markerHelper.dataTransform, seriesModel
            ));
        if (coordSys) {
            dataOpt = zrUtil.filter(
                dataOpt, zrUtil.curry(markerHelper.dataFilter, coordSys)
            );
        }

        mpData.initData(dataOpt, null,
            coordSys ? markerHelper.dimValueGetter : function (item) {
                return item.value;
            }
        );
        return mpData;
    }

});