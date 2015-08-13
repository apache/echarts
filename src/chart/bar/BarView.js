define(function (require) {

    var zrUtil = require('zrender/core/util');

    var Bar = require('../ChartView').extend({

        type: 'bar',

        init: function () {},

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian') {
                this._renderCartesianBar(seriesModel, ecModel, api);
            }
        },

        _renderCartesianBar: function (series, ecModel, api) {
            // Currently only one grid is supported
            var grid = api.getCoordinateSystem('grid', 0);

            var data = series.getData();
            var coords = grid.dataToCoords(
                data, series.get('xAxisIndex'), series.get('yAxisIndex')
            );

            data.each(function (dataItem, idx) {
                var coord = coords[idx];
            });
        }
    });

    return Bar;
});