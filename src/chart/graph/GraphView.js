define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');

    require('../../echarts').extendChartView({

        type: 'graph',

        init: function () {
            var symbolDraw = new SymbolDraw();
            var lineDraw = new LineDraw();

            this.group.add(symbolDraw.group);
            this.group.add(lineDraw.group);

            this._symbolDraw = symbolDraw;
            this._lineDraw = lineDraw;
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();

            var symbolDraw = this._symbolDraw;
            var lineDraw = this._lineDraw;

            var coordSys = seriesModel.coordinateSystem;

            symbolDraw.updateData(
                data, seriesModel, api, false
            );

            lineDraw.updateData(
                data.graph.edgeData,
                seriesModel, api, false
            );

            var scalarScale = coordSys && coordSys.getScalarScale();
            data.eachItemGraphicEl(function (el, idx) {
                el.scale[0] = el.scale[1] = scalarScale;
            });
        },

        updateLayout: function (seriesModel, ecModel) {
            this._symbolDraw.updateLayout();
            this._lineDraw.updateLayout();
        },

        remove: function (ecModel, api) {
            this._symbolDraw.remove();
            this._lineDraw.remove();
        }
    });
});