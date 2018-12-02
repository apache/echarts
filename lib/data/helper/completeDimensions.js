
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
var each = _util.each;
var isString = _util.isString;
var defaults = _util.defaults;
var extend = _util.extend;
var isObject = _util.isObject;
var clone = _util.clone;

var _model = require("../../util/model");

var normalizeToArray = _model.normalizeToArray;

var _sourceHelper = require("./sourceHelper");

var guessOrdinal = _sourceHelper.guessOrdinal;

var Source = require("../Source");

var _dimensionHelper = require("./dimensionHelper");

var OTHER_DIMENSIONS = _dimensionHelper.OTHER_DIMENSIONS;

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
 * @deprecated
 * Use `echarts/data/helper/createDimensions` instead.
 */

/**
 * @see {module:echarts/test/ut/spec/data/completeDimensions}
 *
 * Complete the dimensions array, by user defined `dimension` and `encode`,
 * and guessing from the data structure.
 * If no 'value' dimension specified, the first no-named dimension will be
 * named as 'value'.
 *
 * @param {Array.<string>} sysDims Necessary dimensions, like ['x', 'y'], which
 *      provides not only dim template, but also default order.
 *      properties: 'name', 'type', 'displayName'.
 *      `name` of each item provides default coord name.
 *      [{dimsDef: [string|Object, ...]}, ...] dimsDef of sysDim item provides default dim name, and
 *                                    provide dims count that the sysDim required.
 *      [{ordinalMeta}] can be specified.
 * @param {module:echarts/data/Source|Array|Object} source or data (for compatibal with pervious)
 * @param {Object} [opt]
 * @param {Array.<Object|string>} [opt.dimsDef] option.series.dimensions User defined dimensions
 *      For example: ['asdf', {name, type}, ...].
 * @param {Object|HashMap} [opt.encodeDef] option.series.encode {x: 2, y: [3, 1], tooltip: [1, 2], label: 3}
 * @param {string} [opt.generateCoord] Generate coord dim with the given name.
 *                 If not specified, extra dim names will be:
 *                 'value', 'value0', 'value1', ...
 * @param {number} [opt.generateCoordCount] By default, the generated dim name is `generateCoord`.
 *                 If `generateCoordCount` specified, the generated dim names will be:
 *                 `generateCoord` + 0, `generateCoord` + 1, ...
 *                 can be Infinity, indicate that use all of the remain columns.
 * @param {number} [opt.dimCount] If not specified, guess by the first data item.
 * @param {number} [opt.encodeDefaulter] If not specified, auto find the next available data dim.
 * @return {Array.<Object>} [{
 *      name: string mandatory,
 *      displayName: string, the origin name in dimsDef, see source helper.
 *                 If displayName given, the tooltip will displayed vertically.
 *      coordDim: string mandatory,
 *      coordDimIndex: number mandatory,
 *      type: string optional,
 *      otherDims: { never null/undefined
 *          tooltip: number optional,
 *          label: number optional,
 *          itemName: number optional,
 *          seriesName: number optional,
 *      },
 *      isExtraCoord: boolean true if coord is generated
 *          (not specified in encode and not series specified)
 *      other props ...
 * }]
 */
function completeDimensions(sysDims, source, opt) {
  if (!Source.isInstance(source)) {
    source = Source.seriesDataToSource(source);
  }

  opt = opt || {};
  sysDims = (sysDims || []).slice();
  var dimsDef = (opt.dimsDef || []).slice();
  var encodeDef = createHashMap(opt.encodeDef);
  var dataDimNameMap = createHashMap();
  var coordDimNameMap = createHashMap(); // var valueCandidate;

  var result = [];
  var dimCount = getDimCount(source, sysDims, dimsDef, opt.dimCount); // Apply user defined dims (`name` and `type`) and init result.

  for (var i = 0; i < dimCount; i++) {
    var dimDefItem = dimsDef[i] = extend({}, isObject(dimsDef[i]) ? dimsDef[i] : {
      name: dimsDef[i]
    });
    var userDimName = dimDefItem.name;
    var resultItem = result[i] = {
      otherDims: {}
    }; // Name will be applied later for avoiding duplication.

    if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
      // Only if `series.dimensions` is defined in option
      // displayName, will be set, and dimension will be diplayed vertically in
      // tooltip by default.
      resultItem.name = resultItem.displayName = userDimName;
      dataDimNameMap.set(userDimName, i);
    }

    dimDefItem.type != null && (resultItem.type = dimDefItem.type);
    dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
  } // Set `coordDim` and `coordDimIndex` by `encodeDef` and normalize `encodeDef`.


  encodeDef.each(function (dataDims, coordDim) {
    dataDims = normalizeToArray(dataDims).slice(); // Note: It is allowed that `dataDims.length` is `0`, e.g., options is
    // `{encode: {x: -1, y: 1}}`. Should not filter anything in
    // this case.

    if (dataDims.length === 1 && dataDims[0] < 0) {
      encodeDef.set(coordDim, false);
      return;
    }

    var validDataDims = encodeDef.set(coordDim, []);
    each(dataDims, function (resultDimIdx, idx) {
      // The input resultDimIdx can be dim name or index.
      isString(resultDimIdx) && (resultDimIdx = dataDimNameMap.get(resultDimIdx));

      if (resultDimIdx != null && resultDimIdx < dimCount) {
        validDataDims[idx] = resultDimIdx;
        applyDim(result[resultDimIdx], coordDim, idx);
      }
    });
  }); // Apply templetes and default order from `sysDims`.

  var availDimIdx = 0;
  each(sysDims, function (sysDimItem, sysDimIndex) {
    var coordDim;
    var sysDimItem;
    var sysDimItemDimsDef;
    var sysDimItemOtherDims;

    if (isString(sysDimItem)) {
      coordDim = sysDimItem;
      sysDimItem = {};
    } else {
      coordDim = sysDimItem.name;
      var ordinalMeta = sysDimItem.ordinalMeta;
      sysDimItem.ordinalMeta = null;
      sysDimItem = clone(sysDimItem);
      sysDimItem.ordinalMeta = ordinalMeta; // `coordDimIndex` should not be set directly.

      sysDimItemDimsDef = sysDimItem.dimsDef;
      sysDimItemOtherDims = sysDimItem.otherDims;
      sysDimItem.name = sysDimItem.coordDim = sysDimItem.coordDimIndex = sysDimItem.dimsDef = sysDimItem.otherDims = null;
    }

    var dataDims = encodeDef.get(coordDim); // negative resultDimIdx means no need to mapping.

    if (dataDims === false) {
      return;
    }

    var dataDims = normalizeToArray(dataDims); // dimensions provides default dim sequences.

    if (!dataDims.length) {
      for (var i = 0; i < (sysDimItemDimsDef && sysDimItemDimsDef.length || 1); i++) {
        while (availDimIdx < result.length && result[availDimIdx].coordDim != null) {
          availDimIdx++;
        }

        availDimIdx < result.length && dataDims.push(availDimIdx++);
      }
    } // Apply templates.


    each(dataDims, function (resultDimIdx, coordDimIndex) {
      var resultItem = result[resultDimIdx];
      applyDim(defaults(resultItem, sysDimItem), coordDim, coordDimIndex);

      if (resultItem.name == null && sysDimItemDimsDef) {
        var sysDimItemDimsDefItem = sysDimItemDimsDef[coordDimIndex];
        !isObject(sysDimItemDimsDefItem) && (sysDimItemDimsDefItem = {
          name: sysDimItemDimsDefItem
        });
        resultItem.name = resultItem.displayName = sysDimItemDimsDefItem.name;
        resultItem.defaultTooltip = sysDimItemDimsDefItem.defaultTooltip;
      } // FIXME refactor, currently only used in case: {otherDims: {tooltip: false}}


      sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
    });
  });

  function applyDim(resultItem, coordDim, coordDimIndex) {
    if (OTHER_DIMENSIONS.get(coordDim) != null) {
      resultItem.otherDims[coordDim] = coordDimIndex;
    } else {
      resultItem.coordDim = coordDim;
      resultItem.coordDimIndex = coordDimIndex;
      coordDimNameMap.set(coordDim, true);
    }
  } // Make sure the first extra dim is 'value'.


  var generateCoord = opt.generateCoord;
  var generateCoordCount = opt.generateCoordCount;
  var fromZero = generateCoordCount != null;
  generateCoordCount = generateCoord ? generateCoordCount || 1 : 0;
  var extra = generateCoord || 'value'; // Set dim `name` and other `coordDim` and other props.

  for (var resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
    var resultItem = result[resultDimIdx] = result[resultDimIdx] || {};
    var coordDim = resultItem.coordDim;

    if (coordDim == null) {
      resultItem.coordDim = genName(extra, coordDimNameMap, fromZero);
      resultItem.coordDimIndex = 0;

      if (!generateCoord || generateCoordCount <= 0) {
        resultItem.isExtraCoord = true;
      }

      generateCoordCount--;
    }

    resultItem.name == null && (resultItem.name = genName(resultItem.coordDim, dataDimNameMap));

    if (resultItem.type == null && guessOrdinal(source, resultDimIdx, resultItem.name)) {
      resultItem.type = 'ordinal';
    }
  }

  return result;
} // ??? TODO
// Originally detect dimCount by data[0]. Should we
// optimize it to only by sysDims and dimensions and encode.
// So only necessary dims will be initialized.
// But
// (1) custom series should be considered. where other dims
// may be visited.
// (2) sometimes user need to calcualte bubble size or use visualMap
// on other dimensions besides coordSys needed.
// So, dims that is not used by system, should be shared in storage?


function getDimCount(source, sysDims, dimsDef, optDimCount) {
  // Note that the result dimCount should not small than columns count
  // of data, otherwise `dataDimNameMap` checking will be incorrect.
  var dimCount = Math.max(source.dimensionsDetectCount || 1, sysDims.length, dimsDef.length, optDimCount || 0);
  each(sysDims, function (sysDimItem) {
    var sysDimItemDimsDef = sysDimItem.dimsDef;
    sysDimItemDimsDef && (dimCount = Math.max(dimCount, sysDimItemDimsDef.length));
  });
  return dimCount;
}

function genName(name, map, fromZero) {
  if (fromZero || map.get(name) != null) {
    var i = 0;

    while (map.get(name + i) != null) {
      i++;
    }

    name += i;
  }

  map.set(name, true);
  return name;
}

var _default = completeDimensions;
module.exports = _default;