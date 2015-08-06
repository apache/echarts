define(function (require) {

    var Chart = require('../Chart');
    var zrUtil = require('zrender/core/util');

    require('./BarSeries');

    var Bar = Chart.extend({

        type: 'bar',

        init: function () {},

        render: function (series, option, api) {
            var coordinateSystemType = series.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian') {
                this._renderCartesianBar(series, option, api);
            }
        },

        _renderCartesianBar: function (series, option, api) {
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