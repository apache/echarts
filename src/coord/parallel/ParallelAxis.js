define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('../Axis');

    /**
     * @constructor module:echarts/coord/parallel/ParallelAxis
     * @extends {module:echarts/coord/Axis}
     * @param {string} dim
     * @param {*} scale
     * @param {Array.<number>} coordExtent
     * @param {string} axisType
     */
    var ParallelAxis = function (dim, scale, coordExtent, axisType, axisIndex) {

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
         * @type {number}
         * @readOnly
         */
        this.axisIndex = axisIndex;
    };

    ParallelAxis.prototype = {

        constructor: ParallelAxis,

        /**
         * Axis model
         * @param {module:echarts/coord/parallel/AxisModel}
         */
        model: null

    };

    zrUtil.inherits(ParallelAxis, Axis);

    return ParallelAxis;
});