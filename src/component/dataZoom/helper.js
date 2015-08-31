/**
 * @file Data zoom helper
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');

    var helper = {};

    var AXIS_DIMS = ['x', 'y'];

    // FIXME
    // 公用？
    helper.eachAxisDim = function (callback, scope) {
        zrUtil.each(AXIS_DIMS, function (axisDim) {
            var names = {
                axisIndex: axisDim + 'AxisIndex',
                axis: axisDim + 'Axis',
                dim: axisDim
            };
            callback.call(scope, names);
        });
    };

    // FIXME
    // 公用？
    /**
     * If value1 is not null, then return value1, otherwise judget rest of values.
     * @param  {*...} values
     * @return {*} Final value
     */
    helper.retrieveValue = function (values) {
        for (var i = 0, len = arguments.length; i < len; i++) {
            if (arguments[i] != null) {
                return arguments[i];
            }
        }
    };

    // FIXME
    // 公用？
    /**
     * If value is not array, then translate it to array.
     * @param  {*} value
     * @return {Array} [value] or value
     */
    helper.toArray = function (value) {
        return zrUtil.isArray(value) ? value : (value == null ? [] : [value]);
    };

    return helper;
});