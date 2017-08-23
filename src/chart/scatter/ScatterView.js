define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LargeSymbolDraw = require('../helper/LargeSymbolDraw');

    require('../../echarts').extendChartView({

        type: 'scatter',

        init: function () {
            this._normalSymbolDraw = new SymbolDraw();
            this._largeSymbolDraw = new LargeSymbolDraw();
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var largeSymbolDraw = this._largeSymbolDraw;
            var normalSymbolDraw = this._normalSymbolDraw;
            var group = this.group;

            var symbolDraw = seriesModel.get('large') && data.count() > seriesModel.get('largeThreshold')
                ? largeSymbolDraw : normalSymbolDraw;

            this._symbolDraw = symbolDraw;
            symbolDraw.updateData(data);
            group.add(symbolDraw.group);

            group.remove(
                symbolDraw === largeSymbolDraw
                ? normalSymbolDraw.group : largeSymbolDraw.group
            );
        },

        updateLayout: function (seriesModel) {
            this._symbolDraw.updateLayout(seriesModel);
        },

        remove: function (ecModel, api) {
            this._symbolDraw && this._symbolDraw.remove(api, true);
        },

        dispose: function () {}
    });
});