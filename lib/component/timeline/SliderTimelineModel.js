
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

var TimelineModel = require("./TimelineModel");

var dataFormatMixin = require("../../model/mixin/dataFormat");

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
var SliderTimelineModel = TimelineModel.extend({
  type: 'timeline.slider',

  /**
   * @protected
   */
  defaultOption: {
    backgroundColor: 'rgba(0,0,0,0)',
    // 时间轴背景颜色
    borderColor: '#ccc',
    // 时间轴边框颜色
    borderWidth: 0,
    // 时间轴边框线宽，单位px，默认为0（无边框）
    orient: 'horizontal',
    // 'vertical'
    inverse: false,
    tooltip: {
      // boolean or Object
      trigger: 'item' // data item may also have tootip attr.

    },
    symbol: 'emptyCircle',
    symbolSize: 10,
    lineStyle: {
      show: true,
      width: 2,
      color: '#304654'
    },
    label: {
      // 文本标签
      position: 'auto',
      // auto left right top bottom
      // When using number, label position is not
      // restricted by viewRect.
      // positive: right/bottom, negative: left/top
      show: true,
      interval: 'auto',
      rotate: 0,
      // formatter: null,
      // 其余属性默认使用全局文本样式，详见TEXTSTYLE
      color: '#304654'
    },
    itemStyle: {
      color: '#304654',
      borderWidth: 1
    },
    checkpointStyle: {
      symbol: 'circle',
      symbolSize: 13,
      color: '#c23531',
      borderWidth: 5,
      borderColor: 'rgba(194,53,49, 0.5)',
      animation: true,
      animationDuration: 300,
      animationEasing: 'quinticInOut'
    },
    controlStyle: {
      show: true,
      showPlayBtn: true,
      showPrevBtn: true,
      showNextBtn: true,
      itemSize: 22,
      itemGap: 12,
      position: 'left',
      // 'left' 'right' 'top' 'bottom'
      playIcon: 'path://M31.6,53C17.5,53,6,41.5,6,27.4S17.5,1.8,31.6,1.8C45.7,1.8,57.2,13.3,57.2,27.4S45.7,53,31.6,53z M31.6,3.3 C18.4,3.3,7.5,14.1,7.5,27.4c0,13.3,10.8,24.1,24.1,24.1C44.9,51.5,55.7,40.7,55.7,27.4C55.7,14.1,44.9,3.3,31.6,3.3z M24.9,21.3 c0-2.2,1.6-3.1,3.5-2l10.5,6.1c1.899,1.1,1.899,2.9,0,4l-10.5,6.1c-1.9,1.1-3.5,0.2-3.5-2V21.3z',
      // jshint ignore:line
      stopIcon: 'path://M30.9,53.2C16.8,53.2,5.3,41.7,5.3,27.6S16.8,2,30.9,2C45,2,56.4,13.5,56.4,27.6S45,53.2,30.9,53.2z M30.9,3.5C17.6,3.5,6.8,14.4,6.8,27.6c0,13.3,10.8,24.1,24.101,24.1C44.2,51.7,55,40.9,55,27.6C54.9,14.4,44.1,3.5,30.9,3.5z M36.9,35.8c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H36c0.5,0,0.9,0.4,0.9,1V35.8z M27.8,35.8 c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H27c0.5,0,0.9,0.4,0.9,1L27.8,35.8L27.8,35.8z',
      // jshint ignore:line
      nextIcon: 'path://M18.6,50.8l22.5-22.5c0.2-0.2,0.3-0.4,0.3-0.7c0-0.3-0.1-0.5-0.3-0.7L18.7,4.4c-0.1-0.1-0.2-0.3-0.2-0.5 c0-0.4,0.3-0.8,0.8-0.8c0.2,0,0.5,0.1,0.6,0.3l23.5,23.5l0,0c0.2,0.2,0.3,0.4,0.3,0.7c0,0.3-0.1,0.5-0.3,0.7l-0.1,0.1L19.7,52 c-0.1,0.1-0.3,0.2-0.5,0.2c-0.4,0-0.8-0.3-0.8-0.8C18.4,51.2,18.5,51,18.6,50.8z',
      // jshint ignore:line
      prevIcon: 'path://M43,52.8L20.4,30.3c-0.2-0.2-0.3-0.4-0.3-0.7c0-0.3,0.1-0.5,0.3-0.7L42.9,6.4c0.1-0.1,0.2-0.3,0.2-0.5 c0-0.4-0.3-0.8-0.8-0.8c-0.2,0-0.5,0.1-0.6,0.3L18.3,28.8l0,0c-0.2,0.2-0.3,0.4-0.3,0.7c0,0.3,0.1,0.5,0.3,0.7l0.1,0.1L41.9,54 c0.1,0.1,0.3,0.2,0.5,0.2c0.4,0,0.8-0.3,0.8-0.8C43.2,53.2,43.1,53,43,52.8z',
      // jshint ignore:line
      color: '#304654',
      borderColor: '#304654',
      borderWidth: 1
    },
    emphasis: {
      label: {
        show: true,
        // 其余属性默认使用全局文本样式，详见TEXTSTYLE
        color: '#c23531'
      },
      itemStyle: {
        color: '#c23531'
      },
      controlStyle: {
        color: '#c23531',
        borderColor: '#c23531',
        borderWidth: 2
      }
    },
    data: []
  }
});
zrUtil.mixin(SliderTimelineModel, dataFormatMixin);
var _default = SliderTimelineModel;
module.exports = _default;