
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
var echartsAPIList = ['getDom', 'getZr', 'getWidth', 'getHeight', 'getDevicePixelRatio', 'dispatchAction', 'isDisposed', 'on', 'off', 'getDataURL', 'getConnectedDataURL', 'getModel', 'getOption', 'getViewOfComponentModel', 'getViewOfSeriesModel']; // And `getCoordinateSystems` and `getComponentByElement` will be injected in echarts.js

function ExtensionAPI(chartInstance) {
  zrUtil.each(echartsAPIList, function (name) {
    this[name] = zrUtil.bind(chartInstance[name], chartInstance);
  }, this);
}

var _default = ExtensionAPI;
module.exports = _default;