
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

var Single = require("./Single");

var CoordinateSystem = require("../../CoordinateSystem");

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

/**
 * Single coordinate system creator.
 */

/**
 * Create single coordinate system and inject it into seriesModel.
 *
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 * @return {Array.<module:echarts/coord/single/Single>}
 */
function create(ecModel, api) {
  var singles = [];
  ecModel.eachComponent('singleAxis', function (axisModel, idx) {
    var single = new Single(axisModel, ecModel, api);
    single.name = 'single_' + idx;
    single.resize(axisModel, api);
    axisModel.coordinateSystem = single;
    singles.push(single);
  });
  ecModel.eachSeries(function (seriesModel) {
    if (seriesModel.get('coordinateSystem') === 'singleAxis') {
      var singleAxisModel = ecModel.queryComponents({
        mainType: 'singleAxis',
        index: seriesModel.get('singleAxisIndex'),
        id: seriesModel.get('singleAxisId')
      })[0];
      seriesModel.coordinateSystem = singleAxisModel && singleAxisModel.coordinateSystem;
    }
  });
  return singles;
}

CoordinateSystem.register('single', {
  create: create,
  dimensions: Single.prototype.dimensions
});