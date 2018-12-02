
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

var Gradient = require("zrender/lib/graphic/Gradient");

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
var _default = {
  createOnAllSeries: true,
  performRawSeries: true,
  reset: function (seriesModel, ecModel) {
    var data = seriesModel.getData();
    var colorAccessPath = (seriesModel.visualColorAccessPath || 'itemStyle.color').split('.');
    var color = seriesModel.get(colorAccessPath) // Set in itemStyle
    || seriesModel.getColorFromPalette( // TODO series count changed.
    seriesModel.name, null, ecModel.getSeriesCount()); // Default color
    // FIXME Set color function or use the platte color

    data.setVisual('color', color); // Only visible series has each data be visual encoded

    if (!ecModel.isSeriesFiltered(seriesModel)) {
      if (typeof color === 'function' && !(color instanceof Gradient)) {
        data.each(function (idx) {
          data.setItemVisual(idx, 'color', color(seriesModel.getDataParams(idx)));
        });
      } // itemStyle in each data item


      var dataEach = function (data, idx) {
        var itemModel = data.getItemModel(idx);
        var color = itemModel.get(colorAccessPath, true);

        if (color != null) {
          data.setItemVisual(idx, 'color', color);
        }
      };

      return {
        dataEach: data.hasItemOption ? dataEach : null
      };
    }
  }
};
module.exports = _default;