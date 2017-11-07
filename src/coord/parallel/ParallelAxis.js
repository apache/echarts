import * as zrUtil from 'zrender/src/core/util';
import Axis from '../Axis';

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
    model: null,

    /**
     * @override
     */
    isHorizontal: function () {
        return this.coordinateSystem.getModel().get('layout') !== 'horizontal';
    }

};

zrUtil.inherits(ParallelAxis, Axis);

export default ParallelAxis;