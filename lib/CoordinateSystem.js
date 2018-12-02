
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

var zrUtil = require("zrender/lib/core/util");

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
var coordinateSystemCreators = {};

function CoordinateSystemManager() {
  this._coordinateSystems = [];
}

CoordinateSystemManager.prototype = {
  constructor: CoordinateSystemManager,
  create: function (ecModel, api) {
    var coordinateSystems = [];
    zrUtil.each(coordinateSystemCreators, function (creater, type) {
      var list = creater.create(ecModel, api);
      coordinateSystems = coordinateSystems.concat(list || []);
    });
    this._coordinateSystems = coordinateSystems;
  },
  update: function (ecModel, api) {
    zrUtil.each(this._coordinateSystems, function (coordSys) {
      coordSys.update && coordSys.update(ecModel, api);
    });
  },
  getCoordinateSystems: function () {
    return this._coordinateSystems.slice();
  }
};

CoordinateSystemManager.register = function (type, coordinateSystemCreator) {
  coordinateSystemCreators[type] = coordinateSystemCreator;
};

CoordinateSystemManager.get = function (type) {
  return coordinateSystemCreators[type];
};

var _default = CoordinateSystemManager;
module.exports = _default;