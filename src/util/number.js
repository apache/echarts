/**
 * 数值处理模块
 * @module echarts/util/number
 */

define(function (require) {

    var number = {};

    var RADIAN_EPSILON = 1e-4;

    function _trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /**
     * Linear mapping a value from domain to range
     * @memberOf module:echarts/util/number
     * @param  {(number|Array.<number>)} val
     * @param  {Array.<number>} domain Domain extent domain[0] can be bigger than domain[1]
     * @param  {Array.<number>} range  Range extent range[0] can be bigger than range[1]
     * @param  {boolean} clamp
     * @return {(number|Array.<number>}
     */
    number.linearMap = function (val, domain, range, clamp) {
        var subDomain = domain[1] - domain[0];
        var subRange = range[1] - range[0];

        if (subDomain === 0) {
            return subRange === 0
                ? range[0]
                : (range[0] + range[1]) / 2;
        }

        // Avoid accuracy problem in edge, such as
        // 146.39 - 62.83 === 83.55999999999999.
        // See echarts/test/ut/spec/util/number.js#linearMap#accuracyError
        // It is a little verbose for efficiency considering this method
        // is a hotspot.
        if (clamp) {
            if (subDomain > 0) {
                if (val <= domain[0]) {
                    return range[0];
                }
                else if (val >= domain[1]) {
                    return range[1];
                }
            }
            else {
                if (val >= domain[0]) {
                    return range[0];
                }
                else if (val <= domain[1]) {
                    return range[1];
                }
            }
        }
        else {
            if (val === domain[0]) {
                return range[0];
            }
            if (val === domain[1]) {
                return range[1];
            }
        }

        return (val - domain[0]) / subDomain * subRange + range[0];
    };

    /**
     * Convert a percent string to absolute number.
     * Returns NaN if percent is not a valid string or number
     * @memberOf module:echarts/util/number
     * @param {string|number} percent
     * @param {number} all
     * @return {number}
     */
    number.parsePercent = function(percent, all) {
        switch (percent) {
            case 'center':
            case 'middle':
                percent = '50%';
                break;
            case 'left':
            case 'top':
                percent = '0%';
                break;
            case 'right':
            case 'bottom':
                percent = '100%';
                break;
        }
        if (typeof percent === 'string') {
            if (_trim(percent).match(/%$/)) {
                return parseFloat(percent) / 100 * all;
            }

            return parseFloat(percent);
        }

        return percent == null ? NaN : +percent;
    };

    /**
     * (1) Fix rounding error of float numbers.
     * (2) Support return string to avoid scientific notation like '3.5e-7'.
     *
     * @param {number} x
     * @param {number} [precision]
     * @param {boolean} [returnStr]
     * @return {number|string}
     */
    number.round = function (x, precision, returnStr) {
        if (precision == null) {
            precision = 10;
        }
        // Avoid range error
        precision = Math.min(Math.max(0, precision), 20);
        x = (+x).toFixed(precision);
        return returnStr ? x : +x;
    };

    number.asc = function (arr) {
        arr.sort(function (a, b) {
            return a - b;
        });
        return arr;
    };

    /**
     * Get precision
     * @param {number} val
     */
    number.getPrecision = function (val) {
        val = +val;
        if (isNaN(val)) {
            return 0;
        }
        // It is much faster than methods converting number to string as follows
        //      var tmp = val.toString();
        //      return tmp.length - 1 - tmp.indexOf('.');
        // especially when precision is low
        var e = 1;
        var count = 0;
        while (Math.round(val * e) / e !== val) {
            e *= 10;
            count++;
        }
        return count;
    };

    /**
     * @param {string|number} val
     * @return {number}
     */
    number.getPrecisionSafe = function (val) {
        var str = val.toString();

        // Consider scientific notation: '3.4e-12' '3.4e+12'
        var eIndex = str.indexOf('e');
        if (eIndex > 0) {
            var precision = +str.slice(eIndex + 1);
            return precision < 0 ? -precision : 0;
        }
        else {
            var dotIndex = str.indexOf('.');
            return dotIndex < 0 ? 0 : str.length - 1 - dotIndex;
        }
    };

    /**
     * Minimal dicernible data precisioin according to a single pixel.
     *
     * @param {Array.<number>} dataExtent
     * @param {Array.<number>} pixelExtent
     * @return {number} precision
     */
    number.getPixelPrecision = function (dataExtent, pixelExtent) {
        var log = Math.log;
        var LN10 = Math.LN10;
        var dataQuantity = Math.floor(log(dataExtent[1] - dataExtent[0]) / LN10);
        var sizeQuantity = Math.round(log(Math.abs(pixelExtent[1] - pixelExtent[0])) / LN10);
        // toFixed() digits argument must be between 0 and 20.
        var precision = Math.min(Math.max(-dataQuantity + sizeQuantity, 0), 20);
        return !isFinite(precision) ? 20 : precision;
    };

    // Number.MAX_SAFE_INTEGER, ie do not support.
    number.MAX_SAFE_INTEGER = 9007199254740991;

    /**
     * To 0 - 2 * PI, considering negative radian.
     * @param {number} radian
     * @return {number}
     */
    number.remRadian = function (radian) {
        var pi2 = Math.PI * 2;
        return (radian % pi2 + pi2) % pi2;
    };

    /**
     * @param {type} radian
     * @return {boolean}
     */
    number.isRadianAroundZero = function (val) {
        return val > -RADIAN_EPSILON && val < RADIAN_EPSILON;
    };

    var TIME_REG = /^(?:(\d{4})(?:[-\/](\d{1,2})(?:[-\/](\d{1,2})(?:[T ](\d{1,2})(?::(\d\d)(?::(\d\d)(?:[.,](\d+))?)?)?(Z|[\+\-]\d\d:?\d\d)?)?)?)?)?$/; // jshint ignore:line

    /**
     * @return {number} in minutes
     */
    number.getTimezoneOffset = function () {
        return (new Date()).getTimezoneOffset();
    };

    /**
     * @param {string|Date|number} value These values can be accepted:
     *   + An instance of Date, represent a time in its own time zone.
     *   + Or string in a subset of ISO 8601, only including:
     *     + only year, month, date: '2012-03', '2012-03-01', '2012-03-01 05', '2012-03-01 05:06',
     *     + separated with T or space: '2012-03-01T12:22:33.123', '2012-03-01 12:22:33.123',
     *     + time zone: '2012-03-01T12:22:33Z', '2012-03-01T12:22:33+8000', '2012-03-01T12:22:33-05:00',
     *     all of which will be treated as local time if time zone is not specified
     *     (see <https://momentjs.com/>).
     *   + Or other string format, including (all of which will be treated as loacal time):
     *     '2012', '2012-3-1', '2012/3/1', '2012/03/01',
     *     '2009/6/12 2:00', '2009/6/12 2:05:08', '2009/6/12 2:05:08.123'
     *   + a timestamp, which represent a time in UTC.
     * @return {Date} date
     */
    number.parseDate = function (value) {
        if (value instanceof Date) {
            return value;
        }
        else if (typeof value === 'string') {
            // Different browsers parse date in different way, so we parse it manually.
            // Some other issues:
            // new Date('1970-01-01') is UTC,
            // new Date('1970/01/01') and new Date('1970-1-01') is local.
            // See issue #3623
            var match = TIME_REG.exec(value);

            if (!match) {
                // return Invalid Date.
                return new Date(NaN);
            }

            var timezoneOffset = number.getTimezoneOffset();
            var timeOffset = !match[8]
                ? 0
                : match[8].toUpperCase() === 'Z'
                ? timezoneOffset
                : +match[8].slice(0, 3) * 60 + timezoneOffset;

            // match[n] can only be string or undefined.
            // But take care of '12' + 1 => '121'.
            return new Date(
                +match[1],
                +(match[2] || 1) - 1,
                +match[3] || 1,
                +match[4] || 0,
                +(match[5] || 0) - timeOffset,
                +match[6] || 0,
                +match[7] || 0
            );
        }
        else if (value == null) {
            return new Date(NaN);
        }

        return new Date(Math.round(value));
    };

    /**
     * Quantity of a number. e.g. 0.1, 1, 10, 100
     *
     * @param  {number} val
     * @return {number}
     */
    number.quantity = function (val) {
        return Math.pow(10, quantityExponent(val));
    };

    function quantityExponent(val) {
        return Math.floor(Math.log(val) / Math.LN10);
    }

    /**
     * find a “nice” number approximately equal to x. Round the number if round = true,
     * take ceiling if round = false. The primary observation is that the “nicest”
     * numbers in decimal are 1, 2, and 5, and all power-of-ten multiples of these numbers.
     *
     * See "Nice Numbers for Graph Labels" of Graphic Gems.
     *
     * @param  {number} val Non-negative value.
     * @param  {boolean} round
     * @return {number}
     */
    number.nice = function (val, round) {
        var exponent = quantityExponent(val);
        var exp10 = Math.pow(10, exponent);
        var f = val / exp10; // 1 <= f < 10
        var nf;
        if (round) {
            if (f < 1.5) { nf = 1; }
            else if (f < 2.5) { nf = 2; }
            else if (f < 4) { nf = 3; }
            else if (f < 7) { nf = 5; }
            else { nf = 10; }
        }
        else {
            if (f < 1) { nf = 1; }
            else if (f < 2) { nf = 2; }
            else if (f < 3) { nf = 3; }
            else if (f < 5) { nf = 5; }
            else { nf = 10; }
        }
        val = nf * exp10;

        // Fix 3 * 0.1 === 0.30000000000000004 issue (see IEEE 754).
        // 20 is the uppper bound of toFixed.
        return exponent >= -20 ? +val.toFixed(exponent < 0 ? -exponent : 0) : val;
    };

    /**
     * Order intervals asc, and split them when overlap.
     * expect(numberUtil.reformIntervals([
     *     {interval: [18, 62], close: [1, 1]},
     *     {interval: [-Infinity, -70], close: [0, 0]},
     *     {interval: [-70, -26], close: [1, 1]},
     *     {interval: [-26, 18], close: [1, 1]},
     *     {interval: [62, 150], close: [1, 1]},
     *     {interval: [106, 150], close: [1, 1]},
     *     {interval: [150, Infinity], close: [0, 0]}
     * ])).toEqual([
     *     {interval: [-Infinity, -70], close: [0, 0]},
     *     {interval: [-70, -26], close: [1, 1]},
     *     {interval: [-26, 18], close: [0, 1]},
     *     {interval: [18, 62], close: [0, 1]},
     *     {interval: [62, 150], close: [0, 1]},
     *     {interval: [150, Infinity], close: [0, 0]}
     * ]);
     * @param {Array.<Object>} list, where `close` mean open or close
     *        of the interval, and Infinity can be used.
     * @return {Array.<Object>} The origin list, which has been reformed.
     */
    number.reformIntervals = function (list) {
        list.sort(function (a, b) {
            return littleThan(a, b, 0) ? -1 : 1;
        });

        var curr = -Infinity;
        var currClose = 1;
        for (var i = 0; i < list.length;) {
            var interval = list[i].interval;
            var close = list[i].close;

            for (var lg = 0; lg < 2; lg++) {
                if (interval[lg] <= curr) {
                    interval[lg] = curr;
                    close[lg] = !lg ? 1 - currClose : 1;
                }
                curr = interval[lg];
                currClose = close[lg];
            }

            if (interval[0] === interval[1] && close[0] * close[1] !== 1) {
                list.splice(i, 1);
            }
            else {
                i++;
            }
        }

        return list;

        function littleThan(a, b, lg) {
            return a.interval[lg] < b.interval[lg]
                || (
                    a.interval[lg] === b.interval[lg]
                    && (
                        (a.close[lg] - b.close[lg] === (!lg ? 1 : -1))
                        || (!lg && littleThan(a, b, 1))
                    )
                );
        }
    };

    /**
     * parseFloat NaNs numeric-cast false positives (null|true|false|"")
     * ...but misinterprets leading-number strings, particularly hex literals ("0x...")
     * subtraction forces infinities to NaN
     *
     * @param {*} v
     * @return {boolean}
     */
    number.isNumeric = function (v) {
        return v - parseFloat(v) >= 0;
    };

    return number;
});