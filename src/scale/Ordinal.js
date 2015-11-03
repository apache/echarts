/**
 * Linear continuous scale
 * @module echarts/coord/scale/Ordinal
 *
 * http://en.wikipedia.org/wiki/Level_of_measurement
 */

// FIXME only one data
define(function (require) {

    var zrUtil = require('zrender/core/util');

    /**
     * @alias module:echarts/coord/scale/Ordinal
     * @param {Array} data
     * @param {Array.<number>} extent
     */
    var OrdinalScale = function (data, extent) {
        this._data = data;
        /**
         * Extent of ordinal is the extent of rank
         * Default is 0...len(data)-1
         * @type {Array.<number>}
         */
        this._extent = extent || [0, data.length - 1];
    };

    OrdinalScale.prototype = {

        constructor: OrdinalScale,

        type: 'ordinal',

        /**
         * If scale extent contain give value
         * @param {number}
         */
        contain: function (rank) {
            var extent = this._extent;
            return rank >= extent[0] && rank <= extent[1] && this._data[rank] != null;
        },

        /**
         * Normalize given rank or name to linear [0, 1]
         * @param {number|string} [val]
         * @return {number}
         */
        normalize: function (val) {
            if (isNaN(val)) { // Is string
                val = zrUtil.indexOf(this._data, val);
            }
            var extent = this._extent;
            // Only one data
            if (extent[1] === extent[0]) {
                return extent[0];
            }
            return (val - extent[0]) / (extent[1] - extent[0]);
        },

        /**
         * Scale normalized value to rank
         * @param {number} val
         * @return {number}
         */
        scale: function (val) {
            var extent = this._extent;
            return Math.round(val * (extent[1] - extent[0]) + extent[0]);
        },

        /**
         * Set extent from data
         * @param {Array.<number>} other
         */
        unionExtent: function (other) {
            var extent = this._extent;
            other[0] < extent[0] && (extent[0] = other[0]);
            other[1] > extent[1] && (extent[1] = other[1]);

            this.setExtent(extent[0], extent[1]);
        },

        /**
         * Get extent
         * @return {Array.<number>}
         */
        getExtent: function () {
            return this._extent.slice();
        },

        /**
         * Set extent. Given extent will intersect with default extent 0...len(data)-1
         * @param {number} start
         * @param {number} end
         */
        setExtent: function (start, end) {
            var thisExtent = this._extent;
            if (start != null) {
                thisExtent[0] = Math.max(start, 0);
            }
            if (end != null) {
                thisExtent[1] = Math.min(end, this._data.length - 1);
            }
        },

        /**
         * @return {Array}
         */
        getTicks: function () {
            var ticks = [];
            var extent = this._extent;
            var rank = extent[0];

            while (rank <= extent[1]) {
                ticks.push(rank);
                rank++;
            }

            return ticks;
        },

        /**
         * @return {Array.<string>}
         */
        getTicksLabels: function () {
            var labels = [];
            var extent = this._extent;
            var rank = extent[0];

            while (rank <= extent[1]) {
                labels.push(this._data[rank]);
                rank++;
            }
            return labels;
        },

        /**
         * @return {number}
         */
        count: function () {
            return this._extent[1] - this._extent[0] + 1;
        },

        /**
         * Get item on rank n
         * @param {number} n
         * @return {string}
         */
        getLabel: function (n) {
            return this._data[n];
        },

        // Do nothing
        niceTicks: function () {},
        niceExtent: function () {}
    };

    require('./scale').register(OrdinalScale);

    return OrdinalScale;
});