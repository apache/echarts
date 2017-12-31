import * as echarts from '../../echarts';
import SymbolDraw from '../helper/SymbolDraw';
import LargeSymbolDraw from '../helper/LargeSymbolDraw';
import * as matrix from 'zrender/src/core/matrix';

echarts.extendChartView({

    type: 'scatter',

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();
        this._removeRoamTransformInPoints(seriesModel, 0, data.count());
        this._updateGroupTransform(seriesModel);

        var symbolDraw = this._updateSymbolDraw(data, seriesModel);
        symbolDraw.updateData(data);

        this._finished = true;
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this._updateGroupTransform(seriesModel);

        var data = seriesModel.getData();
        var symbolDraw = this._updateSymbolDraw(data, seriesModel);

        symbolDraw.incrementalPrepareUpdate(data);

        this._finished = false;
    },

    incrementalRender: function (taskParams, seriesModel, ecModel) {
        this._removeRoamTransformInPoints(seriesModel, taskParams.start, taskParams.end);
        this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData());

        this._finished = taskParams.end === seriesModel.getData().count();
    },

    updateTransform: function (seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        var update = true;
        // Must mark group dirty and make sure the incremental layer will be cleared
        // PENDING
        this.group.dirty();
        if (coordSys.getRoamTransform) {
            update = false;
            this._updateGroupTransform(seriesModel);
        }

        if (update || !this._finished || !this._symbolDraw.isPersistent()) {
            return {
                update: true
            };
        }
    },

    _updateGroupTransform: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.getRoamTransform) {
            this.group.transform = matrix.clone(coordSys.getRoamTransform());
            this.group.decomposeTransform();
        }
    },

    _removeRoamTransformInPoints: function (seriesModel, start, end) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.removeRoamTransformInPoint) {
            var data = seriesModel.getData();
            var pt = [];
            if (seriesModel.pipelineContext.large) {
                var points = data.getLayout('symbolPoints');
                if (points) {
                    for (var i = 0; i < points.length; i += 2) {
                        pt[0] = points[i];
                        pt[1] = points[i + 1];
                        coordSys.removeRoamTransformInPoint(pt);
                        points[i] = pt[0];
                        points[i + 1] = pt[1];
                    }
                }
            }
            else {
                for (var i = start; i < end; i++) {
                    var pt = data.getItemLayout(i);
                    coordSys.removeRoamTransformInPoint(pt);
                }
            }
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