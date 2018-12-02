
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

var _util = require("zrender/lib/core/util");

var each = _util.each;
var createHashMap = _util.createHashMap;

var SeriesModel = require("../../model/Series");

var createListFromArray = require("../helper/createListFromArray");

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
var _default = SeriesModel.extend({
  type: 'series.parallel',
  dependencies: ['parallel'],
  visualColorAccessPath: 'lineStyle.color',
  getInitialData: function (option, ecModel) {
    var source = this.getSource();
    setEncodeAndDimensions(source, this);
    return createListFromArray(source, this);
  },

  /**
   * User can get data raw indices on 'axisAreaSelected' event received.
   *
   * @public
   * @param {string} activeState 'active' or 'inactive' or 'normal'
   * @return {Array.<number>} Raw indices
   */
  getRawIndicesByActiveState: function (activeState) {
    var coordSys = this.coordinateSystem;
    var data = this.getData();
    var indices = [];
    coordSys.eachActiveState(data, function (theActiveState, dataIndex) {
      if (activeState === theActiveState) {
        indices.push(data.getRawIndex(dataIndex));
      }
    });
    return indices;
  },
  defaultOption: {
    zlevel: 0,
    // 一级层叠
    z: 2,
    // 二级层叠
    coordinateSystem: 'parallel',
    parallelIndex: 0,
    label: {
      show: false
    },
    inactiveOpacity: 0.05,
    activeOpacity: 1,
    lineStyle: {
      width: 1,
      opacity: 0.45,
      type: 'solid'
    },
    emphasis: {
      label: {
        show: false
      }
    },
    progressive: 500,
    smooth: false,
    // true | false | number
    animationEasing: 'linear'
  }
});

function setEncodeAndDimensions(source, seriesModel) {
  // The mapping of parallelAxis dimension to data dimension can
  // be specified in parallelAxis.option.dim. For example, if
  // parallelAxis.option.dim is 'dim3', it mapping to the third
  // dimension of data. But `data.encode` has higher priority.
  // Moreover, parallelModel.dimension should not be regarded as data
  // dimensions. Consider dimensions = ['dim4', 'dim2', 'dim6'];
  if (source.encodeDefine) {
    return;
  }

  var parallelModel = seriesModel.ecModel.getComponent('parallel', seriesModel.get('parallelIndex'));

  if (!parallelModel) {
    return;
  }

  var encodeDefine = source.encodeDefine = createHashMap();
  each(parallelModel.dimensions, function (axisDim) {
    var dataDimIndex = convertDimNameToNumber(axisDim);
    encodeDefine.set(axisDim, dataDimIndex);
  });
}

function convertDimNameToNumber(dimName) {
  return +dimName.replace('dim', '');
}

module.exports = _default;