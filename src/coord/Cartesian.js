/**
 * Cartesian coordinate system
 * @module  echarts/coord/Cartesian
 *
 */
define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Axis = require('./CartesianAxis');

    function dimAxisMapper(dim) {
        return this._axis[dim];
    }

    /**
     * @alias module:echarts/coord/Cartesian
     * @constructor
     */
    var Cartesian = function (name) {
        this._axis = {};

        this._dimList = [];

        /**
         * @type {string}
         */
        this.name = name || '';
        /**
         * Series using this cartesian coordinate system
         * @type {Array.<Object>}
         */
        this.series = [];
    };

    Cartesian.prototype = {

        constructor: Cartesian,

        type: 'cartesian',

        /**
         * Get axis
         * @param  {number|string} dim
         * @return {module:echarts/coord/Cartesian~Axis}
         */
        getAxis: function (dim) {
            return this._axis[dim];
        },

        /**
         * Get axes list
         * @return {Array.<module:echarts/coord/Cartesian~Axis>}
         */
        getAxes: function () {
            return zrUtil.map(this._dimList, dimAxisMapper, this);
        },

        /**
         * Get axes list by given scale type
         */
        getAxesByScale: function (scaleType) {
            scaleType = scaleType.toLowerCase();
            return zrUtil.filter(
                this.getAxes(),
                function (axis) {
                    return axis.scale.type === scaleType;
                }
            );
        },

        /**
         * Create a basic axis
         * @param {number|string} dim
         * @return {module:echarts/coord/Cartesian.Axis}
         */
        createAxis: function (dim, scale, coordExtent) {
            var axis = new Axis(dim, scale, coordExtent);

            this.addAxis(axis);

            return axis;
        },

        /**
         * Add axis
         * @param {module:echarts/coord/Cartesian.Axis}
         */
        addAxis: function (axis) {
            var dim = axis.dimension;

            this._axis[dim] = axis;

            this._dimList.push(dim);
        },

        /**
         * Convert data to coord in nd space
         * @param {Array.<number>|Object.<string, number>} val
         * @return {Array.<number>|Object.<string, number>}
         */
        dataToCoord: function (val) {
            return this._dataCoordConvert(val, 'dataToCoord');
        },

        /**
         * Convert coord in nd space to data
         * @param  {Array.<number>|Object.<string, number>} val
         * @return {Array.<number>|Object.<string, number>}
         */
        coordToData: function (val) {
            return this._dataCoordConvert(val, 'coordToData');
        },

        _dataCoordConvert: function (input, method) {
            var dimList = this._dimList;

            var output = input instanceof Array ? [] : {};

            for (var i = 0; i < dimList.length; i++) {
                var dim = dimList[i];
                var axis = this._axis[axis];

                output[dim] = axis[method](input[dim]);
            }

            return output;
        }
    };

    return Cartesian;
});