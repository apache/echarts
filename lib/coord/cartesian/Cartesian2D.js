
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

var zrUtil = require("zrender/lib/core/util");

var Cartesian = require("./Cartesian");

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
function Cartesian2D(name) {
  Cartesian.call(this, name);
}

Cartesian2D.prototype = {
  constructor: Cartesian2D,
  type: 'cartesian2d',

  /**
   * @type {Array.<string>}
   * @readOnly
   */
  dimensions: ['x', 'y'],

  /**
   * Base axis will be used on stacking.
   *
   * @return {module:echarts/coord/cartesian/Axis2D}
   */
  getBaseAxis: function () {
    return this.getAxesByScale('ordinal')[0] || this.getAxesByScale('time')[0] || this.getAxis('x');
  },

  /**
   * If contain point
   * @param {Array.<number>} point
   * @return {boolean}
   */
  containPoint: function (point) {
    var axisX = this.getAxis('x');
    var axisY = this.getAxis('y');
    return axisX.contain(axisX.toLocalCoord(point[0])) && axisY.contain(axisY.toLocalCoord(point[1]));
  },

  /**
   * If contain data
   * @param {Array.<number>} data
   * @return {boolean}
   */
  containData: function (data) {
    return this.getAxis('x').containData(data[0]) && this.getAxis('y').containData(data[1]);
  },

  /**
   * @param {Array.<number>} data
   * @param {Array.<number>} out
   * @return {Array.<number>}
   */
  dataToPoint: function (data, reserved, out) {
    var xAxis = this.getAxis('x');
    var yAxis = this.getAxis('y');
    out = out || [];
    out[0] = xAxis.toGlobalCoord(xAxis.dataToCoord(data[0]));
    out[1] = yAxis.toGlobalCoord(yAxis.dataToCoord(data[1]));
    return out;
  },

  /**
   * @param {Array.<number>} data
   * @param {Array.<number>} out
   * @return {Array.<number>}
   */
  clampData: function (data, out) {
    var xScale = this.getAxis('x').scale;
    var yScale = this.getAxis('y').scale;
    var xAxisExtent = xScale.getExtent();
    var yAxisExtent = yScale.getExtent();
    var x = xScale.parse(data[0]);
    var y = yScale.parse(data[1]);
    out = out || [];
    out[0] = Math.min(Math.max(Math.min(xAxisExtent[0], xAxisExtent[1]), x), Math.max(xAxisExtent[0], xAxisExtent[1]));
    out[1] = Math.min(Math.max(Math.min(yAxisExtent[0], yAxisExtent[1]), y), Math.max(yAxisExtent[0], yAxisExtent[1]));
    return out;
  },

  /**
   * @param {Array.<number>} point
   * @param {Array.<number>} out
   * @return {Array.<number>}
   */
  pointToData: function (point, out) {
    var xAxis = this.getAxis('x');
    var yAxis = this.getAxis('y');
    out = out || [];
    out[0] = xAxis.coordToData(xAxis.toLocalCoord(point[0]));
    out[1] = yAxis.coordToData(yAxis.toLocalCoord(point[1]));
    return out;
  },

  /**
   * Get other axis
   * @param {module:echarts/coord/cartesian/Axis2D} axis
   */
  getOtherAxis: function (axis) {
    return this.getAxis(axis.dim === 'x' ? 'y' : 'x');
  }
};
zrUtil.inherits(Cartesian2D, Cartesian);
var _default = Cartesian2D;
module.exports = _default;