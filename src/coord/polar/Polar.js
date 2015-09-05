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
         * Convert series data to a list of coorindates
         * @param {module:echarts/data/List} data
         * @return {Array}
         *  Return list of coordinates. For example:
         *  `[[10, 10], [20, 20], [30, 30]]`
         */
        dataToCoords: function (data) {
            return data.map(function (dataItem) {
                return this.dataToCoord([dataItem.getRadius(), dataItem.getAngle()]);
            }, this);
        },

        /**
         * Convert a single data item to coordinate.
         * Parameter data is an array which the first element is radius and the second is angle
         * @param {Array.<number>} data
         * @return {Array.<number>}
         */
        dataToCoord: function (data) {
            var radius = this._radiusAxis.dataToRadius(data[0]);
            var angle = this._angleAxis.dataToAngle(data[1]);

            var x = Math.cos(angle) * radius + this.cx;
            var y = Math.sin(angle) * radius + this.cy;

            return [x, y];
        },

        /**
         * Convert a coord to data
         * @param {Array.<number>} coord
         * @return {Array.<number>}
         */
        coordToData: function (coord) {
            var dx = coord[0] - this.cx;
            var dy = coord[1] - this.cy;

            var radius = Math.sqrt(dx * dx + dy * dy);
            dx /= radius;
            dy /= radius;

            var angle = Math.atan2(dy, dx);

            return [
                this._radiusAxis.radiusToData(radius),
                this._angleAxis.angleToData(angle)
            ];
        }
    }

    return Polar;
});