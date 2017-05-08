define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Cartesian = require('./Cartesian');

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
         * Convert series data to an array of points
         * @param {module:echarts/data/List} data
         * @param {boolean} stack
         * @return {Array}
         *  Return array of points. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToPoints: function (data, stack) {
            return data.mapArray(['x', 'y'], function (x, y) {
                return this.dataToPoint([x, y]);
            }, stack, this);
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
        },

        /**
         * @inheritDoc
         */
        dataToCoordSize: function (dataSize, dataItem) {
            // dataItem is necessary in log axis.
            dataItem = dataItem || [0, 0];
            return zrUtil.map(['x', 'y'], function (dim, dimIdx) {
                var axis = this.getAxis(dim);
                var val = dataItem[dimIdx];
                var halfSize = dataSize[dimIdx] / 2;
                return axis.type === 'category'
                    ? axis.getBandWidth()
                    : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));
            }, this);
        },

        /**
         * @inheritDoc
         */
        prepareInfoForCustomSeries: function () {
            var rect = this.grid.getRect();
            return {
                coordSys: {
                    // The name exposed to user is always 'cartesian2d' but not 'grid'.
                    type: 'cartesian2d',
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                },
                api: {
                    coord: zrUtil.bind(this.dataToPoint, this),
                    size: zrUtil.bind(this.dataToCoordSize, this)
                }
            };
        }

    };

    zrUtil.inherits(Cartesian2D, Cartesian);

    return Cartesian2D;
});