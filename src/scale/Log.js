/**
 * Log scale
 * @module echarts/scale/Log
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var IntervalScale = require('./Interval');
    var intervalScaleProto = IntervalScale.prototype;
    var numberUtil = require('../util/number');

    var mathFloor = Math.floor;
    var mathCeil = Math.ceil;

    var LOG_BASE = 10;
    var mathLog = Math.log;

    function LogScale(logBase) {
        IntervalScale.call(this);
    }

    var logScaleProto = LogScale.prototype;

    logScaleProto.type = 'log';

    zrUtil.each(['contain', 'normalize'], function (methodName) {
        logScaleProto[methodName] = function (val) {
            val = mathLog(val) / mathLog(LOG_BASE);
            return intervalScaleProto[methodName].call(this, val);
        };
    });

    logScaleProto.getTicks = function () {
        var ticks = intervalScaleProto.getTicks.call(this);
        return zrUtil.map(ticks, function (tick) {
            return Math.pow(LOG_BASE, tick);
        });
    };

    /**
     * @param  {number} val
     * @return {number}
     */
    logScaleProto.scale = function (val) {
        val = intervalScaleProto.scale.call(this, val);
        return Math.pow(LOG_BASE, val);
    };

    /**
     * @param {number} start
     * @param {number} end
     */
    logScaleProto.setExtent = function (start, end) {
        start = mathLog(start) / mathLog(LOG_BASE);
        end = mathLog(end) / mathLog(LOG_BASE);
        intervalScaleProto.setExtent.call(this, start, end);
    };

    /**
     * @return {number} end
     */
    logScaleProto.getExtent = function () {
        var extent = intervalScaleProto.getExtent.call(this);
        extent[0] = Math.pow(LOG_BASE, extent[0]);
        extent[1] = Math.pow(LOG_BASE, extent[1]);
        return extent;
    };

    logScaleProto.niceTicks = function (approxTickNum) {
        approxTickNum = approxTickNum || 10;
        var extent = this._extent;
        var span = extent[1] - extent[0];
        if (span === Infinity || span <= 0) {
            return;
        }

        var interval = Math.pow(10, Math.floor(Math.log(span / approxTickNum) / Math.LN10));
        var err = approxTickNum / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            interval *= 10;
        }
        var niceExtent = [
            numberUtil.round(mathCeil(extent[0] / interval) * interval),
            numberUtil.round(mathFloor(extent[1] / interval) * interval)
        ];

        this._interval = interval;
        this._niceExtent = niceExtent;
    };

    /**
     * @param  {Array.<number>} extent
     */
    logScaleProto.unionExtent = function (extent) {
        extent[0] = mathLog(extent[0]) / mathLog(LOG_BASE);
        extent[1] = mathLog(extent[1]) / mathLog(LOG_BASE);
        intervalScaleProto.unionExtent.call(this, extent);
    };

    zrUtil.inherits(LogScale, IntervalScale);

    LogScale.create = function () {
        return new LogScale();
    };

    require('./scale').register(LogScale);

    return LogScale;
});