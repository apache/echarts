define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('./Axis');

    /**
     * Extend axis 2d
     * @constructor module:echarts/coord/cartesian/Axis2D
     * @extends {module:echarts/coord/cartesian/Axis}
     * @param {string} dim
     * @param {*} scale
     * @param {Array.<number>} coordExtent
     * @param {string} axisType
     * @param {string} position
     *
     * @inner
     */
    var Axis2D = function (dim, scale, coordExtent, axisType, position) {
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
         * Axis position
         *  - 'top'
         *  - 'bottom'
         *  - 'left'
         *  - 'right'
         */
        this.position = position || 'bottom';

        /**
         * Coord on the other axis
         */
        this.otherCoord = 0;

        /**
         * Reference to the other axis
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        this.otherAxis = null;

        /**
         * @type {boolean}
         */
        this.boundaryGap = false;

        /**
         * If axis is on the zero coord of the other axis
         * @type {boolean}
         */
        this.onZero = false;
    };

    Axis2D.prototype = {

        constructor: Axis2D,

        isHorizontal: function () {
            var position = this.position;
            return position === 'top' || position === 'bottom';
        }
    };
    zrUtil.inherits(Axis2D, Axis);

    return Axis2D;
});