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
         * Convert series data to coorindates
         * @param {module:echarts/data/List} data
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToCoords: function (data) {
            var xAxis = this.getAxis('x');
            var yAxis = this.getAxis('y');

            var xIndex = xAxis.isHorizontal() ? 0 : 1;

            return data.map(function (dataItem) {
                var coord = [];
                coord[xIndex] = xAxis.dataToCoord(dataItem.getX(true));
                coord[1 - xIndex] = yAxis.dataToCoord(dataItem.getY(true));
                return coord;
            }, this);
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