import {__DEV__} from '../../config';
import * as echarts from '../../echarts';
import LineDraw from '../helper/LineDraw';
import EffectLine from '../helper/EffectLine';
import Line from '../helper/Line';
import Polyline from '../helper/Polyline';
import EffectPolyline from '../helper/EffectPolyline';
import LargeLineDraw from '../helper/LargeLineDraw';
import * as matrix from 'zrender/src/core/matrix';

export default echarts.extendChartView({

    type: 'lines',

    init: function () {},

    render: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();

        this._updateGroupTransform(seriesModel);

        var lineDraw = this._updateLineDraw(data, seriesModel);

        var zlevel = seriesModel.get('zlevel');
        var trailLength = seriesModel.get('effect.trailLength');

        var zr = api.getZr();
        // Avoid the drag cause ghost shadow
        // FIXME Better way ?
        // SVG doesn't support
        var isSvg = zr.painter.getType() === 'svg';
        if (!isSvg) {
            zr.painter.getLayer(zlevel).clear(true);
        }
        // Config layer with motion blur
        if (this._lastZlevel != null && !isSvg) {
            zr.configLayer(this._lastZlevel, {
                motionBlur: false
            });
        }
        if (this._showEffect(seriesModel) && trailLength) {
            if (__DEV__) {
                var notInIndividual = false;
                ecModel.eachSeries(function (otherSeriesModel) {
                    if (otherSeriesModel !== seriesModel && otherSeriesModel.get('zlevel') === zlevel) {
                        notInIndividual = true;
                    }
                });
                notInIndividual && console.warn('Lines with trail effect should have an individual zlevel');
            }

            if (!isSvg) {
                zr.configLayer(zlevel, {
                    motionBlur: true,
                    lastFrameAlpha: Math.max(Math.min(trailLength / 10 + 0.9, 1), 0)
                });
            }
        }

        lineDraw.updateData(data);

        this._lastZlevel = zlevel;
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        var data = seriesModel.getData();

        this._updateGroupTransform(seriesModel);

        var lineDraw = this._updateLineDraw(data, seriesModel);

        lineDraw.incrementalPrepareUpdate(data);

        this._clearLayer(api);
    },

    incrementalRender: function (taskParams, seriesModel, ecModel) {
        this._lineDraw.incrementalUpdate(taskParams, seriesModel.getData());
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

        if (update || !this._finished || !this._lineDraw.isPersistent()) {
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

    _updateLineDraw: function (data, seriesModel) {
        var lineDraw = this._lineDraw;
        var hasEffect = this._showEffect(seriesModel);
        var isPolyline = !!seriesModel.get('polyline');
        var pipelineContext = seriesModel.pipelineContext;
        var isLargeDraw = pipelineContext.large;

        if (__DEV__) {
            if (hasEffect && isLargeDraw) {
                console.warn('Large lines not support effect');
            }
        }
        if (!lineDraw
            || hasEffect !== this._hasEffet
            || isPolyline !== this._isPolyline
            || isLargeDraw !== this._isLargeDraw
        ) {
            if (lineDraw) {
                lineDraw.remove();
            }
            lineDraw = this._lineDraw = isLargeDraw
                ? new LargeLineDraw()
                : new LineDraw(
                    isPolyline
                        ? (hasEffect ? EffectPolyline : Polyline)
                        : (hasEffect ? EffectLine : Line)
                );
            this._hasEffet = hasEffect;
            this._isPolyline = isPolyline;
            this._isLargeDraw = isLargeDraw;
            this.group.removeAll();
        }

        this.group.add(lineDraw.group);

        return lineDraw;
    },

    _showEffect: function (seriesModel) {
        return !!seriesModel.get('effect.show');
    },

    _clearLayer: function (api) {
        // Not use motion when dragging or zooming
        var zr = api.getZr();
        var isSvg = zr.painter.getType() === 'svg';
        if (!isSvg && this._lastZlevel != null) {
            zr.painter.getLayer(this._lastZlevel).clear(true);
        }
    },

    remove: function (ecModel, api) {
        this._lineDraw && this._lineDraw.remove();
        this._lineDraw = null;
        // Clear motion when lineDraw is removed
        this._clearLayer(api);
    },

    dispose: function () {}
});
