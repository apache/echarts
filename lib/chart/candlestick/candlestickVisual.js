
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

var createRenderPlanner = require("../helper/createRenderPlanner");

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
var positiveBorderColorQuery = ['itemStyle', 'borderColor'];
var negativeBorderColorQuery = ['itemStyle', 'borderColor0'];
var positiveColorQuery = ['itemStyle', 'color'];
var negativeColorQuery = ['itemStyle', 'color0'];
var _default = {
  seriesType: 'candlestick',
  plan: createRenderPlanner(),
  // For legend.
  performRawSeries: true,
  reset: function (seriesModel, ecModel) {
    var data = seriesModel.getData();
    var isLargeRender = seriesModel.pipelineContext.large;
    data.setVisual({
      legendSymbol: 'roundRect',
      colorP: getColor(1, seriesModel),
      colorN: getColor(-1, seriesModel),
      borderColorP: getBorderColor(1, seriesModel),
      borderColorN: getBorderColor(-1, seriesModel)
    }); // Only visible series has each data be visual encoded

    if (ecModel.isSeriesFiltered(seriesModel)) {
      return;
    }

    return !isLargeRender && {
      progress: progress
    };

    function progress(params, data) {
      var dataIndex;

      while ((dataIndex = params.next()) != null) {
        var itemModel = data.getItemModel(dataIndex);
        var sign = data.getItemLayout(dataIndex).sign;
        data.setItemVisual(dataIndex, {
          color: getColor(sign, itemModel),
          borderColor: getBorderColor(sign, itemModel)
        });
      }
    }

    function getColor(sign, model) {
      return model.get(sign > 0 ? positiveColorQuery : negativeColorQuery);
    }

    function getBorderColor(sign, model) {
      return model.get(sign > 0 ? positiveBorderColorQuery : negativeBorderColorQuery);
    }
  }
};
module.exports = _default;