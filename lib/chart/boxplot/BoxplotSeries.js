
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

var SeriesModel = require("../../model/Series");

var _whiskerBoxCommon = require("../helper/whiskerBoxCommon");

var seriesModelMixin = _whiskerBoxCommon.seriesModelMixin;

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
var BoxplotSeries = SeriesModel.extend({
  type: 'series.boxplot',
  dependencies: ['xAxis', 'yAxis', 'grid'],
  // TODO
  // box width represents group size, so dimension should have 'size'.

  /**
   * @see <https://en.wikipedia.org/wiki/Box_plot>
   * The meanings of 'min' and 'max' depend on user,
   * and echarts do not need to know it.
   * @readOnly
   */
  defaultValueDimensions: [{
    name: 'min',
    defaultTooltip: true
  }, {
    name: 'Q1',
    defaultTooltip: true
  }, {
    name: 'median',
    defaultTooltip: true
  }, {
    name: 'Q3',
    defaultTooltip: true
  }, {
    name: 'max',
    defaultTooltip: true
  }],

  /**
   * @type {Array.<string>}
   * @readOnly
   */
  dimensions: null,

  /**
   * @override
   */
  defaultOption: {
    zlevel: 0,
    // 一级层叠
    z: 2,
    // 二级层叠
    coordinateSystem: 'cartesian2d',
    legendHoverLink: true,
    hoverAnimation: true,
    // xAxisIndex: 0,
    // yAxisIndex: 0,
    layout: null,
    // 'horizontal' or 'vertical'
    boxWidth: [7, 50],
    // [min, max] can be percent of band width.
    itemStyle: {
      color: '#fff',
      borderWidth: 1
    },
    emphasis: {
      itemStyle: {
        borderWidth: 2,
        shadowBlur: 5,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowColor: 'rgba(0,0,0,0.4)'
      }
    },
    animationEasing: 'elasticOut',
    animationDuration: 800
  }
});
zrUtil.mixin(BoxplotSeries, seriesModelMixin, true);
var _default = BoxplotSeries;
module.exports = _default;