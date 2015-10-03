define(function (require) {

    var DataSymbol = require('../chart/helper/DataSymbol');

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
            var dataSymbolMap = this._dataSymbolMap;
            var seriesName = seriesModel.name;
            var dataSymbol = dataSymbolMap[seriesName];
            if (!dataSymbol) {
                dataSymbol = dataSymbolMap[seriesName] = new DataSymbol();
                this.group.add(dataSymbol.group);
            }

            var seriesData = seriesModel.getData();
            var data = mpModel.getData();

            var coordSys = seriesModel.coordinateSystem;

            // FIXME Put visual out
            data.each(['x', 'y'], function (x, y, idx) {
                var itemModel = data.getItemModel(idx);
                var xPx = itemModel.getShallow('x');
                var yPx = itemModel.getShallow('y');
                var point = (xPx != null && yPx != null) ? [xPx, yPx] : coordSys.dataToPoint([x, y]);
                data.setItemLayout(idx, point);

                data.setItemVisual(idx, {
                    symbolSize: itemModel.getShallow('symbolSize'),
                    color: itemModel.get('itemStyle.normal.color')
                        || seriesData.getVisual('color')
                });
            });

            dataSymbol.updateData(data, true);

            dataSymbol.__keep = true;
        }
    });
});