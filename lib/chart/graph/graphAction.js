
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

var _roamHelper = require("../../action/roamHelper");

var updateCenterAndZoom = _roamHelper.updateCenterAndZoom;

require("../helper/focusNodeAdjacencyAction");

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
var actionInfo = {
  type: 'graphRoam',
  event: 'graphRoam',
  update: 'none'
};
/**
 * @payload
 * @property {string} name Series name
 * @property {number} [dx]
 * @property {number} [dy]
 * @property {number} [zoom]
 * @property {number} [originX]
 * @property {number} [originY]
 */

echarts.registerAction(actionInfo, function (payload, ecModel) {
  ecModel.eachComponent({
    mainType: 'series',
    query: payload
  }, function (seriesModel) {
    var coordSys = seriesModel.coordinateSystem;
    var res = updateCenterAndZoom(coordSys, payload);
    seriesModel.setCenter && seriesModel.setCenter(res.center);
    seriesModel.setZoom && seriesModel.setZoom(res.zoom);
  });
});