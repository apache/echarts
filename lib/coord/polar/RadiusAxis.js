
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

var Axis = require("../Axis");

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
function RadiusAxis(scale, radiusExtent) {
  Axis.call(this, 'radius', scale, radiusExtent);
  /**
   * Axis type
   *  - 'category'
   *  - 'value'
   *  - 'time'
   *  - 'log'
   * @type {string}
   */

  this.type = 'category';
}

RadiusAxis.prototype = {
  constructor: RadiusAxis,

  /**
   * @override
   */
  pointToData: function (point, clamp) {
    return this.polar.pointToData(point, clamp)[this.dim === 'radius' ? 0 : 1];
  },
  dataToRadius: Axis.prototype.dataToCoord,
  radiusToData: Axis.prototype.coordToData
};
zrUtil.inherits(RadiusAxis, Axis);
var _default = RadiusAxis;
module.exports = _default;