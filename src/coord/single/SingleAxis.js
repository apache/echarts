define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('../Axis');
    var axisHelper = require('../axisHelper');

    /**
     * @constructor  module:echarts/coord/single/SingleAxis
     * @extends {module:echarts/coord/Axis}
     * @param {string} dim
     * @param {*} scale
     * @param {Array.<number>} coordExtent
     * @param {string} axisType
     * @param {string} position
     */
    var SingleAxis = function (dim, scale, coordExtent, axisType, position) {

        Axis.call(this, dim, scale, coordExtent);

        /**
         * Axis type
         * - 'category'
         * - 'value'
         * - 'time'
         * - 'log'
         * @type {string}
         */
        this.type = axisType || 'value';

        /**
         * Axis position
         *  - 'top'
         *  - 'bottom'
         *  - 'left'
         *  - 'right'
         *  @type {string}
         */
        this.position = position || 'bottom';

        /**
         * Axis orient
         *  - 'horizontal'
         *  - 'vertical'
         * @type {[type]}
         */
        this.orient = null;

        /**
         * @type {number}
         */
        this._labelInterval = null;

    };

    SingleAxis.prototype = {

        constructor: SingleAxis,

        /**
         * Axis model
         * @type {module:echarts/coord/single/AxisModel}
         */
        model: null,

        /**
         * Judge the orient of the axis.
         * @return {boolean}
         */
        isHorizontal: function () {
            var position = this.position;
            return position === 'top' || position === 'bottom';

        },

        /**
         * Get interval of the axis label.
         * @return {number}
         */
        getLabelInterval: function () {
            var labelInterval = this._labelInterval;
            if (!labelInterval) {
                var axisModel = this.model;
                var labelModel = axisModel.getModel('axisLabel');
                var interval = labelModel.get('interval');
                if (!(this.type === 'category' && interval === 'auto')) {

                    labelInterval = this._labelInterval = interval === 'auto' ? 0 : interval;
                    return labelInterval;
                }
                labelInterval = this._labelInterval =
                    axisHelper.getAxisLabelInterval(
                        zrUtil.map(this.scale.getTicks(), this.dataToCoord, this),
                        axisModel.getFormattedLabels(),
                        labelModel.getModel('textStyle').getFont(),
                        this.isHorizontal()
                    );
            }
            return labelInterval;
        },

        /**
         * @override
         */
        pointToData: function (point, clamp) {
            return this.coordinateSystem.pointToData(point, clamp)[0];
        },

        /**
         * Convert the local coord(processed by dataToCoord())
         * to global coord(concrete pixel coord).
         * designated by module:echarts/coord/single/Single.
         * @type {Function}
         */
        toGlobalCoord: null,

        /**
         * Convert the global coord to local coord.
         * designated by module:echarts/coord/single/Single.
         * @type {Function}
         */
        toLocalCoord: null

    };

    zrUtil.inherits(SingleAxis, Axis);

    return SingleAxis;
});