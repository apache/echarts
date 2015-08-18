define(function (require) {

    var Bar = require('../ChartView').extend({

        type: 'bar',

        init: function () {},

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderCartesian(seriesModel, ecModel, api);
            }
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
                        fill: dataItem
                                .withPrefix('itemStyle.normal.')
                                .get('color'),
                        stroke: dataItem.get('borderColor')
                    }
                });

                this.group.add(rect);
            });
        }
    });

    return Bar;
});