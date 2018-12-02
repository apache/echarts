
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

var axisModelCreator = require("../axisModelCreator");

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
var PolarAxisModel = ComponentModel.extend({
  type: 'polarAxis',

  /**
   * @type {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
   */
  axis: null,

  /**
   * @override
   */
  getCoordSysModel: function () {
    return this.ecModel.queryComponents({
      mainType: 'polar',
      index: this.option.polarIndex,
      id: this.option.polarId
    })[0];
  }
});
zrUtil.merge(PolarAxisModel.prototype, axisModelCommonMixin);
var polarAxisDefaultExtendedOption = {
  angle: {
    // polarIndex: 0,
    // polarId: '',
    startAngle: 90,
    clockwise: true,
    splitNumber: 12,
    axisLabel: {
      rotate: false
    }
  },
  radius: {
    // polarIndex: 0,
    // polarId: '',
    splitNumber: 5
  }
};

function getAxisType(axisDim, option) {
  // Default axis with data is category axis
  return option.type || (option.data ? 'category' : 'value');
}

axisModelCreator('angle', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.angle);
axisModelCreator('radius', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.radius);