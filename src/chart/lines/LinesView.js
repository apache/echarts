define(function (require) {

    var LineDraw = require('../helper/LineDraw');
    var EffectLine = require('../helper/EffectLine');
    var Line = require('../helper/Line');
    var Polyline = require('../helper/Polyline');
    var EffectPolyline = require('../helper/EffectPolyline');

    require('../../echarts').extendChartView({

        type: 'lines',

        init: function () {},

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var lineDraw = this._lineDraw;

            var hasEffect = seriesModel.get('effect.show');
            var isPolyline = seriesModel.get('polyline');
            if (hasEffect !== this._hasEffet || isPolyline !== this._isPolyline) {
                if (lineDraw) {
                    lineDraw.remove();
                }
                lineDraw = this._lineDraw = new LineDraw(
                    isPolyline
                        ? (hasEffect ? EffectPolyline : Polyline)
                        : (hasEffect ? EffectLine : Line)
                );
                this._hasEffet = hasEffect;
                this._isPolyline = isPolyline;
            }

            var zlevel = seriesModel.get('zlevel');
            var trailLength = seriesModel.get('effect.trailLength');

            var zr = api.getZr();
            // Avoid the drag cause ghost shadow
            // FIXME Better way ?
            zr.painter.getLayer(zlevel).clear(true);
            // Config layer with motion blur
            if (this._lastZlevel != null) {
                zr.configLayer(this._lastZlevel, {
                    motionBlur: false
                });
            }
            if (hasEffect && trailLength) {
                if (__DEV__) {
                    var notInIndividual = false;
                    ecModel.eachSeries(function (otherSeriesModel) {
                        if (otherSeriesModel !== seriesModel && otherSeriesModel.get('zlevel') === zlevel) {
                            notInIndividual = true;
                        }
                    });
                    notInIndividual && console.warn('Lines with trail effect should have an individual zlevel');
                }

                zr.configLayer(zlevel, {
                    motionBlur: true,
                    lastFrameAlpha: Math.max(Math.min(trailLength / 10 + 0.9, 1), 0)
                });
            }


            this.group.add(lineDraw.group);

            lineDraw.updateData(data);

            this._lastZlevel = zlevel;
        },

        updateLayout: function (seriesModel, ecModel, api) {
            this._lineDraw.updateLayout();
            // Not use motion when dragging or zooming
            var zr = api.getZr();
            zr.painter.getLayer(this._lastZlevel).clear(true);
        },

        remove: function (ecModel, api) {
            this._lineDraw && this._lineDraw.remove(api, true);
        }
    });
});