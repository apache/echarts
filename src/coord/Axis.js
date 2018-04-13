import {each, map, createHashMap} from 'zrender/src/core/util';
import {linearMap, getPixelPrecision} from '../util/number';
import * as axisHelper from './axisHelper';

var NORMALIZED_EXTENT = [0, 1];

/**
 * Base class of Axis.
 * @constructor
 */
var Axis = function (dim, scale, extent) {

    /**
     * Axis dimension. Such as 'x', 'y', 'z', 'angle', 'radius'.
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
     * Key: tickCategoryInterval
     * Value: {ticks, labels}
     * @private
     * @type {HashMap}
     */
    this._ticksCache = createHashMap();
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
        return getPixelPrecision(
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
     * Convert data to coord. Data is the rank if it has an ordinal scale
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

        return linearMap(data, NORMALIZED_EXTENT, extent, clamp);
    },

    /**
     * Convert coord to data. Data is the rank if it has an ordinal scale
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

        var t = linearMap(coord, extent, NORMALIZED_EXTENT, clamp);

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
     * Different from `zrUtil.map(axis.getTicks(), axis.dataToCoord, axis)`,
     * `axis.getTicksCoords` considers `onBand`, which is used by
     * `boundaryGap:true` of category axis and splitLine and splitArea.
     * @param {Object} [opt]
     * @param {number} [opt.tickModel=axis.model.getModel('axisTick')]
     * @param {boolean} [opt.clamp] If `false`, clip. If `true`, clamp.
     * @return {Array.<Object>} [{
     *     coord: ...,
     *     tickValue: ...
     * }, ...]
     */
    getTicksCoords: function (opt) {
        opt = opt || {};

        var tickModel = opt.tickModel || this.model.getModel('axisTick');
        var alignWithLabel = tickModel.get('alignWithLabel');
        var tickCategoryInterval = tickModel.get('interval');

        var result = axisHelper.createAxisTicksAndLabels(this, {
            tickCategoryInterval: tickCategoryInterval
        });
        var ticks = result.ticks;

        var ticksCoords = map(ticks, function (tickValue) {
            return {
                coord: this.dataToCoord(tickValue),
                tickValue: tickValue
            };
        }, this);

        fixOnBandTicksCoords(
            this, ticksCoords, result.tickCategoryInterval, alignWithLabel, opt.clamp
        );

        return ticksCoords;
    },

    /**
     * @return {Array.<Object>} [{
     *     formattedLabel: string,
     *     rawLabel: axis.scale.getLabel(tickValue)
     *     tickValue: number
     * }, ...]
     */
    getViewLabels: function () {
        return axisHelper.createAxisTicksAndLabels(this, {
            tickCategoryInterval: this.model.get('axisTick.interval')
        }).labels;
    },

    getLabelModel: function () {
        return this.model.getModel('axisLabel');
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
    getRotate: null

};

function fixExtentWithBands(extent, nTick) {
    var size = extent[1] - extent[0];
    var len = nTick;
    var margin = size / len / 2;
    extent[0] += margin;
    extent[1] -= margin;
}

// If axis has labels [1, 2, 3, 4]. Bands on the axis are
// |---1---|---2---|---3---|---4---|.
// So the displayed ticks and splitLine/splitArea should between
// each data item, otherwise cause misleading (e.g., split tow bars
// of a single data item when there are two bar series).
// Also consider if tickCategoryInterval > 0 and onBand, ticks and
// splitLine/spliteArea should layout appropriately corresponding
// to displayed labels. (So we should not use `getBandWidth` in this
// case).
function fixOnBandTicksCoords(axis, ticksCoords, tickCategoryInterval, alignWithLabel, clamp) {
    var ticksLen = ticksCoords.length;
    if (axis.onBand && !alignWithLabel && ticksLen) {
        var axisExtent = axis.getExtent();
        var last;
        if (ticksLen === 1) {
            ticksCoords[0].coord = axisExtent[0];
            last = ticksCoords[1] = {coord: axisExtent[0]};
        }
        else {
            var shift = (ticksCoords[1].coord - ticksCoords[0].coord);
            each(ticksCoords, function (ticksItem) {
                ticksItem.coord -= shift / 2;
                var tickCategoryInterval = tickCategoryInterval || 0;
                // Avoid split a single data item when odd interval.
                if (tickCategoryInterval % 2 > 0) {
                    ticksItem.coord -= shift / ((tickCategoryInterval + 1) * 2);
                }
            });
            last = {coord: ticksCoords[ticksLen - 1].coord + shift};
            ticksCoords.push(last);
        }

        var inverse = axisExtent[0] > axisExtent[1];
        if (inverse
            ? ticksCoords[0].coord > axisExtent[0]
            : ticksCoords[0].coord < axisExtent[0]
        ) {
            clamp ? (ticksCoords[0].coord = axisExtent[0]) : ticksCoords.shift();
        }
        if (inverse
            ? last.coord < axisExtent[1]
            : last.coord > axisExtent[1]
        ) {
            clamp ? (last.coord = axisExtent[1]) : ticksCoords.pop();
        }
    }
}

export default Axis;
