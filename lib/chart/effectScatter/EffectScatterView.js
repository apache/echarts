
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

var SymbolDraw = require("../helper/SymbolDraw");

var EffectSymbol = require("../helper/EffectSymbol");

var matrix = require("zrender/lib/core/matrix");

var pointsLayout = require("../../layout/points");

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
var _default = echarts.extendChartView({
  type: 'effectScatter',
  init: function () {
    this._symbolDraw = new SymbolDraw(EffectSymbol);
  },
  render: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    var effectSymbolDraw = this._symbolDraw;
    effectSymbolDraw.updateData(data);
    this.group.add(effectSymbolDraw.group);
  },
  updateTransform: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    this.group.dirty();
    var res = pointsLayout().reset(seriesModel);

    if (res.progress) {
      res.progress({
        start: 0,
        end: data.count()
      }, data);
    }

    this._symbolDraw.updateLayout(data);
  },
  _updateGroupTransform: function (seriesModel) {
    var coordSys = seriesModel.coordinateSystem;

    if (coordSys && coordSys.getRoamTransform) {
      this.group.transform = matrix.clone(coordSys.getRoamTransform());
      this.group.decomposeTransform();
    }
  },
  remove: function (ecModel, api) {
    this._symbolDraw && this._symbolDraw.remove(api);
  },
  dispose: function () {}
});

module.exports = _default;