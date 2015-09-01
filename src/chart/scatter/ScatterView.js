define(function (require) {

    require('../../echarts').extendChartView({

        type: 'scatter',

        render: function (seriesModel, ecModel, api) {
            this._renderSymbols(seriesModel, ecModel, api);
        },

        _renderSymbols: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();

            var group = this.group;

            data.diff(this._data)
                .add(function (dataItem) {
                    // 空数据
                    // TODO
                    // if (dataItem.getValue() == null) {
                    //     return;
                    // }

                    var layout = dataItem.layout;
                    // var normalItemStyle = dataItem.getModel('itemStyle.normal');

                    var symbolSize = dataItem.getVisual('symbolSize');
                    var symbolType = dataItem.getVisual('symbol') || 'circle';
                    var symbolShape = api.createSymbol(symbolType, -0.5, -0.5, 1, 1);

                    symbolShape.scale = [0.1, 0.1];
                    symbolShape.position = [layout.x, layout.y];

                    symbolShape.style.set({
                        fill: dataItem.getVisual('color')
                    });

                    symbolShape.animate()
                        .when(500, {
                            scale: [symbolSize, symbolSize]
                        })
                        .start();

                    dataItem.__el = symbolShape;

                    group.add(symbolShape);
                })
                .update(function (newData, oldData) {
                    var symbolSize = newData.getVisual('symbolSize');
                    var layout = newData.layout;
                    var el = oldData.__el;
                    el.stopAnimation();
                    // 空数据
                    // TODO
                    // if (newData.getValue() == null) {
                    //     group.remove(oldData.__el);
                    //     return;
                    // }
                    el.animate()
                        .when(500, {
                            scale: [symbolSize, symbolSize],
                            position: [layout.x, layout.y]
                        })
                        .start('cubicOut');
                    newData.__el = el;

                    // Add back
                    group.add(el);
                })
                .remove(function (dataItem) {
                    if (dataItem.__el) {
                        group.remove(dataItem.__el);
                    }
                })
                .execute();

            this._data = data;
        },

        remove: function () {
            if (this._data) {
                var group = this.group;
                this._data.each(function (dataItem) {
                    var el = dataItem.__el;
                    el.stopAnimation();
                    el.animate()
                        .when(200, {
                            scale: [0, 0]
                        })
                        .done(function () {
                            group.remove(dataItem.__el);
                        })
                        .start('cubicOut');
                });
            }
        }
    });
});