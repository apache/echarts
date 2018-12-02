
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

var textContain = require("zrender/lib/contain/text");

var Axis = require("../Axis");

var _model = require("../../util/model");

var makeInner = _model.makeInner;

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
var inner = makeInner();

function AngleAxis(scale, angleExtent) {
  angleExtent = angleExtent || [0, 360];
  Axis.call(this, 'angle', scale, angleExtent);
  /**
   * Axis type
   *  - 'category'
   *  - 'value'
   *  - 'time'
   *  - 'log'
   * @type {string}
   */

  this.type = 'category';
}

AngleAxis.prototype = {
  constructor: AngleAxis,

  /**
   * @override
   */
  pointToData: function (point, clamp) {
    return this.polar.pointToData(point, clamp)[this.dim === 'radius' ? 0 : 1];
  },
  dataToAngle: Axis.prototype.dataToCoord,
  angleToData: Axis.prototype.coordToData,

  /**
   * Only be called in category axis.
   * Angle axis uses text height to decide interval
   *
   * @override
   * @return {number} Auto interval for cateogry axis tick and label
   */
  calculateCategoryInterval: function () {
    var axis = this;
    var labelModel = axis.getLabelModel();
    var ordinalScale = axis.scale;
    var ordinalExtent = ordinalScale.getExtent(); // Providing this method is for optimization:
    // avoid generating a long array by `getTicks`
    // in large category data case.

    var tickCount = ordinalScale.count();

    if (ordinalExtent[1] - ordinalExtent[0] < 1) {
      return 0;
    }

    var tickValue = ordinalExtent[0];
    var unitSpan = axis.dataToCoord(tickValue + 1) - axis.dataToCoord(tickValue);
    var unitH = Math.abs(unitSpan); // Not precise, just use height as text width
    // and each distance from axis line yet.

    var rect = textContain.getBoundingRect(tickValue, labelModel.getFont(), 'center', 'top');
    var maxH = Math.max(rect.height, 7);
    var dh = maxH / unitH; // 0/0 is NaN, 1/0 is Infinity.

    isNaN(dh) && (dh = Infinity);
    var interval = Math.max(0, Math.floor(dh));
    var cache = inner(axis.model);
    var lastAutoInterval = cache.lastAutoInterval;
    var lastTickCount = cache.lastTickCount; // Use cache to keep interval stable while moving zoom window,
    // otherwise the calculated interval might jitter when the zoom
    // window size is close to the interval-changing size.

    if (lastAutoInterval != null && lastTickCount != null && Math.abs(lastAutoInterval - interval) <= 1 && Math.abs(lastTickCount - tickCount) <= 1 // Always choose the bigger one, otherwise the critical
    // point is not the same when zooming in or zooming out.
    && lastAutoInterval > interval) {
      interval = lastAutoInterval;
    } // Only update cache if cache not used, otherwise the
    // changing of interval is too insensitive.
    else {
        cache.lastTickCount = tickCount;
        cache.lastAutoInterval = interval;
      }

    return interval;
  }
};
zrUtil.inherits(AngleAxis, Axis);
var _default = AngleAxis;
module.exports = _default;