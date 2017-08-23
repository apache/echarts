define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('../Axis');

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