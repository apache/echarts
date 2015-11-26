/**
 * Interval scale
 * @module echarts/scale/Interval
 */

define(function (require) {

    var numberUtil = require('../util/number');
    var formatUtil = require('../util/format');
    var Scale = require('./Scale');

    var mathFloor = Math.floor;
    var mathCeil = Math.ceil;
    /**
     * @alias module:echarts/coord/scale/Interval
     * @constructor
     */
    var IntervalScale = Scale.extend({

        type: 'interval',

        _interval: 0,

        /**
         * Get interval
         */
        getInterval: function () {
            if (!this._interval) {
                this.niceTicks();
            }
            return this._interval;
        },

        /**
         * Set interval
         */
        setInterval: function (interval) {
            this._interval = interval;
        },

        /**
         * @return {Array.<number>}
         */
        getTicks: function () {
            if (!this._interval) {
                this.niceTicks();
            }
            var interval = this._interval;
            var extent = this._extent;
            var ticks = [];

            if (interval) {
                var niceExtent = this._niceExtent;
                if (extent[0] < niceExtent[0]) {
                    ticks.push(extent[0]);
                }
                var tick = niceExtent[0];
                while (tick <= niceExtent[1]) {
                    ticks.push(tick);
                    // Avoid rounding error
                    tick = numberUtil.round(tick + interval);
                }
                if (extent[1] > niceExtent[1]) {
                    ticks.push(extent[1]);
                }
            }

            return ticks;
        },

        /**
         * @return {Array.<string>}
         */
        getTicksLabels: function () {
            var labels = [];
            var ticks = this.getTicks();
            for (var i = 0; i < ticks.length; i++) {
                labels.push(this.getLabel(ticks[i]));
            }
            return labels;
        },

        /**
         * @param {number} n
         * @return {number}
         */
        getLabel: function (data) {
            return formatUtil.addCommas(data);
        },

        /**
         * Update interval and extent of intervals for nice ticks
         * Algorithm from d3.js
         * @param {number} [approxTickNum = 10] Given approx tick number
         */
        niceTicks: function (approxTickNum) {
            approxTickNum = approxTickNum || 10;
            var extent = this._extent;
            var span = extent[1] - extent[0];
            if (span === Infinity || span <= 0) {
                return;
            }

            // Figure out step quantity, for example 0.1, 1, 10, 100
            var interval = Math.pow(10, Math.floor(Math.log(span / approxTickNum) / Math.LN10));
            var err = approxTickNum / span * interval;

            // Filter ticks to get closer to the desired count.
            if (err <= 0.15) {
                interval *= 10;
            }
            else if (err <= 0.3) {
                interval *= 5;
            }
            else if (err <= 0.5) {
                interval *= 3;
            }
            else if (err <= 0.75) {
                interval *= 2;
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
        niceExtent: function (approxTickNum, fixMin, fixMax) {
            this.niceTicks(approxTickNum, fixMin, fixMax);

            var extent = this._extent;
            var interval = this._interval;

            if (!fixMin) {
                extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
            }
            if (!fixMax) {
                extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
            }
        }
    });

    /**
     * @return {module:echarts/scale/Time}
     */
    IntervalScale.create = function () {
        return new IntervalScale();
    };

    return IntervalScale;
});