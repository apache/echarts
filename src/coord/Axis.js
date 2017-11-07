
import * as zrUtil from 'zrender/src/core/util';
import * as numberUtil from '../util/number';
import * as axisHelper from './axisHelper';

var linearMap = numberUtil.linearMap;

function fixExtentWithBands(extent, nTick) {
    var size = extent[1] - extent[0];
    var len = nTick;
    var margin = size / len / 2;
    extent[0] += margin;
    extent[1] -= margin;
}

var normalizedExtent = [0, 1];
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

    /**
     * @private
     * @type {number}
     */
    this._labelInterval;
};

Axis.prototype = {

    constructor: Axis,

    /**
     * If axis extent contain given coord
     * @param {number} coord
     * @return {boolean}
     */
    contain: function (coord) {
        var extent = this._extent;
        var min = Math.min(extent[0], extent[1]);
        var max = Math.max(extent[0], extent[1]);
        return coord >= min && coord <= max;
    },

    /**
     * If axis extent contain given data
     * @param {number} data
     * @return {boolean}
     */
    containData: function (data) {
        return this.contain(this.dataToCoord(data));
    },

    /**
     * Get coord extent.
     * @return {Array.<number>}
     */
    getExtent: function () {
        return this._extent.slice();
    },

    /**
     * Get precision used for formatting
     * @param {Array.<number>} [dataExtent]
     * @return {number}
     */
    getPixelPrecision: function (dataExtent) {
        return numberUtil.getPixelPrecision(
            dataExtent || this.scale.getExtent(),
            this._extent
        );
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
     * Convert data to coord. Data is the rank if it has a ordinal scale
     * @param {number} data
     * @param  {boolean} clamp
     * @return {number}
     */
    dataToCoord: function (data, clamp) {
        var extent = this._extent;
        var scale = this.scale;
        data = scale.normalize(data);

        if (this.onBand && scale.type === 'ordinal') {
            extent = extent.slice();
            fixExtentWithBands(extent, scale.count());
        }

        return linearMap(data, normalizedExtent, extent, clamp);
    },

    /**
     * Convert coord to data. Data is the rank if it has a ordinal scale
     * @param {number} coord
     * @param  {boolean} clamp
     * @return {number}
     */
    coordToData: function (coord, clamp) {
        var extent = this._extent;
        var scale = this.scale;

        if (this.onBand && scale.type === 'ordinal') {
            extent = extent.slice();
            fixExtentWithBands(extent, scale.count());
        }

        var t = linearMap(coord, extent, normalizedExtent, clamp);

        return this.scale.scale(t);
    },

    /**
     * Convert pixel point to data in axis
     * @param {Array.<number>} point
     * @param  {boolean} clamp
     * @return {number} data
     */
    pointToData: function (point, clamp) {
        // Should be implemented in derived class if necessary.
    },

    /**
     * @return {Array.<number>}
     */
    getTicksCoords: function (alignWithLabel) {
        if (this.onBand && !alignWithLabel) {
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
        return zrUtil.map(this.scale.getTicks(), this.dataToCoord, this);
    },

    /**
     * Get bands.
     *
     * If axis has labels [1, 2, 3, 4]. Bands on the axis are
     * |---1---|---2---|---3---|---4---|.
     *
     * @return {Array}
     */
        // FIXME Situation when labels is on ticks
    getBands: function () {
        var extent = this.getExtent();
        var bands = [];
        var len = this.scale.count();
        var start = extent[0];
        var end = extent[1];
        var span = end - start;

        for (var i = 0; i < len; i++) {
            bands.push([
                span * i / len + start,
                span * (i + 1) / len + start
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
        var dataExtent = this.scale.getExtent();

        var len = dataExtent[1] - dataExtent[0] + (this.onBand ? 1 : 0);
        // Fix #2728, avoid NaN when only one data.
        len === 0 && (len = 1);

        var size = Math.abs(axisExtent[1] - axisExtent[0]);

        return Math.abs(size) / len;
    },

    /**
     * @abstract
     * @return {boolean} Is horizontal
     */
    isHorizontal: null,

    /**
     * @abstract
     * @return {number} Get axis rotate, by degree.
     */
    getRotate: null,

    /**
     * Get interval of the axis label.
     * To get precise result, at least one of `getRotate` and `isHorizontal`
     * should be implemented.
     * @return {number}
     */
    getLabelInterval: function () {
        var labelInterval = this._labelInterval;
        if (!labelInterval) {
            var axisModel = this.model;
            var labelModel = axisModel.getModel('axisLabel');
            labelInterval = labelModel.get('interval');

            if (this.type === 'category'
                && (labelInterval == null || labelInterval === 'auto')
            ) {
                labelInterval = axisHelper.getAxisLabelInterval(
                    zrUtil.map(this.scale.getTicks(), this.dataToCoord, this),
                    axisModel.getFormattedLabels(),
                    labelModel.getFont(),
                    this.getRotate
                        ? this.getRotate()
                        : (this.isHorizontal && !this.isHorizontal())
                        ? 90
                        : 0,
                    labelModel.get('rotate')
                );
            }

            this._labelInterval = labelInterval;
        }
        return labelInterval;
    }

};

export default Axis;