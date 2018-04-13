import * as zrUtil from 'zrender/src/core/util';
import Axis from '../../coord/Axis';

/**
 * Extend axis 2d
 * @constructor module:echarts/coord/cartesian/Axis2D
 * @extends {module:echarts/coord/cartesian/Axis}
 * @param {string} dim
 * @param {*} scale
 * @param {Array.<number>} coordExtent
 * @param {string} axisType
 * @param {string} position
 */
var TimelineAxis = function (dim, scale, coordExtent, axisType) {

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
     * Axis model
     * @param {module:echarts/component/TimelineModel}
     */
    this.model = null;
};

TimelineAxis.prototype = {

    constructor: TimelineAxis,

    /**
     * @override
     */
    getLabelModel: function () {
        return this.model.getModel('label');
    },

    /**
     * @override
     */
    isHorizontal: function () {
        return this.model.get('orient') === 'horizontal';
    }

};

zrUtil.inherits(TimelineAxis, Axis);

export default TimelineAxis;