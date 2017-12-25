import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import LargeSymbolDraw from '../helper/LargeSymbolDraw';

echarts.extendChartView({

    type: 'scatter',

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var symbolDraw = this._updateSymbolDraw(data, seriesModel);
        symbolDraw.updateData(data);
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var symbolDraw = this._updateSymbolDraw(data, seriesModel);
        symbolDraw.incrementalPrepareUpdate(data);
    },

    incrementalRender: function (taskParams, seriesModel, ecModel) {
        this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData());
    },

    _updateSymbolDraw: function (data, seriesModel) {
        var symbolDraw = this._symbolDraw;
        var pipelineContext = seriesModel.pipelineContext;
        var isLargeDraw = pipelineContext.large || pipelineContext.incrementalRender;

        if (!symbolDraw || isLargeDraw !== this._isLargeDraw) {
            symbolDraw && symbolDraw.remove();
            symbolDraw = this._symbolDraw = isLargeDraw
                ? new LargeSymbolDraw()
                : new SymbolDraw();
            this._isLargeDraw = isLargeDraw;
        }

        this.group.add(symbolDraw.group);

        return symbolDraw;
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(api, true);
        this._symbolDraw = null;
    },

    dispose: function () {}
});