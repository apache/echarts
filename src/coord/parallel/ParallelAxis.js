define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('../Axis');
    var numberUtil = require('../../util/number');

    /**
     * @constructor module:echarts/coord/parallel/ParallelAxis
     * @extends {module:echarts/coord/Axis}
     * @param {string} dim
     * @param {*} scale
     * @param {Array.<number>} coordExtent
     * @param {string} axisType
     */
    var ParallelAxis = function (dim, scale, coordExtent, axisType) {

        Axis.call(this, dim, scale, coordExtent);

        /**
         * Axis type
         *  - 'category'
         *  - 'value'
         *  - 'time'
         *  - 'log'
         * @type {string}
         */
        this.type = axisType || 'value';

        /**
         * null means all active. Empty array means no active.
         *
         * @type {Array.<Array.<number>}
         * @private
         */
        this._activeIntervals = null;
    };

    ParallelAxis.prototype = {

        constructor: ParallelAxis,

        /**
         * Axis model
         * @param {module:echarts/coord/parallel/AxisModel}
         */
        model: null,

        /**
         * @param {Array.<Array<number>>|boolan} interval If input true, means set all active.
         * @public
         */
        setActiveIntervals: function (intervals) {
            var activeIntervals = this._activeIntervals = intervals === true
                ? null
                : zrUtil.clone(intervals, true);

            // Normalize
            if (activeIntervals) {
                for (var i = activeIntervals.length - 1; i >= 0; i--) {
                    numberUtil.asc(activeIntervals[i]);
                }
            }
        },

        /**
         * @param {number} [value] When attempting to detect 'no activeIntervals set',
         *                         value can not be input.
         * @return {boolean|string} When no activeIntervals set, it returns null,
         *                          which means active.
         * @public
         */
        isActive: function (value) {
            var activeIntervals = this._activeIntervals;

            if (!activeIntervals) {
                return null;
            }

            if (value == null) {
                return false;
            }

            for (var i = 0, len = activeIntervals.length; i < len; i++) {
                if (activeIntervals[i][0] <= value && value <= activeIntervals[i][1]) {
                    return true;
                }
            }
            return false;
        }
    };

    zrUtil.inherits(ParallelAxis, Axis);

    return ParallelAxis;
});