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

    var getPrecisionSafe = numberUtil.getPrecisionSafe;
    var roundingErrorFix = numberUtil.round;
    /**
     * @alias module:echarts/coord/scale/Interval
     * @constructor
     */
    var IntervalScale = Scale.extend({

        type: 'interval',

        _interval: 0,

        setExtent: function (start, end) {
            var thisExtent = this._extent;
            //start,end may be a Number like '25',so...
            if (!isNaN(start)) {
                thisExtent[0] = parseFloat(start);
            }
            if (!isNaN(end)) {
                thisExtent[1] = parseFloat(end);
            }
        },

        unionExtent: function (other) {
            var extent = this._extent;
            other[0] < extent[0] && (extent[0] = other[0]);
            other[1] > extent[1] && (extent[1] = other[1]);

            // unionExtent may called by it's sub classes
            IntervalScale.prototype.setExtent.call(this, extent[0], extent[1]);
        },
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
            // Dropped auto calculated niceExtent and use user setted extent
            // We assume user wan't to set both interval, min, max to get a better result
            this._niceExtent = this._extent.slice();
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

            // Consider this case: using dataZoom toolbox, zoom and zoom.
            var safeLimit = 10000;

            if (interval) {
                var niceExtent = this._niceExtent;
                var precision = getPrecisionSafe(interval) + 2;

                if (extent[0] < niceExtent[0]) {
                    ticks.push(extent[0]);
                }
                var tick = niceExtent[0];

                while (tick <= niceExtent[1]) {
                    ticks.push(tick);
                    // Avoid rounding error
                    tick = roundingErrorFix(tick + interval, precision);
                    if (ticks.length > safeLimit) {
                        return [];
                    }
                }
                // Consider this case: the last item of ticks is smaller
                // than niceExtent[1] and niceExtent[1] === extent[1].
                if (extent[1] > (ticks.length ? ticks[ticks.length - 1] : niceExtent[1])) {
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
         *
         * @param {number} [splitNumber = 5] Desired number of ticks
         */
        niceTicks: function (splitNumber) {
            splitNumber = splitNumber || 5;
            var extent = this._extent;
            var span = extent[1] - extent[0];
            if (!isFinite(span)) {
                return;
            }
            // User may set axis min 0 and data are all negative
            // FIXME If it needs to reverse ?
            if (span < 0) {
                span = -span;
                extent.reverse();
            }

            // From "Nice Numbers for Graph Labels" of Graphic Gems
            // var niceSpan = numberUtil.nice(span, false);
            var step = roundingErrorFix(
                numberUtil.nice(span / splitNumber, true),
                Math.max(
                    getPrecisionSafe(extent[0]),
                    getPrecisionSafe(extent[1])
                // extent may be [0, 1], and step should have 1 more digits.
                // To make it safe we add 2 more digits
                ) + 2
            );

            var precision = getPrecisionSafe(step) + 2;
            // Niced extent inside original extent
            var niceExtent = [
                roundingErrorFix(mathCeil(extent[0] / step) * step, precision),
                roundingErrorFix(mathFloor(extent[1] / step) * step, precision)
            ];

            this._interval = step;
            this._niceExtent = niceExtent;
        },

        /**
         * Nice extent.
         * @param {number} [splitNumber = 5] Given approx tick number
         * @param {boolean} [fixMin=false]
         * @param {boolean} [fixMax=false]
         */
        niceExtent: function (splitNumber, fixMin, fixMax) {
            var extent = this._extent;
            // If extent start and end are same, expand them
            if (extent[0] === extent[1]) {
                if (extent[0] !== 0) {
                    // Expand extent
                    var expandSize = extent[0];
                    // In the fowllowing case
                    //      Axis has been fixed max 100
                    //      Plus data are all 100 and axis extent are [100, 100].
                    // Extend to the both side will cause expanded max is larger than fixed max.
                    // So only expand to the smaller side.
                    if (!fixMax) {
                        extent[1] += expandSize / 2;
                        extent[0] -= expandSize / 2;
                    }
                    else {
                        extent[0] -= expandSize / 2;
                    }
                }
                else {
                    extent[1] = 1;
                }
            }
            var span = extent[1] - extent[0];
            // If there are no data and extent are [Infinity, -Infinity]
            if (!isFinite(span)) {
                extent[0] = 0;
                extent[1] = 1;
            }

            this.niceTicks(splitNumber);

            // var extent = this._extent;
            var interval = this._interval;

            if (!fixMin) {
                extent[0] = roundingErrorFix(mathFloor(extent[0] / interval) * interval);
            }
            if (!fixMax) {
                extent[1] = roundingErrorFix(mathCeil(extent[1] / interval) * interval);
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
