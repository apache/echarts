define(function (require) {

    var linearMap = require('../util/number').linearMap;
    var zrUtil = require('zrender/core/util');

    function fixExtentWithBands(extent, nTick) {
        var size = extent[1] - extent[0];
        var len = nTick;
        var margin = size / len / 2;
        extent[0] += margin;
        extent[1] -= margin;
    }
    /**
     * @name module:echarts/coord/CartesianAxis
     * @constructor
     */
    var Axis = function (dim, scale, extent) {

        /**
         * Axis dimension. Such as 'x', 'y', 'z', 'angle', 'radius'
         * @type {string}
         */
        this.dim = dim;

        /**
         * Axis scale
         * @type {module:echarts/coord/scale/*}
         */
        this.scale = scale;

        /**
         * @type {Array.<number>}
         * @private
         */
        this._extent = extent || [0, 0];

        /**
         * @type {boolean}
         */
        this.inverse = false;

        /**
         * Usually true when axis has a ordinal scale
         * @type {boolean}
         */
        this.onBand = false;
    };

    Axis.prototype = {

        constructor: Axis,

        /**
         * Get coord extent
         * @return {Array.<number>}
         */
        getExtent: function () {
            var ret = this._extent.slice();
            if (this.inverse) {
                ret.reverse();
            }
            return ret;
        },

        /**
         * Set coord extent
         * @param {number} start
         * @param {number} end
         */
        setExtent: function (start, end) {
            var extent = this._extent;
            extent[0] = start;
            extent[1] = end;
        },

        /**
         * Map a data to extent. Data is the rank if it has a ordinal scale
         * @param {number} data
         * @param  {boolean} clamp
         * @return {number}
         */
        mapData: function (data, clamp) {
            // PENDING
            if (data == null || data === '-') {
                return NaN;
            }
            data = this.scale.normalize(data);

            var extent = this.getExtent();
            if (this.onBand) {
                fixExtentWithBands(extent, this.scale.count());
            }

            return linearMap(data, [0, 1], extent, clamp);
        },

        /**
         * Unmap a data. Data is the rank if it has a ordinal scale
         * @param {number} mapped
         * @param  {boolean} clamp
         * @return {number}
         */
        unmapData: function (mapped, clamp) {
            var extent = this.getExtent();

            if (this.onBand) {
                fixExtentWithBands(extent, this.scale.count());
            }

            var t = linearMap(mapped, extent, [0, 1], clamp);

            return this.scale.scale(t);
        },
        /**
         * @return {Array.<number>}
         */
        getTicksPositions: function () {
            if (this.onBand) {
                var bands = this.getBands();
                var positions = [];
                for (var i = 0; i < bands.length; i++) {
                    positions.push(bands[i][0]);
                }
                if (bands[i - 1]) {
                    positions.push(bands[i - 1][1]);
                }
                return positions;
            }
            else {
                return zrUtil.map(this.scale.getTicks(), this.mapData, this);
            }
        },

        /**
         * Positions of labels are on the ticks or on the middle of bands
         * @return {Array.<number>}
         */
        getLabelsPositions: function () {
            if (this.onBand) {
                var bands = this.getBands();
                var positions = [];
                var band;
                for (var i = 0; i < bands.length; i++) {
                    band = bands[i];
                    positions.push((band[0] + band[1]) / 2);
                }
                return positions;
            }
            else {
                return zrUtil.map(this.scale.getTicks(), this.mapData, this);
            }
        },

        /**
         * Get bands.
         * If axis has ticks [1, 2, 3, 4]. Bands on the axis are
         * |---1---|---2---|---3---|---4---|.
         *
         * @return {Array}
         */
        getBands: function () {
            var extent = this._extent;
            var bands = [];
            var len = this.scale.count() + 1;
            var start = extent[0];
            var end = extent[1];
            var size = end - start;

            for (var i = 1; i <= len; i++) {
                bands.push([
                    size * (i - 1) / len + start,
                    size * i / len + start
                ]);
            }
            return bands;
        },

        /**
         * Get width of band
         * @return {number}
         */
        getBandWidth: function () {
            var axisExtent = this._extent;
            var extent = this.scale.getExtent();
            var len = extent[1] - extent[0] + 1;

            var size = axisExtent[1] - axisExtent[0];

            return Math.abs(size) / len;
        }
    };

    return Axis;
});