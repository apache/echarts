define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');

    require('../../echarts').extendChartView({

        type: 'scatter',

        init: function () {
            this._symbolDraw = new SymbolDraw();
            this.group.add(this._symbolDraw.group);
        },

        render: function (seriesModel, ecModel, api) {
            this._symbolDraw.updateData(
                seriesModel.getData(), seriesModel, api, ecModel.get('animation')
            );
        },

        updateLayout: function () {
            this._symbolDraw.updateLayout();
        },

        remove: function (ecModel) {
            this._symbolDraw.remove(ecModel.get('animation'));
        }
    });
});