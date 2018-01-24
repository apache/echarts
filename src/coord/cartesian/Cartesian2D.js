
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
     * @param {Array.<number>} out
     * @return {Array.<number>}
     */
    dataToPoint: function (data, reserved, out) {
        var xAxis = this.getAxis('x');
        var yAxis = this.getAxis('y');
        out = out || [];
        out[0] = xAxis.toGlobalCoord(xAxis.dataToCoord(data[0]));
        out[1] = yAxis.toGlobalCoord(yAxis.dataToCoord(data[1]));
        return out;
    },

    /**
     * @param {Array.<number>} data
     * @param {Array.<number>} out
     * @return {Array.<number>}
     */
    clampData: function (data, out) {
        var xAxisExtent = this.getAxis('x').scale.getExtent();
        var yAxisExtent = this.getAxis('y').scale.getExtent();
        out = out || [];
        out[0] = Math.min(
            Math.max(Math.min(xAxisExtent[0], xAxisExtent[1]), data[0]),
            Math.max(xAxisExtent[0], xAxisExtent[1])
        );
        out[1] = Math.min(
            Math.max(Math.min(yAxisExtent[0], yAxisExtent[1]), data[1]),
            Math.max(yAxisExtent[0], yAxisExtent[1])
        );

        return out;
    },

    /**
     * @param {Array.<number>} point
     * @param {Array.<number>} out
     * @return {Array.<number>}
     */
    pointToData: function (point, out) {
        var xAxis = this.getAxis('x');
        var yAxis = this.getAxis('y');
        out = out || [];
        out[0] = xAxis.coordToData(xAxis.toLocalCoord(point[0]));
        out[1] = yAxis.coordToData(yAxis.toLocalCoord(point[1]));
        return out;
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