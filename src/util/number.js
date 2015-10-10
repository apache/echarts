/**
 * 数值处理模块
 * @module echarts/util/number
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');

    function _trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    /**
     * Linear mapping a value from domain to range
     * @memberOf module:echarts/util/number
     * @param  {(number|Array.<number>)} val
     * @param  {Array.<number>} domain Domain extent
     * @param  {Array.<number>} range  Range extent
     * @param  {boolean} clamp
     * @return {(number|Array.<number>}
     */
    function linearMap(val, domain, range, clamp) {

        if (zrUtil.isArray(val)) {
            return zrUtil.map(val, function (v) {
                return linearMap(v, domain, range, clamp);
            });
        }

        var sub = domain[1] - domain[0];

        if (sub === 0) {
            return domain[0];
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
    function parsePercent(percent, all) {
        switch (percent) {
            case 'center':
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

        return +percent;
    }

    /**
     * Fix rounding error of float numbers
     */
    function round(x) {
        // PENDING
        return +(+x).toFixed(12);
    }

    function asc(arr) {
        arr.sort(function (a, b) {
            return a - b;
        });
        return arr;
    }

    return {

        linearMap: linearMap,

        parsePercent: parsePercent,

        round: round,

        asc: asc
    };
});