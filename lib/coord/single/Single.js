
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

var SingleAxis = require("./SingleAxis");

var axisHelper = require("../axisHelper");

var _layout = require("../../util/layout");

var getLayoutRect = _layout.getLayoutRect;

var _util = require("zrender/lib/core/util");

var each = _util.each;

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

/**
 * Single coordinates system.
 */

/**
 * Create a single coordinates system.
 *
 * @param {module:echarts/coord/single/AxisModel} axisModel
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 */
function Single(axisModel, ecModel, api) {
  /**
   * @type {string}
   * @readOnly
   */
  this.dimension = 'single';
  /**
   * Add it just for draw tooltip.
   *
   * @type {Array.<string>}
   * @readOnly
   */

  this.dimensions = ['single'];
  /**
   * @private
   * @type {module:echarts/coord/single/SingleAxis}.
   */

  this._axis = null;
  /**
   * @private
   * @type {module:zrender/core/BoundingRect}
   */

  this._rect;

  this._init(axisModel, ecModel, api);
  /**
   * @type {module:echarts/coord/single/AxisModel}
   */


  this.model = axisModel;
}

Single.prototype = {
  type: 'singleAxis',
  axisPointerEnabled: true,
  constructor: Single,

  /**
   * Initialize single coordinate system.
   *
   * @param  {module:echarts/coord/single/AxisModel} axisModel
   * @param  {module:echarts/model/Global} ecModel
   * @param  {module:echarts/ExtensionAPI} api
   * @private
   */
  _init: function (axisModel, ecModel, api) {
    var dim = this.dimension;
    var axis = new SingleAxis(dim, axisHelper.createScaleByModel(axisModel), [0, 0], axisModel.get('type'), axisModel.get('position'));
    var isCategory = axis.type === 'category';
    axis.onBand = isCategory && axisModel.get('boundaryGap');
    axis.inverse = axisModel.get('inverse');
    axis.orient = axisModel.get('orient');
    axisModel.axis = axis;
    axis.model = axisModel;
    axis.coordinateSystem = this;
    this._axis = axis;
  },

  /**
   * Update axis scale after data processed
   * @param  {module:echarts/model/Global} ecModel
   * @param  {module:echarts/ExtensionAPI} api
   */
  update: function (ecModel, api) {
    ecModel.eachSeries(function (seriesModel) {
      if (seriesModel.coordinateSystem === this) {
        var data = seriesModel.getData();
        each(data.mapDimension(this.dimension, true), function (dim) {
          this._axis.scale.unionExtentFromData(data, dim);
        }, this);
        axisHelper.niceScaleExtent(this._axis.scale, this._axis.model);
      }
    }, this);
  },

  /**
   * Resize the single coordinate system.
   *
   * @param  {module:echarts/coord/single/AxisModel} axisModel
   * @param  {module:echarts/ExtensionAPI} api
   */
  resize: function (axisModel, api) {
    this._rect = getLayoutRect({
      left: axisModel.get('left'),
      top: axisModel.get('top'),
      right: axisModel.get('right'),
      bottom: axisModel.get('bottom'),
      width: axisModel.get('width'),
      height: axisModel.get('height')
    }, {
      width: api.getWidth(),
      height: api.getHeight()
    });

    this._adjustAxis();
  },

  /**
   * @return {module:zrender/core/BoundingRect}
   */
  getRect: function () {
    return this._rect;
  },

  /**
   * @private
   */
  _adjustAxis: function () {
    var rect = this._rect;
    var axis = this._axis;
    var isHorizontal = axis.isHorizontal();
    var extent = isHorizontal ? [0, rect.width] : [0, rect.height];
    var idx = axis.reverse ? 1 : 0;
    axis.setExtent(extent[idx], extent[1 - idx]);

    this._updateAxisTransform(axis, isHorizontal ? rect.x : rect.y);
  },

  /**
   * @param  {module:echarts/coord/single/SingleAxis} axis
   * @param  {number} coordBase
   */
  _updateAxisTransform: function (axis, coordBase) {
    var axisExtent = axis.getExtent();
    var extentSum = axisExtent[0] + axisExtent[1];
    var isHorizontal = axis.isHorizontal();
    axis.toGlobalCoord = isHorizontal ? function (coord) {
      return coord + coordBase;
    } : function (coord) {
      return extentSum - coord + coordBase;
    };
    axis.toLocalCoord = isHorizontal ? function (coord) {
      return coord - coordBase;
    } : function (coord) {
      return extentSum - coord + coordBase;
    };
  },

  /**
   * Get axis.
   *
   * @return {module:echarts/coord/single/SingleAxis}
   */
  getAxis: function () {
    return this._axis;
  },

  /**
   * Get axis, add it just for draw tooltip.
   *
   * @return {[type]} [description]
   */
  getBaseAxis: function () {
    return this._axis;
  },

  /**
   * @return {Array.<module:echarts/coord/Axis>}
   */
  getAxes: function () {
    return [this._axis];
  },

  /**
   * @return {Object} {baseAxes: [], otherAxes: []}
   */
  getTooltipAxes: function () {
    return {
      baseAxes: [this.getAxis()]
    };
  },

  /**
   * If contain point.
   *
   * @param  {Array.<number>} point
   * @return {boolean}
   */
  containPoint: function (point) {
    var rect = this.getRect();
    var axis = this.getAxis();
    var orient = axis.orient;

    if (orient === 'horizontal') {
      return axis.contain(axis.toLocalCoord(point[0])) && point[1] >= rect.y && point[1] <= rect.y + rect.height;
    } else {
      return axis.contain(axis.toLocalCoord(point[1])) && point[0] >= rect.y && point[0] <= rect.y + rect.height;
    }
  },

  /**
   * @param {Array.<number>} point
   * @return {Array.<number>}
   */
  pointToData: function (point) {
    var axis = this.getAxis();
    return [axis.coordToData(axis.toLocalCoord(point[axis.orient === 'horizontal' ? 0 : 1]))];
  },

  /**
   * Convert the series data to concrete point.
   *
   * @param  {number|Array.<number>} val
   * @return {Array.<number>}
   */
  dataToPoint: function (val) {
    var axis = this.getAxis();
    var rect = this.getRect();
    var pt = [];
    var idx = axis.orient === 'horizontal' ? 0 : 1;

    if (val instanceof Array) {
      val = val[0];
    }

    pt[idx] = axis.toGlobalCoord(axis.dataToCoord(+val));
    pt[1 - idx] = idx === 0 ? rect.y + rect.height / 2 : rect.x + rect.width / 2;
    return pt;
  }
};
var _default = Single;
module.exports = _default;