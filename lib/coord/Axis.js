
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

var _util = require("zrender/lib/core/util");

var each = _util.each;
var map = _util.map;

var _number = require("../util/number");

var linearMap = _number.linearMap;
var getPixelPrecision = _number.getPixelPrecision;

var _axisTickLabelBuilder = require("./axisTickLabelBuilder");

var createAxisTicks = _axisTickLabelBuilder.createAxisTicks;
var createAxisLabels = _axisTickLabelBuilder.createAxisLabels;
var calculateCategoryInterval = _axisTickLabelBuilder.calculateCategoryInterval;

/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/
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
    return getPixelPrecision(dataExtent || this.scale.getExtent(), this._extent);
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
  pointToData: function (point, clamp) {// Should be implemented in derived class if necessary.
  },

  /**
   * Different from `zrUtil.map(axis.getTicks(), axis.dataToCoord, axis)`,
   * `axis.getTicksCoords` considers `onBand`, which is used by
   * `boundaryGap:true` of category axis and splitLine and splitArea.
   * @param {Object} [opt]
   * @param {number} [opt.tickModel=axis.model.getModel('axisTick')]
   * @param {boolean} [opt.clamp] If `true`, the first and the last
   *        tick must be at the axis end points. Otherwise, clip ticks
   *        that outside the axis extent.
   * @return {Array.<Object>} [{
   *     coord: ...,
   *     tickValue: ...
   * }, ...]
   */
  getTicksCoords: function (opt) {
    opt = opt || {};
    var tickModel = opt.tickModel || this.getTickModel();
    var result = createAxisTicks(this, tickModel);
    var ticks = result.ticks;
    var ticksCoords = map(ticks, function (tickValue) {
      return {
        coord: this.dataToCoord(tickValue),
        tickValue: tickValue
      };
    }, this);
    var alignWithLabel = tickModel.get('alignWithLabel');
    fixOnBandTicksCoords(this, ticksCoords, result.tickCategoryInterval, alignWithLabel, opt.clamp);
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
    return createAxisLabels(this).labels;
  },

  /**
   * @return {module:echarts/coord/model/Model}
   */
  getLabelModel: function () {
    return this.model.getModel('axisLabel');
  },

  /**
   * Notice here we only get the default tick model. For splitLine
   * or splitArea, we should pass the splitLineModel or splitAreaModel
   * manually when calling `getTicksCoords`.
   * In GL, this method may be overrided to:
   * `axisModel.getModel('axisTick', grid3DModel.getModel('axisTick'));`
   * @return {module:echarts/coord/model/Model}
   */
  getTickModel: function () {
    return this.model.getModel('axisTick');
  },

  /**
   * Get width of band
   * @return {number}
   */
  getBandWidth: function () {
    var axisExtent = this._extent;
    var dataExtent = this.scale.getExtent();
    var len = dataExtent[1] - dataExtent[0] + (this.onBand ? 1 : 0); // Fix #2728, avoid NaN when only one data.

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
   * Only be called in category axis.
   * Can be overrided, consider other axes like in 3D.
   * @return {number} Auto interval for cateogry axis tick and label
   */
  calculateCategoryInterval: function () {
    return calculateCategoryInterval(this);
  }
};

function fixExtentWithBands(extent, nTick) {
  var size = extent[1] - extent[0];
  var len = nTick;
  var margin = size / len / 2;
  extent[0] += margin;
  extent[1] -= margin;
} // If axis has labels [1, 2, 3, 4]. Bands on the axis are
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

  if (!axis.onBand || alignWithLabel || !ticksLen) {
    return;
  }

  var axisExtent = axis.getExtent();
  var last;

  if (ticksLen === 1) {
    ticksCoords[0].coord = axisExtent[0];
    last = ticksCoords[1] = {
      coord: axisExtent[0]
    };
  } else {
    var shift = ticksCoords[1].coord - ticksCoords[0].coord;
    each(ticksCoords, function (ticksItem) {
      ticksItem.coord -= shift / 2;
      var tickCategoryInterval = tickCategoryInterval || 0; // Avoid split a single data item when odd interval.

      if (tickCategoryInterval % 2 > 0) {
        ticksItem.coord -= shift / ((tickCategoryInterval + 1) * 2);
      }
    });
    last = {
      coord: ticksCoords[ticksLen - 1].coord + shift
    };
    ticksCoords.push(last);
  }

  var inverse = axisExtent[0] > axisExtent[1];

  if (littleThan(ticksCoords[0].coord, axisExtent[0])) {
    clamp ? ticksCoords[0].coord = axisExtent[0] : ticksCoords.shift();
  }

  if (clamp && littleThan(axisExtent[0], ticksCoords[0].coord)) {
    ticksCoords.unshift({
      coord: axisExtent[0]
    });
  }

  if (littleThan(axisExtent[1], last.coord)) {
    clamp ? last.coord = axisExtent[1] : ticksCoords.pop();
  }

  if (clamp && littleThan(last.coord, axisExtent[1])) {
    ticksCoords.push({
      coord: axisExtent[1]
    });
  }

  function littleThan(a, b) {
    return inverse ? a > b : a < b;
  }
}

var _default = Axis;
module.exports = _default;