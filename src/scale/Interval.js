/**
 * Interval scale
 * @module echarts/scale/Interval
 */

define(function (require) {

    var numberUtil = require('../util/number');
    var formatUtil = require('../util/format');
    var Scale = require('./Scale');
    var helper = require('./helper');

    var roundNumber = numberUtil.round;

    /**
     * @alias module:echarts/coord/scale/Interval
     * @constructor
     */
    var IntervalScale = Scale.extend({

        type: 'interval',

        _interval: 0,

        _intervalPrecision: 2,

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
            return helper.intervalScaleGetTicks(
                this._interval, this._extent, this._niceExtent, this._intervalPrecision
            );
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
         * @param {number} data
         * @param {Object} [opt]
         * @param {number|string} [opt.precision] If 'auto', use nice presision.
         * @param {boolean} [opt.pad] returns 1.50 but not 1.5 if precision is 2.
         * @return {string}
         */
        getLabel: function (data, opt) {
            if (data == null) {
                return '';
            }

            var precision = opt && opt.precision;

            if (precision == null) {
                precision = numberUtil.getPrecisionSafe(data) || 0;
            }
            else if (precision === 'auto') {
                // Should be more precise then tick.
                precision = this._intervalPrecision;
            }

            // (1) If `precision` is set, 12.005 should be display as '12.00500'.
            // (2) Use roundNumber (toFixed) to avoid scientific notation like '3.5e-7'.
            data = roundNumber(data, precision, true);

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

            var result = helper.intervalScaleNiceTicks(extent, splitNumber);

            this._intervalPrecision = result.intervalPrecision;
            this._interval = result.interval;
            this._niceExtent = result.niceTickExtent;
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
                extent[0] = roundNumber(Math.floor(extent[0] / interval) * interval);
            }
            if (!fixMax) {
                extent[1] = roundNumber(Math.ceil(extent[1] / interval) * interval);
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
