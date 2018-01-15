/**
 * @deprecated
 * Use `echarts/data/helper/createDimensions` instead.
 */

import {createHashMap, each, isString, defaults, extend, isObject, clone} from 'zrender/src/core/util';
import {normalizeToArray} from '../../util/model';
import {guessOrdinal} from './sourceHelper';
import Source from '../Source';
import {OTHER_DIMENSIONS} from './dimensionHelper';

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
 *      [{dimsDef: [string...]}, ...] can be specified to give names.
 *      [{ordinalMeta}] can be specified.
 * @param {module:echarts/data/Source|Array|Object} source or data (for compatibal with pervious)
 * @param {Object} [opt]
 * @param {Array.<Object|string>} [opt.dimsDef] option.series.dimensions User defined dimensions
 *      For example: ['asdf', {name, type}, ...].
 * @param {Object|HashMap} [opt.encodeDef] option.series.encode {x: 2, y: [3, 1], tooltip: [1, 2], label: 3}
 * @param {string} [opt.extraPrefix] Prefix of name when filling the left dimensions.
 * @param {string} [opt.extraFromZero] If specified, extra dim names will be:
 *                      extraPrefix + 0, extraPrefix + extraBaseIndex + 1 ...
 *                      If not specified, extra dim names will be:
 *                      extraPrefix, extraPrefix + 0, extraPrefix + 1 ...
 * @param {number} [opt.dimCount] If not specified, guess by the first data item.
 * @param {number} [opt.encodeDefaulter] If not specified, auto find the next available data dim.
 * @return {Array.<Object>} [{
 *      name: string mandatory,
 *      displayName: string, the origin name in dimsDef, see source helper.
 *                 If displayName given, the tooltip will displayed vertically.
 *      coordDim: string mandatory,
 *      isSysCoord: boolean True if the coord is from sys dimension.
 *      coordDimIndex: number mandatory,
 *      type: string optional,
 *      otherDims: { never null/undefined
 *          tooltip: number optional,
 *          label: number optional,
 *          itemName: number optional,
 *          seriesName: number optional,
 *      },
 *      isExtraCoord: boolean true or undefined.
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
    var coordDimNameMap = createHashMap();
    // var valueCandidate;
    var result = [];

    var dimCount = getDimCount(source, sysDims, dimsDef, opt.dimCount);

    // Apply user defined dims (`name` and `type`) and init result.
    for (var i = 0; i < dimCount; i++) {
        var dimDefItem = dimsDef[i] = extend(
            {}, isObject(dimsDef[i]) ? dimsDef[i] : {name: dimsDef[i]}
        );
        var userDimName = dimDefItem.name;
        var resultItem = result[i] = {otherDims: {}};
        // Name will be applied later for avoiding duplication.
        if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
            // Only if `series.dimensions` is defined in option
            // displayName, will be set, and dimension will be diplayed vertically in
            // tooltip by default.
            resultItem.name = resultItem.displayName = userDimName;
            dataDimNameMap.set(userDimName, i);
        }
        dimDefItem.type != null && (resultItem.type = dimDefItem.type);
        dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
    }

    // Set `coordDim` and `coordDimIndex` by `encodeDef` and normalize `encodeDef`.
    encodeDef.each(function (dataDims, coordDim) {
        dataDims = normalizeToArray(dataDims).slice();
        var validDataDims = encodeDef.set(coordDim, []);
        each(dataDims, function (resultDimIdx, idx) {
            // The input resultDimIdx can be dim name or index.
            isString(resultDimIdx) && (resultDimIdx = dataDimNameMap.get(resultDimIdx));
            if (resultDimIdx != null && resultDimIdx < dimCount) {
                validDataDims[idx] = resultDimIdx;
                applyDim(result[resultDimIdx], coordDim, idx);
            }
        });
    });

    // Apply templetes and default order from `sysDims`.
    var availDimIdx = 0;
    each(sysDims, function (sysDimItem, sysDimIndex) {
        var coordDim;
        var sysDimItem;
        var sysDimItemDimsDef;
        var sysDimItemOtherDims;
        if (isString(sysDimItem)) {
            coordDim = sysDimItem;
            sysDimItem = {};
        }
        else {
            coordDim = sysDimItem.name;
            var ordinalMeta = sysDimItem.ordinalMeta;
            sysDimItem.ordinalMeta = null;
            sysDimItem = clone(sysDimItem);
            sysDimItem.ordinalMeta = ordinalMeta;
            // `coordDimIndex` should not be set directly.
            sysDimItemDimsDef = sysDimItem.dimsDef;
            sysDimItemOtherDims = sysDimItem.otherDims;
            sysDimItem.name = sysDimItem.coordDim = sysDimItem.coordDimIndex
                = sysDimItem.dimsDef = sysDimItem.otherDims = null;
        }

        var dataDims = normalizeToArray(encodeDef.get(coordDim));
        // dimensions provides default dim sequences.
        if (!dataDims.length) {
            for (var i = 0; i < (sysDimItemDimsDef && sysDimItemDimsDef.length || 1); i++) {
                while (availDimIdx < result.length && result[availDimIdx].coordDim != null) {
                    availDimIdx++;
                }
                availDimIdx < result.length && dataDims.push(availDimIdx++);
            }
        }

        // Apply templates.
        each(dataDims, function (resultDimIdx, coordDimIndex) {
            var resultItem = result[resultDimIdx];
            applyDim(defaults(resultItem, sysDimItem), coordDim, coordDimIndex);
            if (resultItem.name == null && sysDimItemDimsDef) {
                resultItem.name = resultItem.displayName = sysDimItemDimsDef[coordDimIndex];
            }
            resultItem.isSysCoord = true;
            // FIXME refactor, currently only used in case: {otherDims: {tooltip: false}}
            sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
        });
    });

    function applyDim(resultItem, coordDim, coordDimIndex) {
        if (OTHER_DIMENSIONS.get(coordDim) != null) {
            resultItem.otherDims[coordDim] = coordDimIndex;
        }
        else {
            resultItem.coordDim = coordDim;
            resultItem.coordDimIndex = coordDimIndex;
            coordDimNameMap.set(coordDim, true);
        }
    }

    // Make sure the first extra dim is 'value'.
    var extra = opt.extraPrefix || 'value';

    // Set dim `name` and other `coordDim` and other props.
    for (var resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
        var resultItem = result[resultDimIdx] = result[resultDimIdx] || {};
        var coordDim = resultItem.coordDim;

        coordDim == null && (
            resultItem.coordDim = genName(
                extra, coordDimNameMap, opt.extraFromZero
            ),
            resultItem.coordDimIndex = 0,
            resultItem.isExtraCoord = true
        );

        resultItem.name == null && (resultItem.name = genName(
            resultItem.coordDim,
            dataDimNameMap
        ));

        if (resultItem.type == null && guessOrdinal(source, resultDimIdx, resultItem.name)) {
            resultItem.type = 'ordinal';
        }
    }

    return result;
}

// ??? TODO
// Originally detect dimCount by data[0]. Should we
// optimize it to only by sysDims and dimensions and encode.
// So only necessary dims will be initialized.
// But
// (1) custom series should be considered. where other dims
// may be visited.
// (2) sometimes user need to calcualte bubble size or use visualMap
// on other dimensions besides coordSys needed.
function getDimCount(source, sysDims, dimsDef, dimCount) {
    if (dimCount == null) {
        dimCount = Math.max(
            source.dimensionsDetectCount || 1,
            sysDims.length,
            dimsDef.length
        );
        each(sysDims, function (sysDimItem) {
            var sysDimItemDimsDef = sysDimItem.dimsDef;
            sysDimItemDimsDef && (dimCount = Math.max(dimCount, sysDimItemDimsDef.length));
        });
    }
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

export default completeDimensions;
