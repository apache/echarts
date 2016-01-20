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
         * @param {Array.<string>}
         * @readOnly
         */
        this.dimensions = ['radius', 'angle'];

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
         * @param {Array.<number>} point
         * @return {boolean}
         */
        containPoint: function (point) {
            var coord = this.pointToCoord(point);
            return this._radiusAxis.contain(coord[0])
                && this._angleAxis.contain(coord[1]);
        },

        /**
         * If contain data
         * @param {Array.<number>} data
         * @return {boolean}
         */
        containData: function (data) {
            return this._radiusAxis.containData(data[0])
                && this._angleAxis.containData(data[1]);
        },

        /**
         * @param {string} axisType
         * @return {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
         */
        getAxis: function (axisType) {
            return this['_' + axisType + 'Axis'];
        },

        /**
         * Get axes by type of scale
         * @param {string} scaleType
         * @return {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
         */
        getAxesByScale: function (scaleType) {
            var axes = [];
            var angleAxis = this._angleAxis;
            var radiusAxis = this._radiusAxis;
            angleAxis.scale.type === scaleType && axes.push(angleAxis);
            radiusAxis.scale.type === scaleType && axes.push(radiusAxis);

            return axes;
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
         * @param {module:echarts/coord/polar/Axis}
         * @return {module:echarts/coord/polar/Axis}
         */
        getOtherAxis: function (axis) {
            var angleAxis = this._angleAxis;
            return axis === angleAxis ? this._radiusAxis : angleAxis;
        },

        /**
         * Base axis will be used on stacking.
         *
         * @return {module:echarts/coord/polar/Axis}
         */
        getBaseAxis: function () {
            return this.getAxesByScale('ordinal')[0]
                || this.getAxesByScale('time')[0]
                || this.getAngleAxis();
        },

        /**
         * Convert series data to a list of (x, y) points
         * @param {module:echarts/data/List} data
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToPoints: function (data) {
            return data.mapArray(this.dimensions, function (radius, angle) {
                return this.dataToPoint([radius, angle]);
            }, this);
        },

        /**
         * Convert a single data item to (x, y) point.
         * Parameter data is an array which the first element is radius and the second is angle
         * @param {Array.<number>} data
         * @param {boolean} [clamp=false]
         * @return {Array.<number>}
         */
        dataToPoint: function (data, clamp) {
            return this.coordToPoint([
                this._radiusAxis.dataToRadius(data[0], clamp),
                this._angleAxis.dataToAngle(data[1], clamp)
            ]);
        },

        /**
         * Convert a (x, y) point to data
         * @param {Array.<number>} point
         * @param {boolean} [clamp=false]
         * @return {Array.<number>}
         */
        pointToData: function (point, clamp) {
            var coord = this.pointToCoord(point);
            return [
                this._radiusAxis.radiusToData(coord[0], clamp),
                this._angleAxis.angleToData(coord[1], clamp)
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
            var angleAxis = this.getAngleAxis();
            var extent = angleAxis.getExtent();
            var minAngle = Math.min(extent[0], extent[1]);
            var maxAngle = Math.max(extent[0], extent[1]);
            // Fix fixed extent in polarCreator
            // FIXME
            angleAxis.inverse
                ? (minAngle = maxAngle - 360)
                : (maxAngle = minAngle + 360);

            var radius = Math.sqrt(dx * dx + dy * dy);
            dx /= radius;
            dy /= radius;

            var radian = Math.atan2(-dy, dx) / Math.PI * 180;

            // move to angleExtent
            var dir = radian < minAngle ? 1 : -1;
            while (radian < minAngle || radian > maxAngle) {
                radian += dir * 360;
            }

            return [radius, radian];
        },

        /**
         * Convert a (radius, angle) coord to (x, y) point
         * @param {Array.<number>} coord
         * @return {Array.<number>}
         */
        coordToPoint: function (coord) {
            var radius = coord[0];
            var radian = coord[1] / 180 * Math.PI;
            var x = Math.cos(radian) * radius + this.cx;
            // Inverse the y
            var y = -Math.sin(radian) * radius + this.cy;

            return [x, y];
        }
    };

    return Polar;
});