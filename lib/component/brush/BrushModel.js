
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

var zrUtil = require("zrender/lib/core/util");

var visualSolution = require("../../visual/visualSolution");

var Model = require("../../model/Model");

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
var DEFAULT_OUT_OF_BRUSH_COLOR = ['#ddd'];
var BrushModel = echarts.extendComponentModel({
  type: 'brush',
  dependencies: ['geo', 'grid', 'xAxis', 'yAxis', 'parallel', 'series'],

  /**
   * @protected
   */
  defaultOption: {
    // inBrush: null,
    // outOfBrush: null,
    toolbox: null,
    // Default value see preprocessor.
    brushLink: null,
    // Series indices array, broadcast using dataIndex.
    // or 'all', which means all series. 'none' or null means no series.
    seriesIndex: 'all',
    // seriesIndex array, specify series controlled by this brush component.
    geoIndex: null,
    //
    xAxisIndex: null,
    yAxisIndex: null,
    brushType: 'rect',
    // Default brushType, see BrushController.
    brushMode: 'single',
    // Default brushMode, 'single' or 'multiple'
    transformable: true,
    // Default transformable.
    brushStyle: {
      // Default brushStyle
      borderWidth: 1,
      color: 'rgba(120,140,180,0.3)',
      borderColor: 'rgba(120,140,180,0.8)'
    },
    throttleType: 'fixRate',
    // Throttle in brushSelected event. 'fixRate' or 'debounce'.
    // If null, no throttle. Valid only in the first brush component
    throttleDelay: 0,
    // Unit: ms, 0 means every event will be triggered.
    // FIXME
    // 试验效果
    removeOnClick: true,
    z: 10000
  },

  /**
   * @readOnly
   * @type {Array.<Object>}
   */
  areas: [],

  /**
   * Current activated brush type.
   * If null, brush is inactived.
   * see module:echarts/component/helper/BrushController
   * @readOnly
   * @type {string}
   */
  brushType: null,

  /**
   * Current brush opt.
   * see module:echarts/component/helper/BrushController
   * @readOnly
   * @type {Object}
   */
  brushOption: {},

  /**
   * @readOnly
   * @type {Array.<Object>}
   */
  coordInfoList: [],
  optionUpdated: function (newOption, isInit) {
    var thisOption = this.option;
    !isInit && visualSolution.replaceVisualOption(thisOption, newOption, ['inBrush', 'outOfBrush']);
    var inBrush = thisOption.inBrush = thisOption.inBrush || {}; // Always give default visual, consider setOption at the second time.

    thisOption.outOfBrush = thisOption.outOfBrush || {
      color: DEFAULT_OUT_OF_BRUSH_COLOR
    };

    if (!inBrush.hasOwnProperty('liftZ')) {
      // Bigger than the highlight z lift, otherwise it will
      // be effected by the highlight z when brush.
      inBrush.liftZ = 5;
    }
  },

  /**
   * If ranges is null/undefined, range state remain.
   *
   * @param {Array.<Object>} [ranges]
   */
  setAreas: function (areas) {
    // If ranges is null/undefined, range state remain.
    // This helps user to dispatchAction({type: 'brush'}) with no areas
    // set but just want to get the current brush select info from a `brush` event.
    if (!areas) {
      return;
    }

    this.areas = zrUtil.map(areas, function (area) {
      return generateBrushOption(this.option, area);
    }, this);
  },

  /**
   * see module:echarts/component/helper/BrushController
   * @param {Object} brushOption
   */
  setBrushOption: function (brushOption) {
    this.brushOption = generateBrushOption(this.option, brushOption);
    this.brushType = this.brushOption.brushType;
  }
});

function generateBrushOption(option, brushOption) {
  return zrUtil.merge({
    brushType: option.brushType,
    brushMode: option.brushMode,
    transformable: option.transformable,
    brushStyle: new Model(option.brushStyle).getItemStyle(),
    removeOnClick: option.removeOnClick,
    z: option.z
  }, brushOption, true);
}

var _default = BrushModel;
module.exports = _default;