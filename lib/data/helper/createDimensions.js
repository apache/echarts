
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

var completeDimensions = require("./completeDimensions");

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
 * Substitute `completeDimensions`.
 * `completeDimensions` is to be deprecated.
 */

/**
 * @param {module:echarts/data/Source|module:echarts/data/List} source or data.
 * @param {Object|Array} [opt]
 * @param {Array.<string|Object>} [opt.coordDimensions=[]]
 * @param {number} [opt.dimensionsCount]
 * @param {string} [opt.generateCoord]
 * @param {string} [opt.generateCoordCount]
 * @param {Array.<string|Object>} [opt.dimensionsDefine=source.dimensionsDefine] Overwrite source define.
 * @param {Object|HashMap} [opt.encodeDefine=source.encodeDefine] Overwrite source define.
 * @return {Array.<Object>} dimensionsInfo
 */
function _default(source, opt) {
  opt = opt || {};
  return completeDimensions(opt.coordDimensions || [], source, {
    dimsDef: opt.dimensionsDefine || source.dimensionsDefine,
    encodeDef: opt.encodeDefine || source.encodeDefine,
    dimCount: opt.dimensionsCount,
    generateCoord: opt.generateCoord,
    generateCoordCount: opt.generateCoordCount
  });
}

module.exports = _default;