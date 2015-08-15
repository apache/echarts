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
         * @param {number} [xAxisIndex=0]
         * @param {number} [yAxisIndex=0]
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToCoords: function (data) {
            var xAxis = this.getAxis('x');
            var yAxis = this.getAxis('y');
            var xAxisCoords = data.mapX(xAxis.dataToCoord, xAxis);
            var yAxisCoords = data.mapY(yAxis.dataToCoord, yAxis);

            var xIndex = xAxis.isHorizontal() ? 0 : 1;
            // If y axis is category axis
            var categoryAxis = this.getAxisByScale('ordinal')[0];
            if (categoryAxis && categoryAxis.dim === 'y') {
                xIndex = 1 - xIndex;
            }

            return zrUtil.map(xAxisCoords, function (coord, idx) {
                var item = [];
                item[xIndex] = coord;
                item[1 - xIndex] = yAxisCoords[idx];
            });
        }
    };

    zrUtil.inherits(Cartesian2D, Cartesian);

    return Cartesian2D;
});