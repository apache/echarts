
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

var Scale = require("./Scale");

var OrdinalMeta = require("../data/OrdinalMeta");

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
 * Linear continuous scale
 * @module echarts/coord/scale/Ordinal
 *
 * http://en.wikipedia.org/wiki/Level_of_measurement
 */
// FIXME only one data
var scaleProto = Scale.prototype;
var OrdinalScale = Scale.extend({
  type: 'ordinal',

  /**
   * @param {module:echarts/data/OrdianlMeta|Array.<string>} ordinalMeta
   */
  init: function (ordinalMeta, extent) {
    // Caution: Should not use instanceof, consider ec-extensions using
    // import approach to get OrdinalMeta class.
    if (!ordinalMeta || zrUtil.isArray(ordinalMeta)) {
      ordinalMeta = new OrdinalMeta({
        categories: ordinalMeta
      });
    }

    this._ordinalMeta = ordinalMeta;
    this._extent = extent || [0, ordinalMeta.categories.length - 1];
  },
  parse: function (val) {
    return typeof val === 'string' ? this._ordinalMeta.getOrdinal(val) // val might be float.
    : Math.round(val);
  },
  contain: function (rank) {
    rank = this.parse(rank);
    return scaleProto.contain.call(this, rank) && this._ordinalMeta.categories[rank] != null;
  },

  /**
   * Normalize given rank or name to linear [0, 1]
   * @param {number|string} [val]
   * @return {number}
   */
  normalize: function (val) {
    return scaleProto.normalize.call(this, this.parse(val));
  },
  scale: function (val) {
    return Math.round(scaleProto.scale.call(this, val));
  },

  /**
   * @return {Array}
   */
  getTicks: function () {
    var ticks = [];
    var extent = this._extent;
    var rank = extent[0];

    while (rank <= extent[1]) {
      ticks.push(rank);
      rank++;
    }

    return ticks;
  },

  /**
   * Get item on rank n
   * @param {number} n
   * @return {string}
   */
  getLabel: function (n) {
    if (!this.isBlank()) {
      // Note that if no data, ordinalMeta.categories is an empty array.
      return this._ordinalMeta.categories[n];
    }
  },

  /**
   * @return {number}
   */
  count: function () {
    return this._extent[1] - this._extent[0] + 1;
  },

  /**
   * @override
   */
  unionExtentFromData: function (data, dim) {
    this.unionExtent(data.getApproximateExtent(dim));
  },
  getOrdinalMeta: function () {
    return this._ordinalMeta;
  },
  niceTicks: zrUtil.noop,
  niceExtent: zrUtil.noop
});
/**
 * @return {module:echarts/scale/Time}
 */

OrdinalScale.create = function () {
  return new OrdinalScale();
};

var _default = OrdinalScale;
module.exports = _default;