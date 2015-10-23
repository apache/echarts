/**
 * Interval scale
 * @module echarts/coord/scale/Time
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');

    var IntervalScale = require('./Interval');

    var intervalScaleProto = IntervalScale.prototype;

    var mathCeil = Math.ceil;
    var mathFloor = Math.floor;

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
    }

    /**
     * @param {string|Date|number} value
     * @inner
     */
    var parseDate = function (value) {
        return value instanceof Date
               ? value
               : new Date(typeof value == 'string' ? value.replace(/-/g, '/') : value);
    }

    /**
     * @param {string} str
     * @return {string}
     * @inner
     */
    var s2d = function (str) {
        return str < 10 ? ('0' + str) : str;
    }

    /**
     * ISO Date format
     * @param {string} tpl
     * @param {number} value
     * @inner
     */
    var format = function (tpl, value) {
        if (tpl === 'week'
            || tpl === 'month'
            || tpl === 'quarter'
            || tpl === 'half-year'
            || tpl === 'year'
        ) {
            tpl = 'MM-dd\nyyyy';
        }

        var date = parseDate(value);
        var y = date.getFullYear();
        var M = date.getMonth() + 1;
        var d = date.getDate();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();

        tpl = tpl.replace('MM', s2d(M))
            .toLowerCase()
            .replace('yyyy', y)
            .replace('yy', y % 100)
            .replace('dd', s2d(d))
            .replace('d', d)
            .replace('hh', s2d(h))
            .replace('h', h)
            .replace('mm', s2d(m))
            .replace('m', m)
            .replace('ss', s2d(s))
            .replace('s', s);

        return tpl;
    }
    /**
     * @alias module:echarts/coord/scale/Time
     * @constructor
     */
    var TimeScale = function () {

        IntervalScale.call(this);
    }

    TimeScale.prototype = {

        constructor: TimeScale,

        type: 'time',

        // Overwrite
        getLabel: function (val) {
            var stepLvl = this._stepLvl;

            var date = new Date(val);

            return format(stepLvl[0], date);
        },

        // Overwrite
        niceTicks: function (approxTickNum) {
            approxTickNum = approxTickNum || 10;

            var extent = this._extent;
            var span = extent[1]-extent[0];
            var approxInterval = span / approxTickNum;
            var scaleLevelsLen = scaleLevels.length;
            var idx = bisect(scaleLevels, approxInterval, 0, scaleLevelsLen);

            var level = scaleLevels[Math.min(idx, scaleLevelsLen - 1)];
            var interval = level[2];

            var niceExtent = [
                mathCeil(extent[0] / interval) * interval,
                mathFloor(extent[1] / interval) * interval
            ];

            this._stepLvl = level;
            // Interval will be used in getTicks
            this._interval = interval;
            this._niceExtent = niceExtent;
        }
    };

    zrUtil.each(['contain', 'normalize'], function (methodName) {
        TimeScale.prototype[methodName] = function (val) {
            val = +parseDate(val);
            return intervalScaleProto[methodName].call(this, val);
        }
    });

    zrUtil.inherits(TimeScale, IntervalScale);

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
        ['MM-dd\nyyyy', 1,      3600000 * 24],   // 1d
        ['week',        7,      3600000 * 24 * 7],        // 7d
        ['month',       1,      3600000 * 24 * 31],       // 1M
        ['quarter',     3,      3600000 * 24 * 380 / 4],  // 3M
        ['half-year',   6,      3600000 * 24 * 380 / 2],  // 6M
        ['year',        1,      3600000 * 24 * 380]       // 1Y
    ];

    /**
     * @return {module:echarts/scale/Time}
     */
    TimeScale.create = function () {
        return new TimeScale();
    }

    require('./scale').register(TimeScale);

    return TimeScale;
});