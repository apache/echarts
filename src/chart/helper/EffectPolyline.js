/**
 * Provide effect for line
 * @module echarts/chart/helper/EffectLine
 */
define(function (require) {

    var Polyline = require('./Polyline');
    var zrUtil = require('zrender/core/util');
    var EffectLine = require('./EffectLine');
    var vec2 = require('zrender/core/vector');

    /**
     * @constructor
     * @extends {module:echarts/chart/helper/EffectLine}
     * @alias {module:echarts/chart/helper/Polyline}
     */
    function EffectPolyline(lineData, idx, seriesScope) {
        EffectLine.call(this, lineData, idx, seriesScope);
        this._lastFrame = 0;
        this._lastFramePercent = 0;
    }

    var effectPolylineProto = EffectPolyline.prototype;

    // Overwrite
    effectPolylineProto.createLine = function (lineData, idx, seriesScope) {
        return new Polyline(lineData, idx, seriesScope);
    };

    // Overwrite
    effectPolylineProto.updateAnimationPoints = function (symbol, points) {
        this._points = points;
        var accLenArr = [0];
        var len = 0;
        for (var i = 1; i < points.length; i++) {
            var p1 = points[i - 1];
            var p2 = points[i];
            len += vec2.dist(p1, p2);
            accLenArr.push(len);
        }
        if (len === 0) {
            return;
        }

        for (var i = 0; i < accLenArr.length; i++) {
            accLenArr[i] /= len;
        }
        this._offsets = accLenArr;
        this._length = len;
    };

    // Overwrite
    effectPolylineProto.getLineLength = function (symbol) {
        return this._length;
    };

    // Overwrite
    effectPolylineProto.updateSymbolPosition = function (symbol) {
        var t = symbol.__t;
        var points = this._points;
        var offsets = this._offsets;
        var len = points.length;

        if (!offsets) {
            // Has length 0
            return;
        }

        var lastFrame = this._lastFrame;
        var frame;

        if (t < this._lastFramePercent) {
            // Start from the next frame
            // PENDING start from lastFrame ?
            var start = Math.min(lastFrame + 1, len - 1);
            for (frame = start; frame >= 0; frame--) {
                if (offsets[frame] <= t) {
                    break;
                }
            }
            // PENDING really need to do this ?
            frame = Math.min(frame, len - 2);
        }
        else {
            for (var frame = lastFrame; frame < len; frame++) {
                if (offsets[frame] > t) {
                    break;
                }
            }
            frame = Math.min(frame - 1, len - 2);
        }

        vec2.lerp(
            symbol.position, points[frame], points[frame + 1],
            (t - offsets[frame]) / (offsets[frame + 1] - offsets[frame])
        );

        var tx = points[frame + 1][0] - points[frame][0];
        var ty = points[frame + 1][1] - points[frame][1];
        symbol.rotation = -Math.atan2(ty, tx) - Math.PI / 2;

        this._lastFrame = frame;
        this._lastFramePercent = t;

        symbol.ignore = false;
    };

    zrUtil.inherits(EffectPolyline, EffectLine);

    return EffectPolyline;
});