
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

var map = _util.map;

var createRenderPlanner = require("../chart/helper/createRenderPlanner");

var _dataStackHelper = require("../data/helper/dataStackHelper");

var isDimensionStacked = _dataStackHelper.isDimensionStacked;

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

/* global Float32Array */
function _default(seriesType) {
  return {
    seriesType: seriesType,
    plan: createRenderPlanner(),
    reset: function (seriesModel) {
      var data = seriesModel.getData();
      var coordSys = seriesModel.coordinateSystem;
      var pipelineContext = seriesModel.pipelineContext;
      var isLargeRender = pipelineContext.large;

      if (!coordSys) {
        return;
      }

      var dims = map(coordSys.dimensions, function (dim) {
        return data.mapDimension(dim);
      }).slice(0, 2);
      var dimLen = dims.length;
      var stackResultDim = data.getCalculationInfo('stackResultDimension');

      if (isDimensionStacked(data, dims[0]
      /*, dims[1]*/
      )) {
        dims[0] = stackResultDim;
      }

      if (isDimensionStacked(data, dims[1]
      /*, dims[0]*/
      )) {
        dims[1] = stackResultDim;
      }

      function progress(params, data) {
        var segCount = params.end - params.start;
        var points = isLargeRender && new Float32Array(segCount * dimLen);

        for (var i = params.start, offset = 0, tmpIn = [], tmpOut = []; i < params.end; i++) {
          var point;

          if (dimLen === 1) {
            var x = data.get(dims[0], i);
            point = !isNaN(x) && coordSys.dataToPoint(x, null, tmpOut);
          } else {
            var x = tmpIn[0] = data.get(dims[0], i);
            var y = tmpIn[1] = data.get(dims[1], i); // Also {Array.<number>}, not undefined to avoid if...else... statement

            point = !isNaN(x) && !isNaN(y) && coordSys.dataToPoint(tmpIn, null, tmpOut);
          }

          if (isLargeRender) {
            points[offset++] = point ? point[0] : NaN;
            points[offset++] = point ? point[1] : NaN;
          } else {
            data.setItemLayout(i, point && point.slice() || [NaN, NaN]);
          }
        }

        isLargeRender && data.setLayout('symbolPoints', points);
      }

      return dimLen && {
        progress: progress
      };
    }
  };
}

module.exports = _default;