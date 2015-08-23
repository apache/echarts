define(function (require) {

    var Bar = require('../../echarts').extendChartView({

        type: 'bar',

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderCartesian(seriesModel, ecModel, api);
            }

            return this.group;
        },

        _renderCartesian: function (seriesModel, ecModel, api) {
            var group = this.group;
            var data = seriesModel.getData();
            data.diff(this.data)
                .add(function (dataItem) {
                    var rect = new api.Rect({
                        shape: dataItem.layout,
                        style: {
                            fill: dataItem.getVisual('color'),
                            stroke: dataItem.get('itemStyle.normal.borderColor')
                        }
                    });

                    dataItem.__el = rect;
                    rect.__data = dataItem;

                    group.add(rect);
                })
                .update(function (newData, oldData) {
                    // TODO DONT ANIMATE WHEN PROPERTIES ARE EQUAL
                    oldData.__el.animateShape()
                        .when(200, newData.layout)
                        .start();

                    newData.__el = oldData.__el;
                })
                .remove(function (dataItem) {
                    group.remove(dataItem.__el);
                })
                .execute();

            this.data = data;
        }
    });

    return Bar;
});