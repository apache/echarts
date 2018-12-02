
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
// (1) The code `if (__DEV__) ...` can be removed by build tool.
// (2) If intend to use `__DEV__`, this module should be imported. Use a global
// variable `__DEV__` may cause that miss the declaration (see #6535), or the
// declaration is behind of the using position (for example in `Model.extent`,
// And tools like rollup can not analysis the dependency if not import).
var dev; // In browser

if (typeof window !== 'undefined') {
  dev = window.__DEV__;
} // In node
else if (typeof global !== 'undefined') {
    dev = global.__DEV__;
  }

if (typeof dev === 'undefined') {
  dev = true;
}

var __DEV__ = dev;
exports.__DEV__ = __DEV__;