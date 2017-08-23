/**
 * Linear continuous scale
 * @module echarts/coord/scale/Ordinal
 *
 * http://en.wikipedia.org/wiki/Level_of_measurement
 */

// FIXME only one data
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Scale = require('./Scale');

    var scaleProto = Scale.prototype;

    var OrdinalScale = Scale.extend({

        type: 'ordinal',

        init: function (data, extent) {
            this._data = data;
            this._extent = extent || [0, data.length - 1];
        },

        parse: function (val) {
            return typeof val === 'string'
                ? zrUtil.indexOf(this._data, val)
                // val might be float.
                : Math.round(val);
        },

        contain: function (rank) {
            rank = this.parse(rank);
            return scaleProto.contain.call(this, rank)
                && this._data[rank] != null;
        },

        /**
         * Normalize given rank or name to linear [0, 1]
         * @param {number|string} [val]
         * @return {number}
         */
        normalize: function (val) {
            return scaleProto.normalize.call(this, this.parse(val));
        },

        scale: function (val) {
            return Math.round(scaleProto.scale.call(this, val));
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
         * Get item on rank n
         * @param {number} n
         * @return {string}
         */
        getLabel: function (n) {
            return this._data[n];
        },

        /**
         * @return {number}
         */
        count: function () {
            return this._extent[1] - this._extent[0] + 1;
        },

        /**
         * @override
         */
        unionExtentFromData: function (data, dim) {
            this.unionExtent(data.getDataExtent(dim, false));
        },

        niceTicks: zrUtil.noop,
        niceExtent: zrUtil.noop
    });

    /**
     * @return {module:echarts/scale/Time}
     */
    OrdinalScale.create = function () {
        return new OrdinalScale();
    };

    return OrdinalScale;
});