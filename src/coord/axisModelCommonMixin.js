import * as zrUtil from 'zrender/src/core/util';
import * as axisHelper from './axisHelper';

export default {

    /**
     * Format labels
     * @return {Array.<string>}
     */
    getFormattedLabels: function () {
        return axisHelper.getFormattedLabels(
            this.axis,
            this.get('axisLabel.formatter')
        );
    },

    /**
     * @param {boolean} origin
     * @return {number|string} min value or 'dataMin' or null/undefined (means auto) or NaN
     */
    getMin: function (origin) {
        var option = this.option;
        var min = (!origin && option.rangeStart != null)
            ? option.rangeStart : option.min;

        if (this.axis
            && min != null
            && min !== 'dataMin'
            && typeof min !== 'function'
            && !zrUtil.eqNaN(min)
        ) {
            min = this.axis.scale.parse(min);
        }
        return min;
    },

    /**
     * @param {boolean} origin
     * @return {number|string} max value or 'dataMax' or null/undefined (means auto) or NaN
     */
    getMax: function (origin) {
        var option = this.option;
        var max = (!origin && option.rangeEnd != null)
            ? option.rangeEnd : option.max;

        if (this.axis
            && max != null
            && max !== 'dataMax'
            && typeof max !== 'function'
            && !zrUtil.eqNaN(max)
        ) {
            max = this.axis.scale.parse(max);
        }
        return max;
    },

    /**
     * @return {boolean}
     */
    getNeedCrossZero: function () {
        var option = this.option;
        return (option.rangeStart != null || option.rangeEnd != null)
            ? false : !option.scale;
    },

    /**
     * Should be implemented by each axis model if necessary.
     * @return {module:echarts/model/Component} coordinate system model
     */
    getCoordSysModel: zrUtil.noop,

    /**
     * @param {number} rangeStart Can only be finite number or null/undefined or NaN.
     * @param {number} rangeEnd Can only be finite number or null/undefined or NaN.
     */
    setRange: function (rangeStart, rangeEnd) {
        this.option.rangeStart = rangeStart;
        this.option.rangeEnd = rangeEnd;
    },

    /**
     * Reset range
     */
    resetRange: function () {
        // rangeStart and rangeEnd is readonly.
        this.option.rangeStart = this.option.rangeEnd = null;
    }
};