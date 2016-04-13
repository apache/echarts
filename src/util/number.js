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

        var sub = domain[1] - domain[0];

        if (sub === 0) {
            return (range[0] + range[1]) / 2;
        }
        var t = (val - domain[0]) / sub;

        if (clamp) {
            t = Math.min(Math.max(t, 0), 1);
        }

        return t * (range[1] - range[0]) + range[0];
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
     * Fix rounding error of float numbers
     * @param {number} x
     * @return {number}
     */
    number.round = function (x) {
        // PENDING
        return +(+x).toFixed(10);
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
     * @param {Array.<number>} dataExtent
     * @param {Array.<number>} pixelExtent
     * @return {number}  precision
     */
    number.getPixelPrecision = function (dataExtent, pixelExtent) {
        var log = Math.log;
        var LN10 = Math.LN10;
        var dataQuantity = Math.floor(log(dataExtent[1] - dataExtent[0]) / LN10);
        var sizeQuantity = Math.round(log(Math.abs(pixelExtent[1] - pixelExtent[0])) / LN10);
        return Math.max(
            -dataQuantity + sizeQuantity,
            0
        );
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

    /**
     * @param {string|Date|number} value
     * @return {number} timestamp
     */
    number.parseDate = function (value) {
        return value instanceof Date
            ? value
            : new Date(
                typeof value === 'string'
                    ? value.replace(/-/g, '/')
                    : Math.round(value)
            );
    };

    // "Nice Numbers for Graph Labels" of Graphic Gems
    /**
     * find a “nice” number approximately equal to x. Round the number if round = true, take ceiling if round = false
     * The primary observation is that the “nicest” numbers in decimal are 1, 2, and 5, and all power-of-ten multiples of these numbers.
     * @param  {number} val
     * @param  {boolean} round
     * @return {number}
     */
    number.nice = function (val, round) {
        var exp = Math.floor(Math.log(val) / Math.LN10);
        var exp10 = Math.pow(10, exp);
        var f = val / exp10; // between 1 and 10
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
        return nf * exp10;
    };

    return number;
});