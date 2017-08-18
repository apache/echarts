/**
 * Complete dimensions by data (guess dimension).
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var each = zrUtil.each;
    var isString = zrUtil.isString;
    var defaults = zrUtil.defaults;
    var normalizeToArray = modelUtil.normalizeToArray;

    var OTHER_DIMS = {tooltip: 1, label: 1, itemName: 1};

    /**
     * Complete the dimensions array, by user defined `dimension` and `encode`,
     * and guessing from the data structure.
     * If no 'value' dimension specified, the first no-named dimension will be
     * named as 'value'.
     *
     * @param {Array.<string>} sysDims Necessary dimensions, like ['x', 'y'], which
     *      provides not only dim template, but also default order.
     *      `name` of each item provides default coord name.
     *      [{dimsDef: []}, ...] can be specified to give names.
     * @param {Array} data Data list. [[1, 2, 3], [2, 3, 4]].
     * @param {Object} [opt]
     * @param {Array.<Object|string>} [opt.dimsDef] option.series.dimensions User defined dimensions
     *      For example: ['asdf', {name, type}, ...].
     * @param {Object} [opt.encodeDef] option.series.encode {x: 2, y: [3, 1], tooltip: [1, 2], label: 3}
     * @param {string} [opt.extraPrefix] Prefix of name when filling the left dimensions.
     * @param {string} [opt.extraFromZero] If specified, extra dim names will be:
     *                      extraPrefix + 0, extraPrefix + extraBaseIndex + 1 ...
     *                      If not specified, extra dim names will be:
     *                      extraPrefix, extraPrefix + 0, extraPrefix + 1 ...
     * @param {number} [opt.dimCount] If not specified, guess by the first data item.
     * @return {Array.<Object>} [{
     *      name: string mandatory,
     *      coordDim: string mandatory,
     *      coordDimIndex: number mandatory,
     *      type: string optional,
     *      tooltipName: string optional,
     *      otherDims: {
     *          tooltip: number optional,
     *          label: number optional
     *      },
     *      isExtraCoord: boolean true or undefined.
     *      other props ...
     * }]
     */
    function completeDimensions(sysDims, data, opt) {
        data = data || [];
        opt = opt || {};
        sysDims = (sysDims || []).slice();
        var dimsDef = (opt.dimsDef || []).slice();
        var encodeDef = zrUtil.createHashMap(opt.encodeDef);
        var dataDimNameMap = zrUtil.createHashMap();
        var coordDimNameMap = zrUtil.createHashMap();
        // var valueCandidate;
        var result = [];

        var dimCount = opt.dimCount;
        if (dimCount == null) {
            var value0 = retrieveValue(data[0]);
            dimCount = Math.max(
                zrUtil.isArray(value0) && value0.length || 1,
                sysDims.length,
                dimsDef.length
            );
            each(sysDims, function (sysDimItem) {
                var sysDimItemDimsDef = sysDimItem.dimsDef;
                sysDimItemDimsDef && (dimCount = Math.max(dimCount, sysDimItemDimsDef.length));
            });
        }

        // Apply user defined dims (`name` and `type`) and init result.
        for (var i = 0; i < dimCount; i++) {
            var dimDefItem = isString(dimsDef[i]) ? {name: dimsDef[i]} : (dimsDef[i] || {});
            var userDimName = dimDefItem.name;
            var resultItem = result[i] = {otherDims: {}};
            // Name will be applied later for avoiding duplication.
            if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
                // Only if `series.dimensions` is defined in option, tooltipName
                // will be set, and dimension will be diplayed vertically in
                // tooltip by default.
                resultItem.name = resultItem.tooltipName = userDimName;
                dataDimNameMap.set(userDimName, i);
            }
            dimDefItem.type != null && (resultItem.type = dimDefItem.type);
        }

        // Set `coordDim` and `coordDimIndex` by `encodeDef` and normalize `encodeDef`.
        encodeDef.each(function (dataDims, coordDim) {
            dataDims = encodeDef.set(coordDim, normalizeToArray(dataDims).slice());
            each(dataDims, function (resultDimIdx, coordDimIndex) {
                // The input resultDimIdx can be dim name or index.
                isString(resultDimIdx) && (resultDimIdx = dataDimNameMap.get(resultDimIdx));
                if (resultDimIdx != null && resultDimIdx < dimCount) {
                    dataDims[coordDimIndex] = resultDimIdx;
                    applyDim(result[resultDimIdx], coordDim, coordDimIndex);
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
                sysDimItem = zrUtil.clone(sysDimItem);
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
                    resultItem.name = resultItem.tooltipName = sysDimItemDimsDef[coordDimIndex];
                }
                sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
            });
        });

        // Make sure the first extra dim is 'value'.
        var extra = opt.extraPrefix || 'value';

        // Set dim `name` and other `coordDim` and other props.
        for (var resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
            var resultItem = result[resultDimIdx] = result[resultDimIdx] || {};
            var coordDim = resultItem.coordDim;

            coordDim == null && (
                resultItem.coordDim = genName(extra, coordDimNameMap, opt.extraFromZero),
                resultItem.coordDimIndex = 0,
                resultItem.isExtraCoord = true
            );

            resultItem.name == null && (resultItem.name = genName(
                resultItem.coordDim,
                dataDimNameMap
            ));

            resultItem.type == null && guessOrdinal(data, resultDimIdx)
                && (resultItem.type = 'ordinal');
        }

        return result;

        function applyDim(resultItem, coordDim, coordDimIndex) {
            if (OTHER_DIMS[coordDim]) {
                resultItem.otherDims[coordDim] = coordDimIndex;
            }
            else {
                resultItem.coordDim = coordDim;
                resultItem.coordDimIndex = coordDimIndex;
                coordDimNameMap.set(coordDim, true);
            }
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
    }

    // The rule should not be complex, otherwise user might not
    // be able to known where the data is wrong.
    var guessOrdinal = completeDimensions.guessOrdinal = function (data, dimIndex) {
        for (var i = 0, len = data.length; i < len; i++) {
            var value = retrieveValue(data[i]);

            if (!zrUtil.isArray(value)) {
                return false;
            }

            var value = value[dimIndex];
            // Consider usage convenience, '1', '2' will be treated as "number".
            // `isFinit('')` get `true`.
            if (value != null && isFinite(value) && value !== '') {
                return false;
            }
            else if (isString(value) && value !== '-') {
                return true;
            }
        }
        return false;
    };

    function retrieveValue(o) {
        return zrUtil.isArray(o) ? o : zrUtil.isObject(o) ? o.value: o;
    }

    return completeDimensions;

});