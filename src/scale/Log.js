/**
 * Log scale
 * @module echarts/scale/Log
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Scale = require('./Scale');
    var numberUtil = require('../util/number');

    // Use some method of IntervalScale
    var IntervalScale = require('./Interval');

    var scaleProto = Scale.prototype;
    var intervalScaleProto = IntervalScale.prototype;

    var mathFloor = Math.floor;
    var mathCeil = Math.ceil;
    var mathPow = Math.pow;

    var mathLog = Math.log;

    var LogScale = Scale.extend({

        type: 'log',

        base: 10,

        /**
         * @return {Array.<number>}
         */
        getTicks: function () {
            return zrUtil.map(intervalScaleProto.getTicks.call(this), function (val) {
                return numberUtil.round(mathPow(this.base, val));
            }, this);
        },

        /**
         * @param {number} val
         * @return {string}
         */
        getLabel: intervalScaleProto.getLabel,

        /**
         * @param  {number} val
         * @return {number}
         */
        scale: function (val) {
            val = scaleProto.scale.call(this, val);
            return mathPow(this.base, val);
        },

        /**
         * @param {number} start
         * @param {number} end
         */
        setExtent: function (start, end) {
            var base = this.base;
            start = mathLog(start) / mathLog(base);
            end = mathLog(end) / mathLog(base);
            intervalScaleProto.setExtent.call(this, start, end);
        },

        /**
         * @return {number} end
         */
        getExtent: function () {
            var base = this.base;
            var extent = scaleProto.getExtent.call(this);
            extent[0] = mathPow(base, extent[0]);
            extent[1] = mathPow(base, extent[1]);
            return extent;
        },

        /**
         * @param  {Array.<number>} extent
         */
        unionExtent: function (extent) {
            var base = this.base;
            extent[0] = mathLog(extent[0]) / mathLog(base);
            extent[1] = mathLog(extent[1]) / mathLog(base);
            scaleProto.unionExtent.call(this, extent);
        },

        /**
         * Update interval and extent of intervals for nice ticks
         * @param  {number} [approxTickNum = 10] Given approx tick number
         */
        niceTicks: function (approxTickNum) {
            approxTickNum = approxTickNum || 10;
            var extent = this._extent;
            var span = extent[1] - extent[0];
            if (span === Infinity || span <= 0) {
                return;
            }

            var interval = numberUtil.quantity(span);
            var err = approxTickNum / span * interval;

            // Filter ticks to get closer to the desired count.
            if (err <= 0.5) {
                interval *= 10;
            }

            // Interval should be integer
            while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
                interval *= 10;
            }

            var niceExtent = [
                numberUtil.round(mathCeil(extent[0] / interval) * interval),
                numberUtil.round(mathFloor(extent[1] / interval) * interval)
            ];

            this._interval = interval;
            this._niceExtent = niceExtent;
        },

        /**
         * Nice extent.
         * @param {number} [approxTickNum = 10] Given approx tick number
         * @param {boolean} [fixMin=false]
         * @param {boolean} [fixMax=false]
         */
        niceExtent: intervalScaleProto.niceExtent
    });

    zrUtil.each(['contain', 'normalize'], function (methodName) {
        LogScale.prototype[methodName] = function (val) {
            val = mathLog(val) / mathLog(this.base);
            return scaleProto[methodName].call(this, val);
        };
    });

    LogScale.create = function () {
        return new LogScale();
    };

    return LogScale;
});