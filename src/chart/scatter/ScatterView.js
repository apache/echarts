import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import LargeSymbolDraw from '../helper/LargeSymbolDraw';

import pointsLayout from '../../layout/points';

echarts.extendChartView({

    type: 'scatter',

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();

        var symbolDraw = this._updateSymbolDraw(data, seriesModel);
        symbolDraw.updateData(data);

        this._finished = true;
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        var symbolDraw = this._updateSymbolDraw(data, seriesModel);

        symbolDraw.incrementalPrepareUpdate(data);

        this._finished = false;
    },

    incrementalRender: function (taskParams, seriesModel, ecModel) {
        this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData());

        this._finished = taskParams.end === seriesModel.getData().count();
    },

    updateTransform: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        // Must mark group dirty and make sure the incremental layer will be cleared
        // PENDING
        this.group.dirty();

        if (!this._finished || data.count() > 1e4 || !this._symbolDraw.isPersistent()) {
            return {
                update: true
            };
        }
        else {
            var res = pointsLayout().reset(seriesModel);
            if (res.progress) {
                res.progress({ start: 0, end: data.count() }, data);
            }

            this._symbolDraw.updateLayout(data);
        }
    },

    _updateSymbolDraw: function (data, seriesModel) {
        var symbolDraw = this._symbolDraw;
        var pipelineContext = seriesModel.pipelineContext;
        var isLargeDraw = pipelineContext.large;

        if (!symbolDraw || isLargeDraw !== this._isLargeDraw) {
            symbolDraw && symbolDraw.remove();
            symbolDraw = this._symbolDraw = isLargeDraw
                ? new LargeSymbolDraw()
                : new SymbolDraw();
            this._isLargeDraw = isLargeDraw;
            this.group.removeAll();
        }

        this.group.add(symbolDraw.group);

        return symbolDraw;
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove(true);
        this._symbolDraw = null;
    },

    dispose: function () {}
});