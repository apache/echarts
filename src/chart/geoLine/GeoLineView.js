define(function (require) {

    var LineDraw = require('../helper/LineDraw');

    require('../../echarts').extendChartView({

        type: 'geoLine',

        init: function () {
            this._lineDraw = new LineDraw();
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var lineDraw = this._lineDraw;
            this.group.add(lineDraw.group);

            lineDraw.updateData(data);
        },

        updateLayout: function () {
            this._lineDraw.updateLayout();
        },

        remove: function (ecModel, api) {
            this._lineDraw.remove(api, true);
        }
    });
});