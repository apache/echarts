define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');

    require('../../echarts').extendChartView({

        type: 'graph',

        init: function () {
            var symbolDraw = new SymbolDraw();
            this.group.add(symbolDraw.group);

            this._symbolDraw = symbolDraw;
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();

            this._symbolDraw.updateData(
                data, seriesModel, api, false
            );
        },

        remove: function (ecModel, api) {

        }
    });
});