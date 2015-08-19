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
            var array = [];
            data.each(function (dataItem) {
                array.push(this.dataToCoord(dataItem));
            }, this);
            return array;
        },

        dataToCoord: function (dataItem) {
            var xAxis = this.getAxis('x');
            var yAxis = this.getAxis('y');

            var xIndex = xAxis.isHorizontal() ? 0 : 1;
            // If y axis is category axis
            var categoryAxis = this.getAxesByScale('ordinal')[0];
            var swapAxis = categoryAxis && categoryAxis.dim === 'y';
            var x = dataItem.getX();
            var y = dataItem.getY();

            var coord = [];
            coord[xIndex] = xAxis.dataToCoord(swapAxis ? y : x);
            coord[1 - xIndex] = yAxis.dataToCoord(swapAxis ? x : y);

            return coord;
        }
    };

    zrUtil.inherits(Cartesian2D, Cartesian);

    return Cartesian2D;
});