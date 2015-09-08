/**
 * Linear continuous scale
 * @module echarts/coord/scale/Ordinal
 *
 * http://en.wikipedia.org/wiki/Level_of_measurement
 */

// FIXME only one data
define(function (require) {

    /**
     * @alias module:echarts/coord/scale/Ordinal
     * @param {Array} list
     */
    var OrdinalScale = function (list) {
        this._list = [];
        /**
         * Extent of ordianl is the extent of rank
         * Default is 0...len(list)-1
         * @type {Array.<number>}
         */
        this._extent = [0, 0];

        if (list) {
            this.setExtentFromData(list);
        }
    };

    OrdinalScale.prototype = {

        constructor: OrdinalScale,

        type: 'ordinal',

        /**
         * Normalize given rank to linear [0, 1]
         * @return {number} [val]
         */
        normalize: function (val) {
            var extent = this._extent;
            // Only one data
            if (extent[1] === extent[0]) {
                return extent[0];
            }
            return (val - extent[0]) / (extent[1] - extent[0]);
        },

        /**
         * Scale normalized value
         * @param {number} val
         * @return {number}
         */
        scale: function (val) {
            var extent = this._extent;
            return Math.round(val * (extent[1] - extent[0]) + extent[0]);
        },

        /**
         * Set extent from data
         */
        setExtentFromData: function (list) {
            this._list = list;
            this._extent = [0, list.length - 1];
        },

        /**
         * Get extent
         * @return {Array.<number>}
         */
        getExtent: function () {
            return this._extent.slice();
        },

        /**
         * Set extent. Given extent will intersect with default extent 0...len(list)-1
         * @param {number} start
         * @param {number} end
         */
        setExtent: function (start, end) {
            var thisExtent = this._extent;
            thisExtent[0] = Math.max(start, 0);
            thisExtent[1] = Math.min(end, this._list.length - 1);
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
                labels.push(this._list[rank]);
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
         */
        getLabel: function (n) {
            return this._list[n];
        },

        // Do nothing
        niceTicks: function () {},
        niceExtent: function () {},
    };

    return OrdinalScale;
});