
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

var echarts = require("../../echarts");

var zrUtil = require("zrender/lib/core/util");

var axisDefault = require("../axisDefault");

var Model = require("../../model/Model");

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
var valueAxisDefault = axisDefault.valueAxis;

function defaultsShow(opt, show) {
  return zrUtil.defaults({
    show: show
  }, opt);
}

var RadarModel = echarts.extendComponentModel({
  type: 'radar',
  optionUpdated: function () {
    var boundaryGap = this.get('boundaryGap');
    var splitNumber = this.get('splitNumber');
    var scale = this.get('scale');
    var axisLine = this.get('axisLine');
    var axisTick = this.get('axisTick');
    var axisLabel = this.get('axisLabel');
    var nameTextStyle = this.get('name');
    var showName = this.get('name.show');
    var nameFormatter = this.get('name.formatter');
    var nameGap = this.get('nameGap');
    var triggerEvent = this.get('triggerEvent');
    var indicatorModels = zrUtil.map(this.get('indicator') || [], function (indicatorOpt) {
      // PENDING
      if (indicatorOpt.max != null && indicatorOpt.max > 0 && !indicatorOpt.min) {
        indicatorOpt.min = 0;
      } else if (indicatorOpt.min != null && indicatorOpt.min < 0 && !indicatorOpt.max) {
        indicatorOpt.max = 0;
      }

      var iNameTextStyle = nameTextStyle;

      if (indicatorOpt.color != null) {
        iNameTextStyle = zrUtil.defaults({
          color: indicatorOpt.color
        }, nameTextStyle);
      } // Use same configuration


      indicatorOpt = zrUtil.merge(zrUtil.clone(indicatorOpt), {
        boundaryGap: boundaryGap,
        splitNumber: splitNumber,
        scale: scale,
        axisLine: axisLine,
        axisTick: axisTick,
        axisLabel: axisLabel,
        // Competitable with 2 and use text
        name: indicatorOpt.text,
        nameLocation: 'end',
        nameGap: nameGap,
        // min: 0,
        nameTextStyle: iNameTextStyle,
        triggerEvent: triggerEvent
      }, false);

      if (!showName) {
        indicatorOpt.name = '';
      }

      if (typeof nameFormatter === 'string') {
        var indName = indicatorOpt.name;
        indicatorOpt.name = nameFormatter.replace('{value}', indName != null ? indName : '');
      } else if (typeof nameFormatter === 'function') {
        indicatorOpt.name = nameFormatter(indicatorOpt.name, indicatorOpt);
      }

      var model = zrUtil.extend(new Model(indicatorOpt, null, this.ecModel), axisModelCommonMixin); // For triggerEvent.

      model.mainType = 'radar';
      model.componentIndex = this.componentIndex;
      return model;
    }, this);

    this.getIndicatorModels = function () {
      return indicatorModels;
    };
  },
  defaultOption: {
    zlevel: 0,
    z: 0,
    center: ['50%', '50%'],
    radius: '75%',
    startAngle: 90,
    name: {
      show: true // formatter: null
      // textStyle: {}

    },
    boundaryGap: [0, 0],
    splitNumber: 5,
    nameGap: 15,
    scale: false,
    // Polygon or circle
    shape: 'polygon',
    axisLine: zrUtil.merge({
      lineStyle: {
        color: '#bbb'
      }
    }, valueAxisDefault.axisLine),
    axisLabel: defaultsShow(valueAxisDefault.axisLabel, false),
    axisTick: defaultsShow(valueAxisDefault.axisTick, false),
    splitLine: defaultsShow(valueAxisDefault.splitLine, true),
    splitArea: defaultsShow(valueAxisDefault.splitArea, true),
    // {text, min, max}
    indicator: []
  }
});
var _default = RadarModel;
module.exports = _default;