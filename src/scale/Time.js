/**
 * Interval scale
 * @module echarts/coord/scale/Time
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../util/number');
    var formatUtil = require('../util/format');

    var IntervalScale = require('./Interval');

    var intervalScaleProto = IntervalScale.prototype;

    var mathCeil = Math.ceil;
    var mathFloor = Math.floor;
    var ONE_DAY = 3600000 * 24;

    // FIXME 公用？
    var bisect = function (a, x, lo, hi) {
        while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (a[mid][2] < x) {
                lo = mid + 1;
            }
            else {
                hi  = mid;
            }
        }
        return lo;
    };

    /**
     * @alias module:echarts/coord/scale/Time
     * @constructor
     */
    var TimeScale = IntervalScale.extend({
        type: 'time',

        // Overwrite
        getLabel: function (val) {
            var stepLvl = this._stepLvl;

            var date = new Date(val);

            return formatUtil.formatTime(stepLvl[0], date);
        },

        // Overwrite
        niceExtent: function (approxTickNum, fixMin, fixMax) {
            var extent = this._extent;
            // If extent start and end are same, expand them
            if (extent[0] === extent[1]) {
                // Expand extent
                extent[0] -= ONE_DAY;
                extent[1] += ONE_DAY;
            }
            // If there are no data and extent are [Infinity, -Infinity]
            if (extent[1] === -Infinity && extent[0] === Infinity) {
                var d = new Date();
                extent[1] = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                extent[0] = extent[1] - ONE_DAY;
            }

            this.niceTicks(approxTickNum, fixMin, fixMax);

            // var extent = this._extent;
            var interval = this._interval;

            if (!fixMin) {
                extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
            }
            if (!fixMax) {
                extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
            }
        },

        // Overwrite
        niceTicks: function (approxTickNum) {
            approxTickNum = approxTickNum || 10;

            var extent = this._extent;
            var span = extent[1] - extent[0];
            var approxInterval = span / approxTickNum;
            var scaleLevelsLen = scaleLevels.length;
            var idx = bisect(scaleLevels, approxInterval, 0, scaleLevelsLen);

            var level = scaleLevels[Math.min(idx, scaleLevelsLen - 1)];
            var interval = level[2];
            // Same with interval scale if span is much larger than 1 year
            if (level[0] === 'year') {
                var yearSpan = span / interval;

                // From "Nice Numbers for Graph Labels" of Graphic Gems
                // var niceYearSpan = numberUtil.nice(yearSpan, false);
                var yearStep = numberUtil.nice(yearSpan / approxTickNum, true);

                interval *= yearStep;
            }

            var niceExtent = [
                mathCeil(extent[0] / interval) * interval,
                mathFloor(extent[1] / interval) * interval
            ];

            this._stepLvl = level;
            // Interval will be used in getTicks
            this._interval = interval;
            this._niceExtent = niceExtent;
        },

        parse: function (val) {
            // val might be float.
            return +numberUtil.parseDate(val);
        }
    });

    zrUtil.each(['contain', 'normalize'], function (methodName) {
        TimeScale.prototype[methodName] = function (val) {
            return intervalScaleProto[methodName].call(this, this.parse(val));
        };
    });

    // Steps from d3
    var scaleLevels = [
        // Format       step    interval
        ['hh:mm:ss',    1,      1000],           // 1s
        ['hh:mm:ss',    5,      1000 * 5],       // 5s
        ['hh:mm:ss',    10,     1000 * 10],      // 10s
        ['hh:mm:ss',    15,     1000 * 15],      // 15s
        ['hh:mm:ss',    30,     1000 * 30],      // 30s
        ['hh:mm\nMM-dd',1,      60000],          // 1m
        ['hh:mm\nMM-dd',5,      60000 * 5],      // 5m
        ['hh:mm\nMM-dd',10,     60000 * 10],     // 10m
        ['hh:mm\nMM-dd',15,     60000 * 15],     // 15m
        ['hh:mm\nMM-dd',30,     60000 * 30],     // 30m
        ['hh:mm\nMM-dd',1,      3600000],        // 1h
        ['hh:mm\nMM-dd',2,      3600000 * 2],    // 2h
        ['hh:mm\nMM-dd',6,      3600000 * 6],    // 6h
        ['hh:mm\nMM-dd',12,     3600000 * 12],   // 12h
        ['MM-dd\nyyyy', 1,      ONE_DAY],   // 1d
        ['week',        7,      ONE_DAY * 7],        // 7d
        ['month',       1,      ONE_DAY * 31],       // 1M
        ['quarter',     3,      ONE_DAY * 380 / 4],  // 3M
        ['half-year',   6,      ONE_DAY * 380 / 2],  // 6M
        ['year',        1,      ONE_DAY * 380]       // 1Y
    ];

    /**
     * @return {module:echarts/scale/Time}
     */
    TimeScale.create = function () {
        return new TimeScale();
    };

    return TimeScale;
});