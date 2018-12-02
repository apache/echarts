
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

var ComponentView = require("../../view/Component");

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
var _default = ComponentView.extend({
  type: 'dataZoom',
  render: function (dataZoomModel, ecModel, api, payload) {
    this.dataZoomModel = dataZoomModel;
    this.ecModel = ecModel;
    this.api = api;
  },

  /**
   * Find the first target coordinate system.
   *
   * @protected
   * @return {Object} {
   *                   grid: [
   *                       {model: coord0, axisModels: [axis1, axis3], coordIndex: 1},
   *                       {model: coord1, axisModels: [axis0, axis2], coordIndex: 0},
   *                       ...
   *                   ],  // cartesians must not be null/undefined.
   *                   polar: [
   *                       {model: coord0, axisModels: [axis4], coordIndex: 0},
   *                       ...
   *                   ],  // polars must not be null/undefined.
   *                   singleAxis: [
   *                       {model: coord0, axisModels: [], coordIndex: 0}
   *                   ]
   */
  getTargetCoordInfo: function () {
    var dataZoomModel = this.dataZoomModel;
    var ecModel = this.ecModel;
    var coordSysLists = {};
    dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
      var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);

      if (axisModel) {
        var coordModel = axisModel.getCoordSysModel();
        coordModel && save(coordModel, axisModel, coordSysLists[coordModel.mainType] || (coordSysLists[coordModel.mainType] = []), coordModel.componentIndex);
      }
    }, this);

    function save(coordModel, axisModel, store, coordIndex) {
      var item;

      for (var i = 0; i < store.length; i++) {
        if (store[i].model === coordModel) {
          item = store[i];
          break;
        }
      }

      if (!item) {
        store.push(item = {
          model: coordModel,
          axisModels: [],
          coordIndex: coordIndex
        });
      }

      item.axisModels.push(axisModel);
    }

    return coordSysLists;
  }
});

module.exports = _default;