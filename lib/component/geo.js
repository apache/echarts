
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

require("../coord/geo/GeoModel");

require("../coord/geo/geoCreator");

require("./geo/GeoView");

require("../action/geoRoam");

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
function makeAction(method, actionInfo) {
  actionInfo.update = 'updateView';
  echarts.registerAction(actionInfo, function (payload, ecModel) {
    var selected = {};
    ecModel.eachComponent({
      mainType: 'geo',
      query: payload
    }, function (geoModel) {
      geoModel[method](payload.name);
      var geo = geoModel.coordinateSystem;
      zrUtil.each(geo.regions, function (region) {
        selected[region.name] = geoModel.isSelected(region.name) || false;
      });
    });
    return {
      selected: selected,
      name: payload.name
    };
  });
}

makeAction('toggleSelected', {
  type: 'geoToggleSelect',
  event: 'geoselectchanged'
});
makeAction('select', {
  type: 'geoSelect',
  event: 'geoselected'
});
makeAction('unSelect', {
  type: 'geoUnSelect',
  event: 'geounselected'
});