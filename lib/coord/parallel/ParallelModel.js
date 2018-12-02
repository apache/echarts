
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

var Component = require("../../model/Component");

require("./AxisModel");

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
var _default = Component.extend({
  type: 'parallel',
  dependencies: ['parallelAxis'],

  /**
   * @type {module:echarts/coord/parallel/Parallel}
   */
  coordinateSystem: null,

  /**
   * Each item like: 'dim0', 'dim1', 'dim2', ...
   * @type {Array.<string>}
   * @readOnly
   */
  dimensions: null,

  /**
   * Coresponding to dimensions.
   * @type {Array.<number>}
   * @readOnly
   */
  parallelAxisIndex: null,
  layoutMode: 'box',
  defaultOption: {
    zlevel: 0,
    z: 0,
    left: 80,
    top: 60,
    right: 80,
    bottom: 60,
    // width: {totalWidth} - left - right,
    // height: {totalHeight} - top - bottom,
    layout: 'horizontal',
    // 'horizontal' or 'vertical'
    // FIXME
    // naming?
    axisExpandable: false,
    axisExpandCenter: null,
    axisExpandCount: 0,
    axisExpandWidth: 50,
    // FIXME '10%' ?
    axisExpandRate: 17,
    axisExpandDebounce: 50,
    // [out, in, jumpTarget]. In percentage. If use [null, 0.05], null means full.
    // Do not doc to user until necessary.
    axisExpandSlideTriggerArea: [-0.15, 0.05, 0.4],
    axisExpandTriggerOn: 'click',
    // 'mousemove' or 'click'
    parallelAxisDefault: null
  },

  /**
   * @override
   */
  init: function () {
    Component.prototype.init.apply(this, arguments);
    this.mergeOption({});
  },

  /**
   * @override
   */
  mergeOption: function (newOption) {
    var thisOption = this.option;
    newOption && zrUtil.merge(thisOption, newOption, true);

    this._initDimensions();
  },

  /**
   * Whether series or axis is in this coordinate system.
   * @param {module:echarts/model/Series|module:echarts/coord/parallel/AxisModel} model
   * @param {module:echarts/model/Global} ecModel
   */
  contains: function (model, ecModel) {
    var parallelIndex = model.get('parallelIndex');
    return parallelIndex != null && ecModel.getComponent('parallel', parallelIndex) === this;
  },
  setAxisExpand: function (opt) {
    zrUtil.each(['axisExpandable', 'axisExpandCenter', 'axisExpandCount', 'axisExpandWidth', 'axisExpandWindow'], function (name) {
      if (opt.hasOwnProperty(name)) {
        this.option[name] = opt[name];
      }
    }, this);
  },

  /**
   * @private
   */
  _initDimensions: function () {
    var dimensions = this.dimensions = [];
    var parallelAxisIndex = this.parallelAxisIndex = [];
    var axisModels = zrUtil.filter(this.dependentModels.parallelAxis, function (axisModel) {
      // Can not use this.contains here, because
      // initialization has not been completed yet.
      return (axisModel.get('parallelIndex') || 0) === this.componentIndex;
    }, this);
    zrUtil.each(axisModels, function (axisModel) {
      dimensions.push('dim' + axisModel.get('dim'));
      parallelAxisIndex.push(axisModel.componentIndex);
    });
  }
});

module.exports = _default;