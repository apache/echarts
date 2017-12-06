import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import EffectSymbol from '../helper/EffectSymbol';

export default echarts.extendChartView({

    type: 'effectScatter',

    init: function () {
        this._symbolDraw = new SymbolDraw(EffectSymbol);
    },

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var effectSymbolDraw = this._symbolDraw;
        effectSymbolDraw.updateData(data);
        this.group.add(effectSymbolDraw.group);
    },

    updateLayout: function () {
        this._symbolDraw.updateLayout();
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api);
    },

    dispose: function () {}
});
