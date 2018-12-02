
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

var ComponentModel = require("../../model/Component");

var makeStyleMapper = require("../../model/mixin/makeStyleMapper");

var axisModelCreator = require("../axisModelCreator");

var numberUtil = require("../../util/number");

var axisModelCommonMixin = require("../axisModelCommonMixin");

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
var AxisModel = ComponentModel.extend({
  type: 'baseParallelAxis',

  /**
   * @type {module:echarts/coord/parallel/Axis}
   */
  axis: null,

  /**
   * @type {Array.<Array.<number>}
   * @readOnly
   */
  activeIntervals: [],

  /**
   * @return {Object}
   */
  getAreaSelectStyle: function () {
    return makeStyleMapper([['fill', 'color'], ['lineWidth', 'borderWidth'], ['stroke', 'borderColor'], ['width', 'width'], ['opacity', 'opacity']])(this.getModel('areaSelectStyle'));
  },

  /**
   * The code of this feature is put on AxisModel but not ParallelAxis,
   * because axisModel can be alive after echarts updating but instance of
   * ParallelAxis having been disposed. this._activeInterval should be kept
   * when action dispatched (i.e. legend click).
   *
   * @param {Array.<Array<number>>} intervals interval.length === 0
   *                                          means set all active.
   * @public
   */
  setActiveIntervals: function (intervals) {
    var activeIntervals = this.activeIntervals = zrUtil.clone(intervals); // Normalize

    if (activeIntervals) {
      for (var i = activeIntervals.length - 1; i >= 0; i--) {
        numberUtil.asc(activeIntervals[i]);
      }
    }
  },

  /**
   * @param {number|string} [value] When attempting to detect 'no activeIntervals set',
   *                         value can not be input.
   * @return {string} 'normal': no activeIntervals set,
   *                  'active',
   *                  'inactive'.
   * @public
   */
  getActiveState: function (value) {
    var activeIntervals = this.activeIntervals;

    if (!activeIntervals.length) {
      return 'normal';
    }

    if (value == null || isNaN(value)) {
      return 'inactive';
    } // Simple optimization


    if (activeIntervals.length === 1) {
      var interval = activeIntervals[0];

      if (interval[0] <= value && value <= interval[1]) {
        return 'active';
      }
    } else {
      for (var i = 0, len = activeIntervals.length; i < len; i++) {
        if (activeIntervals[i][0] <= value && value <= activeIntervals[i][1]) {
          return 'active';
        }
      }
    }

    return 'inactive';
  }
});
var defaultOption = {
  type: 'value',

  /**
   * @type {Array.<number>}
   */
  dim: null,
  // 0, 1, 2, ...
  // parallelIndex: null,
  areaSelectStyle: {
    width: 20,
    borderWidth: 1,
    borderColor: 'rgba(160,197,232)',
    color: 'rgba(160,197,232)',
    opacity: 0.3
  },
  realtime: true,
  // Whether realtime update view when select.
  z: 10
};
zrUtil.merge(AxisModel.prototype, axisModelCommonMixin);

function getAxisType(axisName, option) {
  return option.type || (option.data ? 'category' : 'value');
}

axisModelCreator('parallel', AxisModel, getAxisType, defaultOption);
var _default = AxisModel;
module.exports = _default;