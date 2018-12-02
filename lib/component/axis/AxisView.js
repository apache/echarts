
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

var _config = require("../../config");

var __DEV__ = _config.__DEV__;

var echarts = require("../../echarts");

var axisPointerModelHelper = require("../axisPointer/modelHelper");

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
 * Base class of AxisView.
 */
var AxisView = echarts.extendComponentView({
  type: 'axis',

  /**
   * @private
   */
  _axisPointer: null,

  /**
   * @protected
   * @type {string}
   */
  axisPointerClass: null,

  /**
   * @override
   */
  render: function (axisModel, ecModel, api, payload) {
    // FIXME
    // This process should proformed after coordinate systems updated
    // (axis scale updated), and should be performed each time update.
    // So put it here temporarily, although it is not appropriate to
    // put a model-writing procedure in `view`.
    this.axisPointerClass && axisPointerModelHelper.fixValue(axisModel);
    AxisView.superApply(this, 'render', arguments);
    updateAxisPointer(this, axisModel, ecModel, api, payload, true);
  },

  /**
   * Action handler.
   * @public
   * @param {module:echarts/coord/cartesian/AxisModel} axisModel
   * @param {module:echarts/model/Global} ecModel
   * @param {module:echarts/ExtensionAPI} api
   * @param {Object} payload
   */
  updateAxisPointer: function (axisModel, ecModel, api, payload, force) {
    updateAxisPointer(this, axisModel, ecModel, api, payload, false);
  },

  /**
   * @override
   */
  remove: function (ecModel, api) {
    var axisPointer = this._axisPointer;
    axisPointer && axisPointer.remove(api);
    AxisView.superApply(this, 'remove', arguments);
  },

  /**
   * @override
   */
  dispose: function (ecModel, api) {
    disposeAxisPointer(this, api);
    AxisView.superApply(this, 'dispose', arguments);
  }
});

function updateAxisPointer(axisView, axisModel, ecModel, api, payload, forceRender) {
  var Clazz = AxisView.getAxisPointerClass(axisView.axisPointerClass);

  if (!Clazz) {
    return;
  }

  var axisPointerModel = axisPointerModelHelper.getAxisPointerModel(axisModel);
  axisPointerModel ? (axisView._axisPointer || (axisView._axisPointer = new Clazz())).render(axisModel, axisPointerModel, api, forceRender) : disposeAxisPointer(axisView, api);
}

function disposeAxisPointer(axisView, ecModel, api) {
  var axisPointer = axisView._axisPointer;
  axisPointer && axisPointer.dispose(ecModel, api);
  axisView._axisPointer = null;
}

var axisPointerClazz = [];

AxisView.registerAxisPointerClass = function (type, clazz) {
  axisPointerClazz[type] = clazz;
};

AxisView.getAxisPointerClass = function (type) {
  return type && axisPointerClazz[type];
};

var _default = AxisView;
module.exports = _default;