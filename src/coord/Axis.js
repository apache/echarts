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
         * If axis extent contain give coord
         * @param {number}
         */
        contain: function (coord) {
            var extent = this._extent;
            var min = Math.min(extent[0], extent[1]);
            var max = Math.max(extent[0], extent[1]);
            return coord >= min && coord <= max;
        },

        /**
         * Get coord extent.
         * @return {Array.<number>}
         */
        getExtent: function () {
            var ret = this._extent.slice();
            this.inverse && ret.reverse();

            return ret;
        },

        /**
         * Set coord extent
         * @param {number} min
         * @param {number} max
         */
        setExtent: function (min, max) {
            var extent = this._extent;
            extent[0] = min;
            extent[1] = max;
        },

        /**
         * Convert data to coord. Data is the rank if it has a ordinal scale
         * @param {number} data
         * @param  {boolean} clamp
         * @return {number}
         */
        dataToCoord: function (data, clamp) {
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
         * Convert coord to data. Data is the rank if it has a ordinal scale
         * @param {number} coord
         * @param  {boolean} clamp
         * @return {number}
         */
        coordToData: function (coord, clamp) {
            var extent = this.getExtent();

            if (this.onBand) {
                fixExtentWithBands(extent, this.scale.count());
            }

            var t = linearMap(coord, extent, [0, 1], clamp);

            return this.scale.scale(t);
        },
        /**
         * @return {Array.<number>}
         */
        getTicksCoords: function () {
            if (this.onBand) {
                var bands = this.getBands();
                var coords = [];
                for (var i = 0; i < bands.length; i++) {
                    coords.push(bands[i][0]);
                }
                if (bands[i - 1]) {
                    coords.push(bands[i - 1][1]);
                }
                return coords;
            }
            else {
                return zrUtil.map(this.scale.getTicks(), this.dataToCoord, this);
            }
        },

        /**
         * Coords of labels are on the ticks or on the middle of bands
         * @return {Array.<number>}
         */
        getLabelsCoords: function () {
            if (this.onBand) {
                var bands = this.getBands();
                var coords = [];
                var band;
                for (var i = 0; i < bands.length; i++) {
                    band = bands[i];
                    coords.push((band[0] + band[1]) / 2);
                }
                return coords;
            }
            else {
                return zrUtil.map(this.scale.getTicks(), this.dataToCoord, this);
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
            var len = this.scale.count();
            var start = extent[0];
            var end = extent[1];
            var size = end - start;

            for (var i = 0; i < len; i++) {
                bands.push([
                    size * i / len + start,
                    size * (i + 1) / len + start
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