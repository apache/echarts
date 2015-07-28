/**
 * 数值处理模块
 * @module echarts/core/number
 */

define(function (require) {

    /**
     * Linear mapping a value from domain to range
     * @memberOf module:echarts/core/number
     * @param  {number} val
     * @param  {Array.<number>} domain Domain extent
     * @param  {Array.<number>} range  Range extent
     * @param  {boolean} clamp
     * @return {number}
     */
    function linearMap (val, domain, range, clamp) {
        var sub = domain[1] - domain[0];

        if (sub === 0) {
            return val;
        }
        var t = (val - domain[0]) / sub;
        if (clamp) {
            t = Math.min(Math.max(t, 0), 1);
        }
        return t * (range[1] - range[0]) + range[0];
    };

    return {

        linearMap: linearMap
    }
});