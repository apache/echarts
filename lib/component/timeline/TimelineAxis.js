
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

var Axis = require("../../coord/Axis");

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
 * Extend axis 2d
 * @constructor module:echarts/coord/cartesian/Axis2D
 * @extends {module:echarts/coord/cartesian/Axis}
 * @param {string} dim
 * @param {*} scale
 * @param {Array.<number>} coordExtent
 * @param {string} axisType
 * @param {string} position
 */
var TimelineAxis = function (dim, scale, coordExtent, axisType) {
  Axis.call(this, dim, scale, coordExtent);
  /**
   * Axis type
   *  - 'category'
   *  - 'value'
   *  - 'time'
   *  - 'log'
   * @type {string}
   */

  this.type = axisType || 'value';
  /**
   * Axis model
   * @param {module:echarts/component/TimelineModel}
   */

  this.model = null;
};

TimelineAxis.prototype = {
  constructor: TimelineAxis,

  /**
   * @override
   */
  getLabelModel: function () {
    return this.model.getModel('label');
  },

  /**
   * @override
   */
  isHorizontal: function () {
    return this.model.get('orient') === 'horizontal';
  }
};
zrUtil.inherits(TimelineAxis, Axis);
var _default = TimelineAxis;
module.exports = _default;