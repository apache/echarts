
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

var _util = require("zrender/lib/core/util");

var createHashMap = _util.createHashMap;
var isObject = _util.isObject;
var map = _util.map;

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
 * @constructor
 * @param {Object} [opt]
 * @param {Object} [opt.categories=[]]
 * @param {Object} [opt.needCollect=false]
 * @param {Object} [opt.deduplication=false]
 */
function OrdinalMeta(opt) {
  /**
   * @readOnly
   * @type {Array.<string>}
   */
  this.categories = opt.categories || [];
  /**
   * @private
   * @type {boolean}
   */

  this._needCollect = opt.needCollect;
  /**
   * @private
   * @type {boolean}
   */

  this._deduplication = opt.deduplication;
  /**
   * @private
   * @type {boolean}
   */

  this._map;
}
/**
 * @param {module:echarts/model/Model} axisModel
 * @return {module:echarts/data/OrdinalMeta}
 */


OrdinalMeta.createByAxisModel = function (axisModel) {
  var option = axisModel.option;
  var data = option.data;
  var categories = data && map(data, getName);
  return new OrdinalMeta({
    categories: categories,
    needCollect: !categories,
    // deduplication is default in axis.
    deduplication: option.dedplication !== false
  });
};

var proto = OrdinalMeta.prototype;
/**
 * @param {string} category
 * @return {number} ordinal
 */

proto.getOrdinal = function (category) {
  return getOrCreateMap(this).get(category);
};
/**
 * @param {*} category
 * @return {number} The ordinal. If not found, return NaN.
 */


proto.parseAndCollect = function (category) {
  var index;
  var needCollect = this._needCollect; // The value of category dim can be the index of the given category set.
  // This feature is only supported when !needCollect, because we should
  // consider a common case: a value is 2017, which is a number but is
  // expected to be tread as a category. This case usually happen in dataset,
  // where it happent to be no need of the index feature.

  if (typeof category !== 'string' && !needCollect) {
    return category;
  } // Optimize for the scenario:
  // category is ['2012-01-01', '2012-01-02', ...], where the input
  // data has been ensured not duplicate and is large data.
  // Notice, if a dataset dimension provide categroies, usually echarts
  // should remove duplication except user tell echarts dont do that
  // (set axis.deduplication = false), because echarts do not know whether
  // the values in the category dimension has duplication (consider the
  // parallel-aqi example)


  if (needCollect && !this._deduplication) {
    index = this.categories.length;
    this.categories[index] = category;
    return index;
  }

  var map = getOrCreateMap(this);
  index = map.get(category);

  if (index == null) {
    if (needCollect) {
      index = this.categories.length;
      this.categories[index] = category;
      map.set(category, index);
    } else {
      index = NaN;
    }
  }

  return index;
}; // Consider big data, do not create map until needed.


function getOrCreateMap(ordinalMeta) {
  return ordinalMeta._map || (ordinalMeta._map = createHashMap(ordinalMeta.categories));
}

function getName(obj) {
  if (isObject(obj) && obj.value != null) {
    return obj.value;
  } else {
    return obj + '';
  }
}

var _default = OrdinalMeta;
module.exports = _default;