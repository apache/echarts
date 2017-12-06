import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import LargeSymbolDraw from '../helper/LargeSymbolDraw';
import StreamSymbolDraw from '../helper/StreamSymbolDraw';

echarts.extendChartView({

    type: 'scatter',

    init: function () {
        this._normalSymbolDraw = new SymbolDraw();
        this._largeSymbolDraw = new LargeSymbolDraw();
        this._streamSymbolDraw = new StreamSymbolDraw();
    },

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var group = this.group;

        var symbolDraw = seriesModel.useStream()
            ? this._streamSymbolDraw
            : seriesModel.get('large') && data.count() > seriesModel.get('largeThreshold')
            ? this._largeSymbolDraw
            : this._normalSymbolDraw;

        this._symbolDraw = symbolDraw;
        symbolDraw.updateData(data);
        group.add(symbolDraw.group || symbolDraw.root);

        this._lasySymbolDrawGroup && group.remove(this._lasySymbolDrawGroup);

        this._lasySymbolDrawGroup = symbolDraw.group;
    },

    updateLayout: function (seriesModel) {
        this._symbolDraw.updateLayout(seriesModel);
    },

    updateView: function (seriesModel) {
        this._symbolDraw.updateView(seriesModel);
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api, true);
    },

    dispose: function () {}
});