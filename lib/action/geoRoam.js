
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

var echarts = require("../echarts");

var zrUtil = require("zrender/lib/core/util");

var _roamHelper = require("./roamHelper");

var updateCenterAndZoom = _roamHelper.updateCenterAndZoom;

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
 * @payload
 * @property {string} [componentType=series]
 * @property {number} [dx]
 * @property {number} [dy]
 * @property {number} [zoom]
 * @property {number} [originX]
 * @property {number} [originY]
 */
echarts.registerAction({
  type: 'geoRoam',
  event: 'geoRoam',
  update: 'updateTransform'
}, function (payload, ecModel) {
  var componentType = payload.componentType || 'series';
  ecModel.eachComponent({
    mainType: componentType,
    query: payload
  }, function (componentModel) {
    var geo = componentModel.coordinateSystem;

    if (geo.type !== 'geo') {
      return;
    }

    var res = updateCenterAndZoom(geo, payload, componentModel.get('scaleLimit'));
    componentModel.setCenter && componentModel.setCenter(res.center);
    componentModel.setZoom && componentModel.setZoom(res.zoom); // All map series with same `map` use the same geo coordinate system
    // So the center and zoom must be in sync. Include the series not selected by legend

    if (componentType === 'series') {
      zrUtil.each(componentModel.seriesGroup, function (seriesModel) {
        seriesModel.setCenter(res.center);
        seriesModel.setZoom(res.zoom);
      });
    }
  });
});