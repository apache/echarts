
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
var borderColorQuery = ['itemStyle', 'borderColor'];

function _default(ecModel, api) {
  var globalColors = ecModel.get('color');
  ecModel.eachRawSeriesByType('boxplot', function (seriesModel) {
    var defaulColor = globalColors[seriesModel.seriesIndex % globalColors.length];
    var data = seriesModel.getData();
    data.setVisual({
      legendSymbol: 'roundRect',
      // Use name 'color' but not 'borderColor' for legend usage and
      // visual coding from other component like dataRange.
      color: seriesModel.get(borderColorQuery) || defaulColor
    }); // Only visible series has each data be visual encoded

    if (!ecModel.isSeriesFiltered(seriesModel)) {
      data.each(function (idx) {
        var itemModel = data.getItemModel(idx);
        data.setItemVisual(idx, {
          color: itemModel.get(borderColorQuery, true)
        });
      });
    }
  });
}

module.exports = _default;