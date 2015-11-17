define(function (require) {

    var SeriesModel = require('../../model/Series');
    var SymbolDraw = require('../../chart/helper/SymbolDraw');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../../util/format');

    var addCommas = formatUtil.addCommas;
    var encodeHTML = formatUtil.encodeHTML;

    var List = require('../../data/List');

    var markerHelper = require('./markerHelper');

    // FIXME
    var seriesModelProto = SeriesModel.prototype;
    var markPointFormatMixin = {
        getDataParams: seriesModelProto.getDataParams,

        getFormattedLabel: seriesModelProto.getFormattedLabel,

        formatTooltip: function (dataIndex) {
            var data = this._data;
            var value = data.getRawValue(dataIndex);
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

        _renderSeriesMP: function (seriesModel, mpModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            var seriesName = seriesModel.name;
            var seriesData = seriesModel.getData();

            var symbolDrawMap = this._symbolDrawMap;
            var symbolDraw = symbolDrawMap[seriesName];
            if (!symbolDraw) {
                symbolDraw = symbolDrawMap[seriesName] = new SymbolDraw();
            }

            var mpData = createList(coordSys, seriesData, mpModel);
            var dims = coordSys.dimensions;

            // Overwrite getRawValue
            // FIXME
            mpData.getRawValue = function (idx) {
                var option = this.getItemModel(idx).option;
                return zrUtil.retrieve(option.__rawValue, option.value, '');
            };
            // FIXME
            zrUtil.mixin(mpModel, markPointFormatMixin);
            mpModel.setData(mpData);

            mpData.each(function (idx) {
                var itemModel = mpData.getItemModel(idx);
                var point;
                var xPx = itemModel.getShallow('x');
                var yPx = itemModel.getShallow('y');
                if (xPx != null && yPx != null) {
                    point = [xPx, yPx];
                }
                else {
                    var x = mpData.get(dims[0], idx);
                    var y = mpData.get(dims[1], idx);
                    point = coordSys.dataToPoint([x, y]);
                }

                mpData.setItemLayout(idx, point);

                mpData.setItemVisual(idx, {
                    symbolSize: itemModel.getShallow('symbolSize'),
                    color: itemModel.get('itemStyle.normal.color')
                        || seriesData.getVisual('color'),
                    symbol: itemModel.getShallow('symbol')
                });
            });

            // TODO Text are wrong
            symbolDraw.updateData(
                mpData, mpModel, api, true
            );
            this.group.add(symbolDraw.group);

            // Set host model for tooltip
            // FIXME
            mpData.eachItemGraphicEl(function (el) {
                el.hostModel = mpModel;
            });

            symbolDraw.__keep = true;
        }
    });

    /**
     * @inner
     * @param {module:echarts/coord/*} coordSys
     * @param {module:echarts/data/List} seriesData
     * @param {module:echarts/model/Model} mpModel
     */
    function createList (coordSys, seriesData, mpModel) {
        var dataDimensions = seriesData.dimensions;

        var mpData = new List(zrUtil.map(
            dataDimensions, seriesData.getDimensionInfo, seriesData
        ), mpModel);

        if (coordSys) {
            var coordDimensions = coordSys.dimensions;

            var indexOf = zrUtil.indexOf;
            // FIXME 公用？
            var coordDataIdx = [
                indexOf(dataDimensions, coordDimensions[0]),
                indexOf(dataDimensions, coordDimensions[1])
            ];

            mpData.initData(
                zrUtil.filter(
                    zrUtil.map(mpModel.get('data'), zrUtil.curry(
                        markerHelper.dataTransform, seriesData, coordSys
                    )),
                    zrUtil.curry(
                        markerHelper.dataFilter, coordSys, coordDataIdx
                    )
                )
            );
        }

        return mpData;
    }
});