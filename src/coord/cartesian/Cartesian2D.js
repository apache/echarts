define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Cartesian = require('./Cartesian');

    function Cartesian2D(name) {

        Cartesian.call(this, name);
    }

    Cartesian2D.prototype = {

        type: 'cartesian2d',

        /**
         * If contain point
         */
        containPoint: function (point) {
            return this.getAxis('x').contain(point[0])
                && this.getAxis('y').contain(point[1]);
        },

        /**
         * Convert series data to a list of points
         * @param {module:echarts/data/List} data
         * @param {boolean} stack
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToPoints: function (data, stack) {
            return data.map(['x', 'y'], function (x, y) {
                return this.dataToPoint([x, y]);
            }, stack, this);
        },

        /**
         * @param {Array.<number>} data
         * @return {Array.<number>}
         */
        dataToPoint: function (data) {
            return [
                this.getAxis('x').dataToCoord(data[0]),
                this.getAxis('y').dataToCoord(data[1])
            ];
        },

        /**
         * @param {Array.<number>} point
         * @return {Array.<number>}
         */
        pointToData: function (point) {
            return [
                this.getAxis('x').coordToData(point[0]),
                this.getAxis('y').coordToData(point[1])
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

    return Cartesian2D;
});