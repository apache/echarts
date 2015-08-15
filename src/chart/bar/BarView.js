define(function (require) {

    var zrUtil = require('zrender/core/util');

    var Bar = require('../ChartView').extend({

        type: 'bar',

        init: function () {},

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderCartesianBar(seriesModel, ecModel, api);
            }
        },

        _renderCartesianBar: function (seriesModel, ecModel, api) {

            var group = api.createGroup();
            seriesModel.getData().each(function (dataItem) {
                var layout = dataItem.layout;
                dataItem.parent = seriesModel;

                var rect = api.createRectangle({
                    shape: {
                        x: layout.x,
                        y: layout.y,
                        width: layout.width,
                        height: layout.height
                    },
                    style: {
                        color: dataItem.get('itemStyle.normal.color')
                    }
                });

                group.add(rect);
            });
        }
    });

    return Bar;
});