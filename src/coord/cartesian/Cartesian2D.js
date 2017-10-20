
import * as zrUtil from 'zrender/src/core/util';
import Cartesian from './Cartesian';

function Cartesian2D(name) {

    Cartesian.call(this, name);
}

Cartesian2D.prototype = {

    constructor: Cartesian2D,

    type: 'cartesian2d',

    /**
     * @type {Array.<string>}
     * @readOnly
     */
    dimensions: ['x', 'y'],

    /**
     * Base axis will be used on stacking.
     *
     * @return {module:echarts/coord/cartesian/Axis2D}
     */
    getBaseAxis: function () {
        return this.getAxesByScale('ordinal')[0]
            || this.getAxesByScale('time')[0]
            || this.getAxis('x');
    },

    /**
     * If contain point
     * @param {Array.<number>} point
     * @return {boolean}
     */
    containPoint: function (point) {
        var axisX = this.getAxis('x');
        var axisY = this.getAxis('y');
        return axisX.contain(axisX.toLocalCoord(point[0]))
            && axisY.contain(axisY.toLocalCoord(point[1]));
    },

    /**
     * If contain data
     * @param {Array.<number>} data
     * @return {boolean}
     */
    containData: function (data) {
        return this.getAxis('x').containData(data[0])
            && this.getAxis('y').containData(data[1]);
    },

    /**
     * @param {Array.<number>} data
     * @param {boolean} [clamp=false]
     * @return {Array.<number>}
     */
    dataToPoint: function (data, clamp) {
        var xAxis = this.getAxis('x');
        var yAxis = this.getAxis('y');
        return [
            xAxis.toGlobalCoord(xAxis.dataToCoord(data[0], clamp)),
            yAxis.toGlobalCoord(yAxis.dataToCoord(data[1], clamp))
        ];
    },

    /**
     * @param {Array.<number>} point
     * @param {boolean} [clamp=false]
     * @return {Array.<number>}
     */
    pointToData: function (point, clamp) {
        var xAxis = this.getAxis('x');
        var yAxis = this.getAxis('y');
        return [
            xAxis.coordToData(xAxis.toLocalCoord(point[0]), clamp),
            yAxis.coordToData(yAxis.toLocalCoord(point[1]), clamp)
        ];
    },

    /**
     * Get other axis
     * @param {module:echarts/coord/cartesian/Axis2D} axis
     */
    getOtherAxis: function (axis) {
        return this.getAxis(axis.dim === 'x' ? 'y' : 'x');
    }

};

zrUtil.inherits(Cartesian2D, Cartesian);

export default Cartesian2D;