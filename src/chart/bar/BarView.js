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
            seriesModel.getData().each(function (dataItem) {
                var layout = dataItem.layout;

                var rect = new api.Rectangle({
                    shape: {
                        x: layout.x,
                        y: layout.y,
                        width: layout.width,
                        height: layout.height
                    },
                    style: {
                        fill: dataItem.getVisual('color'),
                        stroke: dataItem.get('itemStyle.normal.borderColor')
                    }
                });

                this.group.add(rect);
            }, this);
        }
    });

    return Bar;
});