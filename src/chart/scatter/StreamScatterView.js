import * as echarts from '../../echarts';
import SymbolDrawStream from '../helper/SymbolDrawStream';

echarts.extendChartView({

    type: 'streamScatter',

    init: function () {
        this._symbolDraw = new SymbolDrawStream();
        // this._largeSymbolDraw = new LargeSymbolDraw();
    },

    // ??? back compatibal
    render: function (seriesModel, ecModel, api) {
        this.group.removeAll();

        // var symbolDraw = this._symbolDraw;
        var task = this._symbolDraw.resetData(seriesModel);

        this.group.add(this._symbolDraw.group);

        return task;
    },

    updateLayout: function (seriesModel) {
        return this._symbolDraw.updateLayout(seriesModel);
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api, true);
    },

    dispose: function () {}
});