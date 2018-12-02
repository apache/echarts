
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
var ATTR = '\0_ec_interaction_mutex';

function take(zr, resourceKey, userKey) {
  var store = getStore(zr);
  store[resourceKey] = userKey;
}

function release(zr, resourceKey, userKey) {
  var store = getStore(zr);
  var uKey = store[resourceKey];

  if (uKey === userKey) {
    store[resourceKey] = null;
  }
}

function isTaken(zr, resourceKey) {
  return !!getStore(zr)[resourceKey];
}

function getStore(zr) {
  return zr[ATTR] || (zr[ATTR] = {});
}
/**
 * payload: {
 *     type: 'takeGlobalCursor',
 *     key: 'dataZoomSelect', or 'brush', or ...,
 *         If no userKey, release global cursor.
 * }
 */


echarts.registerAction({
  type: 'takeGlobalCursor',
  event: 'globalCursorTaken',
  update: 'update'
}, function () {});
exports.take = take;
exports.release = release;
exports.isTaken = isTaken;