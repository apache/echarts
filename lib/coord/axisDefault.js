
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
var defaultOption = {
  show: true,
  zlevel: 0,
  z: 0,
  // Inverse the axis.
  inverse: false,
  // Axis name displayed.
  name: '',
  // 'start' | 'middle' | 'end'
  nameLocation: 'end',
  // By degree. By defualt auto rotate by nameLocation.
  nameRotate: null,
  nameTruncate: {
    maxWidth: null,
    ellipsis: '...',
    placeholder: '.'
  },
  // Use global text style by default.
  nameTextStyle: {},
  // The gap between axisName and axisLine.
  nameGap: 15,
  // Default `false` to support tooltip.
  silent: false,
  // Default `false` to avoid legacy user event listener fail.
  triggerEvent: false,
  tooltip: {
    show: false
  },
  axisPointer: {},
  axisLine: {
    show: true,
    onZero: true,
    onZeroAxisIndex: null,
    lineStyle: {
      color: '#333',
      width: 1,
      type: 'solid'
    },
    // The arrow at both ends the the axis.
    symbol: ['none', 'none'],
    symbolSize: [10, 15]
  },
  axisTick: {
    show: true,
    // Whether axisTick is inside the grid or outside the grid.
    inside: false,
    // The length of axisTick.
    length: 5,
    lineStyle: {
      width: 1
    }
  },
  axisLabel: {
    show: true,
    // Whether axisLabel is inside the grid or outside the grid.
    inside: false,
    rotate: 0,
    // true | false | null/undefined (auto)
    showMinLabel: null,
    // true | false | null/undefined (auto)
    showMaxLabel: null,
    margin: 8,
    // formatter: null,
    fontSize: 12
  },
  splitLine: {
    show: true,
    lineStyle: {
      color: ['#ccc'],
      width: 1,
      type: 'solid'
    }
  },
  splitArea: {
    show: false,
    areaStyle: {
      color: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
    }
  }
};
var axisDefault = {};
axisDefault.categoryAxis = zrUtil.merge({
  // The gap at both ends of the axis. For categoryAxis, boolean.
  boundaryGap: true,
  // Set false to faster category collection.
  // Only usefull in the case like: category is
  // ['2012-01-01', '2012-01-02', ...], where the input
  // data has been ensured not duplicate and is large data.
  // null means "auto":
  // if axis.data provided, do not deduplication,
  // else do deduplication.
  deduplication: null,
  // splitArea: {
  // show: false
  // },
  splitLine: {
    show: false
  },
  axisTick: {
    // If tick is align with label when boundaryGap is true
    alignWithLabel: false,
    interval: 'auto'
  },
  axisLabel: {
    interval: 'auto'
  }
}, defaultOption);
axisDefault.valueAxis = zrUtil.merge({
  // The gap at both ends of the axis. For value axis, [GAP, GAP], where
  // `GAP` can be an absolute pixel number (like `35`), or percent (like `'30%'`)
  boundaryGap: [0, 0],
  // TODO
  // min/max: [30, datamin, 60] or [20, datamin] or [datamin, 60]
  // Min value of the axis. can be:
  // + a number
  // + 'dataMin': use the min value in data.
  // + null/undefined: auto decide min value (consider pretty look and boundaryGap).
  // min: null,
  // Max value of the axis. can be:
  // + a number
  // + 'dataMax': use the max value in data.
  // + null/undefined: auto decide max value (consider pretty look and boundaryGap).
  // max: null,
  // Readonly prop, specifies start value of the range when using data zoom.
  // rangeStart: null
  // Readonly prop, specifies end value of the range when using data zoom.
  // rangeEnd: null
  // Optional value can be:
  // + `false`: always include value 0.
  // + `true`: the extent do not consider value 0.
  // scale: false,
  // AxisTick and axisLabel and splitLine are caculated based on splitNumber.
  splitNumber: 5 // Interval specifies the span of the ticks is mandatorily.
  // interval: null
  // Specify min interval when auto calculate tick interval.
  // minInterval: null
  // Specify max interval when auto calculate tick interval.
  // maxInterval: null

}, defaultOption);
axisDefault.timeAxis = zrUtil.defaults({
  scale: true,
  min: 'dataMin',
  max: 'dataMax'
}, axisDefault.valueAxis);
axisDefault.logAxis = zrUtil.defaults({
  scale: true,
  logBase: 10
}, axisDefault.valueAxis);
var _default = axisDefault;
module.exports = _default;