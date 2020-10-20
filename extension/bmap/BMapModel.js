
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

var echarts = require("echarts");

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
function v2Equal(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

var _default = echarts.extendComponentModel({
  type: 'bmap',
  getBMap: function () {
    // __bmap is injected when creating BMapCoordSys
    return this.__bmap;
  },
  setCenterAndZoom: function (center, zoom) {
    this.option.center = center;
    this.option.zoom = zoom;
  },
  centerOrZoomChanged: function (center, zoom) {
    var option = this.option;
    return !(v2Equal(center, option.center) && zoom === option.zoom);
  },
  defaultOption: {
    center: [104.114129, 37.550339],
    zoom: 5,
    // 2.0 http://lbsyun.baidu.com/custom/index.htm
    mapStyle: {},
    // 3.0 http://lbsyun.baidu.com/index.php?title=open/custom
    mapStyleV2: {},
    // See https://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html#a0b1
    mapOptions: {},
    roam: false
  }
});

module.exports = _default;