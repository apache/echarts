/**
 * @module echarts/coord/polar/Polar
 */
define(function(require) {

    'use strict';

    var RadiusAxis = require('./RadiusAxis');
    var AngleAxis = require('./AngleAxis');

    /**
     * @alias {module:echarts/coord/polar/Polar}
     * @constructor
     * @param {string} name
     */
    var Polar = function (name) {

        /**
         * @type {string}
         */
        this.name = name || '';

        /**
         * x of polar center
         * @type {number}
         */
        this.cx = 0;

        /**
         * y of polar center
         * @type {number}
         */
        this.cy = 0;

        /**
         * @type {module:echarts/coord/polar/RadiusAxis}
         * @private
         */
        this._radiusAxis = new RadiusAxis();

        /**
         * @type {module:echarts/coord/polar/AngleAxis}
         * @private
         */
        this._angleAxis = new AngleAxis();
    };

    Polar.prototype = {

        constructor: Polar,

        type: 'polar',

        /**
         * If contain coord
         */
        containPoint: function (point) {
            var coord = this.pointToCoord(point);
            return this._radiusAxis.contain(coord[0])
                && this._angleAxis.contain(coord[1]);
        },

        /**
         * @return {module:echarts/coord/polar/AngleAxis}
         */
        getAngleAxis: function () {
            return this._angleAxis;
        },

        /**
         * @return {module:echarts/coord/polar/RadiusAxis}
         */
        getRadiusAxis: function () {
            return this._radiusAxis;
        },

        /**
         * Convert series data to a list of (x, y) points
         * @param {module:echarts/data/List} data
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToPoints: function (data) {
            return data.map(function (dataItem) {
                return this.dataToPoint([dataItem.getRadius(true), dataItem.getAngle(true)]);
            }, this);
        },

        /**
         * Convert a single data item to (x, y) point.
         * Parameter data is an array which the first element is radius and the second is angle
         * @param {Array.<number>} data
         * @return {Array.<number>}
         */
        dataToPoint: function (data) {
            var radius = this._radiusAxis.dataToRadius(data[0]);
            var radian = this._angleAxis.dataToAngle(data[1]) / 180 * Math.PI;

            var x = Math.cos(radian) * radius + this.cx;
            var y = Math.sin(radian) * radius + this.cy;

            return [x, y];
        },

        /**
         * Convert a (x, y) point to data
         * @param {Array.<number>} point
         * @return {Array.<number>}
         */
        pointToData: function (point) {
            var coord = this.pointToCoord(point);

            return [
                this._radiusAxis.radiusToData(coord[0]),
                this._angleAxis.angleToData(coord[1]) / Math.PI * 180
            ];
        },

        /**
         * Convert a (x, y) point to (radius, angle) coord
         * @param {Array.<number>} point
         * @return {Array.<number>}
         */
        pointToCoord: function (point) {
            var dx = point[0] - this.cx;
            var dy = point[1] - this.cy;

            var radius = Math.sqrt(dx * dx + dy * dy);
            dx /= radius;
            dy /= radius;

            var angle = Math.atan2(dy, dx);

            return [radius, angle];
        }
    }

    return Polar;
});