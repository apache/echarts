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

import {__DEV__} from '../../config';
import {makeInner, getDataItemValue} from '../../util/model';
import {
    createHashMap,
    each,
    map,
    isArray,
    isString,
    isObject,
    isTypedArray,
    isArrayLike,
    extend,
    assert
} from 'zrender/src/core/util';
import Source from '../Source';

import {
    SOURCE_FORMAT_ORIGINAL,
    SOURCE_FORMAT_ARRAY_ROWS,
    SOURCE_FORMAT_OBJECT_ROWS,
    SOURCE_FORMAT_KEYED_COLUMNS,
    SOURCE_FORMAT_UNKNOWN,
    SOURCE_FORMAT_TYPED_ARRAY,
    SERIES_LAYOUT_BY_ROW
} from './sourceType';

// The result of `guessOrdinal`.
export var BE_ORDINAL = {
    Must: 1, // Encounter string but not '-' and not number-like.
    Might: 2, // Encounter string but number-like.
    Not: 3 // Other cases
};

var inner = makeInner();

/**
 * @see {module:echarts/data/Source}
 * @param {module:echarts/component/dataset/DatasetModel} datasetModel
 * @return {string} sourceFormat
 */
export function detectSourceFormat(datasetModel) {
    var data = datasetModel.option.source;
    var sourceFormat = SOURCE_FORMAT_UNKNOWN;

    if (isTypedArray(data)) {
        sourceFormat = SOURCE_FORMAT_TYPED_ARRAY;
    }
    else if (isArray(data)) {
        // FIXME Whether tolerate null in top level array?
        if (data.length === 0) {
            sourceFormat = SOURCE_FORMAT_ARRAY_ROWS;
        }

        for (var i = 0, len = data.length; i < len; i++) {
            var item = data[i];

            if (item == null) {
                continue;
            }
            else if (isArray(item)) {
                sourceFormat = SOURCE_FORMAT_ARRAY_ROWS;
                break;
            }
            else if (isObject(item)) {
                sourceFormat = SOURCE_FORMAT_OBJECT_ROWS;
                break;
            }
        }
    }
    else if (isObject(data)) {
        for (var key in data) {
            if (data.hasOwnProperty(key) && isArrayLike(data[key])) {
                sourceFormat = SOURCE_FORMAT_KEYED_COLUMNS;
                break;
            }
        }
    }
    else if (data != null) {
        throw new Error('Invalid data');
    }

    inner(datasetModel).sourceFormat = sourceFormat;
}

/**
 * [Scenarios]:
 * (1) Provide source data directly:
 *     series: {
 *         encode: {...},
 *         dimensions: [...]
 *         seriesLayoutBy: 'row',
 *         data: [[...]]
 *     }
 * (2) Refer to datasetModel.
 *     series: [{
 *         encode: {...}
 *         // Ignore datasetIndex means `datasetIndex: 0`
 *         // and the dimensions defination in dataset is used
 *     }, {
 *         encode: {...},
 *         seriesLayoutBy: 'column',
 *         datasetIndex: 1
 *     }]
 *
 * Get data from series itself or datset.
 * @return {module:echarts/data/Source} source
 */
export function getSource(seriesModel) {
    return inner(seriesModel).source;
}

/**
 * MUST be called before mergeOption of all series.
 * @param {module:echarts/model/Global} ecModel
 */
export function resetSourceDefaulter(ecModel) {
    // `datasetMap` is used to make default encode.
    inner(ecModel).datasetMap = createHashMap();
}

/**
 * [Caution]:
 * MUST be called after series option merged and
 * before "series.getInitailData()" called.
 *
 * [The rule of making default encode]:
 * Category axis (if exists) alway map to the first dimension.
 * Each other axis occupies a subsequent dimension.
 *
 * [Why make default encode]:
 * Simplify the typing of encode in option, avoiding the case like that:
 * series: [{encode: {x: 0, y: 1}}, {encode: {x: 0, y: 2}}, {encode: {x: 0, y: 3}}],
 * where the "y" have to be manually typed as "1, 2, 3, ...".
 *
 * @param {module:echarts/model/Series} seriesModel
 */
export function prepareSource(seriesModel) {
    var seriesOption = seriesModel.option;

    var data = seriesOption.data;
    var sourceFormat = isTypedArray(data)
        ? SOURCE_FORMAT_TYPED_ARRAY : SOURCE_FORMAT_ORIGINAL;
    var fromDataset = false;

    var seriesLayoutBy = seriesOption.seriesLayoutBy;
    var sourceHeader = seriesOption.sourceHeader;
    var dimensionsDefine = seriesOption.dimensions;

    var datasetModel = getDatasetModel(seriesModel);
    if (datasetModel) {
        var datasetOption = datasetModel.option;

        data = datasetOption.source;
        sourceFormat = inner(datasetModel).sourceFormat;
        fromDataset = true;

        // These settings from series has higher priority.
        seriesLayoutBy = seriesLayoutBy || datasetOption.seriesLayoutBy;
        sourceHeader == null && (sourceHeader = datasetOption.sourceHeader);
        dimensionsDefine = dimensionsDefine || datasetOption.dimensions;
    }

    var completeResult = completeBySourceData(
        data, sourceFormat, seriesLayoutBy, sourceHeader, dimensionsDefine
    );

    inner(seriesModel).source = new Source({
        data: data,
        fromDataset: fromDataset,
        seriesLayoutBy: seriesLayoutBy,
        sourceFormat: sourceFormat,
        dimensionsDefine: completeResult.dimensionsDefine,
        startIndex: completeResult.startIndex,
        dimensionsDetectCount: completeResult.dimensionsDetectCount,
        // Note: dataset option does not have `encode`.
        encodeDefine: seriesOption.encode
    });
}

// return {startIndex, dimensionsDefine, dimensionsCount}
function completeBySourceData(data, sourceFormat, seriesLayoutBy, sourceHeader, dimensionsDefine) {
    if (!data) {
        return {dimensionsDefine: normalizeDimensionsDefine(dimensionsDefine)};
    }

    var dimensionsDetectCount;
    var startIndex;

    if (sourceFormat === SOURCE_FORMAT_ARRAY_ROWS) {
        // Rule: Most of the first line are string: it is header.
        // Caution: consider a line with 5 string and 1 number,
        // it still can not be sure it is a head, because the
        // 5 string may be 5 values of category columns.
        if (sourceHeader === 'auto' || sourceHeader == null) {
            arrayRowsTravelFirst(function (val) {
                // '-' is regarded as null/undefined.
                if (val != null && val !== '-') {
                    if (isString(val)) {
                        startIndex == null && (startIndex = 1);
                    }
                    else {
                        startIndex = 0;
                    }
                }
            // 10 is an experience number, avoid long loop.
            }, seriesLayoutBy, data, 10);
        }
        else {
            startIndex = sourceHeader ? 1 : 0;
        }

        if (!dimensionsDefine && startIndex === 1) {
            dimensionsDefine = [];
            arrayRowsTravelFirst(function (val, index) {
                dimensionsDefine[index] = val != null ? val : '';
            }, seriesLayoutBy, data);
        }

        dimensionsDetectCount = dimensionsDefine
            ? dimensionsDefine.length
            : seriesLayoutBy === SERIES_LAYOUT_BY_ROW
            ? data.length
            : data[0]
            ? data[0].length
            : null;
    }
    else if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS) {
        if (!dimensionsDefine) {
            dimensionsDefine = objectRowsCollectDimensions(data);
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        if (!dimensionsDefine) {
            dimensionsDefine = [];
            each(data, function (colArr, key) {
                dimensionsDefine.push(key);
            });
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        var value0 = getDataItemValue(data[0]);
        dimensionsDetectCount = isArray(value0) && value0.length || 1;
    }
    else if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
        if (__DEV__) {
            assert(!!dimensionsDefine, 'dimensions must be given if data is TypedArray.');
        }
    }

    return {
        startIndex: startIndex,
        dimensionsDefine: normalizeDimensionsDefine(dimensionsDefine),
        dimensionsDetectCount: dimensionsDetectCount
    };
}

// Consider dimensions defined like ['A', 'price', 'B', 'price', 'C', 'price'],
// which is reasonable. But dimension name is duplicated.
// Returns undefined or an array contains only object without null/undefiend or string.
function normalizeDimensionsDefine(dimensionsDefine) {
    if (!dimensionsDefine) {
        // The meaning of null/undefined is different from empty array.
        return;
    }
    var nameMap = createHashMap();
    return map(dimensionsDefine, function (item, index) {
        item = extend({}, isObject(item) ? item : {name: item});

        // User can set null in dimensions.
        // We dont auto specify name, othewise a given name may
        // cause it be refered unexpectedly.
        if (item.name == null) {
            return item;
        }

        // Also consider number form like 2012.
        item.name += '';
        // User may also specify displayName.
        // displayName will always exists except user not
        // specified or dim name is not specified or detected.
        // (A auto generated dim name will not be used as
        // displayName).
        if (item.displayName == null) {
            item.displayName = item.name;
        }

        var exist = nameMap.get(item.name);
        if (!exist) {
            nameMap.set(item.name, {count: 1});
        }
        else {
            item.name += '-' + exist.count++;
        }

        return item;
    });
}

function arrayRowsTravelFirst(cb, seriesLayoutBy, data, maxLoop) {
    maxLoop == null && (maxLoop = Infinity);
    if (seriesLayoutBy === SERIES_LAYOUT_BY_ROW) {
        for (var i = 0; i < data.length && i < maxLoop; i++) {
            cb(data[i] ? data[i][0] : null, i);
        }
    }
    else {
        var value0 = data[0] || [];
        for (var i = 0; i < value0.length && i < maxLoop; i++) {
            cb(value0[i], i);
        }
    }
}

function objectRowsCollectDimensions(data) {
    var firstIndex = 0;
    var obj;
    while (firstIndex < data.length && !(obj = data[firstIndex++])) {} // jshint ignore: line
    if (obj) {
        var dimensions = [];
        each(obj, function (value, key) {
            dimensions.push(key);
        });
        return dimensions;
    }
}

/**
 * [The strategy of the arrengment of data dimensions for dataset]:
 * "value way": all axes are non-category axes. So series one by one take
 *     several (the number is coordSysDims.length) dimensions from dataset.
 *     The result of data arrengment of data dimensions like:
 *     | ser0_x | ser0_y | ser1_x | ser1_y | ser2_x | ser2_y |
 * "category way": at least one axis is category axis. So the the first data
 *     dimension is always mapped to the first category axis and shared by
 *     all of the series. The other data dimensions are taken by series like
 *     "value way" does.
 *     The result of data arrengment of data dimensions like:
 *     | ser_shared_x | ser0_y | ser1_y | ser2_y |
 *
 * @param {Array.<Object|string>} coordDimensions [{name: <string>, type: <string>, dimsDef: <Array>}, ...]
 * @param {module:model/Series} seriesModel
 * @param {module:data/Source} source
 * @return {Object} encode Never be `null/undefined`.
 */
export function makeSeriesEncodeForAxisCoordSys(coordDimensions, seriesModel, source) {
    var encode = {};

    var datasetModel = getDatasetModel(seriesModel);
    // Currently only make default when using dataset, util more reqirements occur.
    if (!datasetModel || !coordDimensions) {
        return encode;
    }

    var encodeItemName = [];
    var encodeSeriesName = [];

    var ecModel = seriesModel.ecModel;
    var datasetMap = inner(ecModel).datasetMap;
    var key = datasetModel.uid + '_' + source.seriesLayoutBy;

    var baseCategoryDimIndex;
    var categoryWayValueDimStart;
    coordDimensions = coordDimensions.slice();
    each(coordDimensions, function (coordDimInfo, coordDimIdx) {
        !isObject(coordDimInfo) && (coordDimensions[coordDimIdx] = {name: coordDimInfo});
        if (coordDimInfo.type === 'ordinal' && baseCategoryDimIndex == null) {
            baseCategoryDimIndex = coordDimIdx;
            categoryWayValueDimStart = getDataDimCountOnCoordDim(coordDimensions[coordDimIdx]);
        }
        encode[coordDimInfo.name] = [];
    });

    var datasetRecord = datasetMap.get(key)
        || datasetMap.set(key, {categoryWayDim: categoryWayValueDimStart, valueWayDim: 0});

    // TODO
    // Auto detect first time axis and do arrangement.
    each(coordDimensions, function (coordDimInfo, coordDimIdx) {
        var coordDimName = coordDimInfo.name;
        var count = getDataDimCountOnCoordDim(coordDimInfo);

        // In value way.
        if (baseCategoryDimIndex == null) {
            var start = datasetRecord.valueWayDim;
            pushDim(encode[coordDimName], start, count);
            pushDim(encodeSeriesName, start, count);
            datasetRecord.valueWayDim += count;

            // ??? TODO give a better default series name rule?
            // especially when encode x y specified.
            // consider: when mutiple series share one dimension
            // category axis, series name should better use
            // the other dimsion name. On the other hand, use
            // both dimensions name.
        }
        // In category way, the first category axis.
        else if (baseCategoryDimIndex === coordDimIdx) {
            pushDim(encode[coordDimName], 0, count);
            pushDim(encodeItemName, 0, count);
        }
        // In category way, the other axis.
        else {
            var start = datasetRecord.categoryWayDim;
            pushDim(encode[coordDimName], start, count);
            pushDim(encodeSeriesName, start, count);
            datasetRecord.categoryWayDim += count;
        }
    });

    function pushDim(dimIdxArr, idxFrom, idxCount) {
        for (var i = 0; i < idxCount; i++) {
            dimIdxArr.push(idxFrom + i);
        }
    }

    function getDataDimCountOnCoordDim(coordDimInfo) {
        var dimsDef = coordDimInfo.dimsDef;
        return dimsDef ? dimsDef.length : 1;
    }

    encodeItemName.length && (encode.itemName = encodeItemName);
    encodeSeriesName.length && (encode.seriesName = encodeSeriesName);

    return encode;
}

/**
 * Work for data like [{name: ..., value: ...}, ...].
 *
 * @param {module:model/Series} seriesModel
 * @param {module:data/Source} source
 * @return {Object} encode Never be `null/undefined`.
 */
export function makeSeriesEncodeForNameBased(seriesModel, source, dimCount) {
    var encode = {};

    var datasetModel = getDatasetModel(seriesModel);
    // Currently only make default when using dataset, util more reqirements occur.
    if (!datasetModel) {
        return encode;
    }

    var sourceFormat = source.sourceFormat;
    var dimensionsDefine = source.dimensionsDefine;

    var potentialNameDimIndex;
    if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS || sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        each(dimensionsDefine, function (dim, idx) {
            if ((isObject(dim) ? dim.name : dim) === 'name') {
                potentialNameDimIndex = idx;
            }
        });
    }

    // idxResult: {v, n}.
    var idxResult = (function () {

        var idxRes0 = {};
        var idxRes1 = {};
        var guessRecords = [];

        // 5 is an experience value.
        for (var i = 0, len = Math.min(5, dimCount); i < len; i++) {
            var guessResult = doGuessOrdinal(
                source.data, sourceFormat, source.seriesLayoutBy,
                dimensionsDefine, source.startIndex, i
            );
            guessRecords.push(guessResult);
            var isPureNumber = guessResult === BE_ORDINAL.Not;

            // [Strategy of idxRes0]: find the first BE_ORDINAL.Not as the value dim,
            // and then find a name dim with the priority:
            // "BE_ORDINAL.Might|BE_ORDINAL.Must" > "other dim" > "the value dim itself".
            if (isPureNumber && idxRes0.v == null && i !== potentialNameDimIndex) {
                idxRes0.v = i;
            }
            if (idxRes0.n == null
                || (idxRes0.n === idxRes0.v)
                || (!isPureNumber && guessRecords[idxRes0.n] === BE_ORDINAL.Not)
            ) {
                idxRes0.n = i;
            }
            if (fulfilled(idxRes0) && guessRecords[idxRes0.n] !== BE_ORDINAL.Not) {
                return idxRes0;
            }

            // [Strategy of idxRes1]: if idxRes0 not satisfied (that is, no BE_ORDINAL.Not),
            // find the first BE_ORDINAL.Might as the value dim,
            // and then find a name dim with the priority:
            // "other dim" > "the value dim itself".
            // That is for backward compat: number-like (e.g., `'3'`, `'55'`) can be
            // treated as number.
            if (!isPureNumber) {
                if (guessResult === BE_ORDINAL.Might && idxRes1.v == null && i !== potentialNameDimIndex) {
                    idxRes1.v = i;
                }
                if (idxRes1.n == null || (idxRes1.n === idxRes1.v)) {
                    idxRes1.n = i;
                }
            }
        }

        function fulfilled(idxResult) {
            return idxResult.v != null && idxResult.n != null;
        }

        return fulfilled(idxRes0) ? idxRes0 : fulfilled(idxRes1) ? idxRes1 : null;
    })();

    if (idxResult) {
        encode.value = idxResult.v;
        // `potentialNameDimIndex` has highest priority.
        var nameDimIndex = potentialNameDimIndex != null ? potentialNameDimIndex : idxResult.n;
        // By default, label use itemName in charts.
        // So we dont set encodeLabel here.
        encode.itemName = [nameDimIndex];
        encode.seriesName = [nameDimIndex];
    }

    return encode;
}

/**
 * If return null/undefined, indicate that should not use datasetModel.
 */
function getDatasetModel(seriesModel) {
    var option = seriesModel.option;
    // Caution: consider the scenario:
    // A dataset is declared and a series is not expected to use the dataset,
    // and at the beginning `setOption({series: { noData })` (just prepare other
    // option but no data), then `setOption({series: {data: [...]}); In this case,
    // the user should set an empty array to avoid that dataset is used by default.
    var thisData = option.data;
    if (!thisData) {
        return seriesModel.ecModel.getComponent('dataset', option.datasetIndex || 0);
    }
}

/**
 * The rule should not be complex, otherwise user might not
 * be able to known where the data is wrong.
 * The code is ugly, but how to make it neat?
 *
 * @param {module:echars/data/Source} source
 * @param {number} dimIndex
 * @return {BE_ORDINAL} guess result.
 */
export function guessOrdinal(source, dimIndex) {
    return doGuessOrdinal(
        source.data,
        source.sourceFormat,
        source.seriesLayoutBy,
        source.dimensionsDefine,
        source.startIndex,
        dimIndex
    );
}

// dimIndex may be overflow source data.
// return {BE_ORDINAL}
function doGuessOrdinal(
    data, sourceFormat, seriesLayoutBy, dimensionsDefine, startIndex, dimIndex
) {
    var result;
    // Experience value.
    var maxLoop = 5;

    if (isTypedArray(data)) {
        return BE_ORDINAL.Not;
    }

    // When sourceType is 'objectRows' or 'keyedColumns', dimensionsDefine
    // always exists in source.
    var dimName;
    var dimType;
    if (dimensionsDefine) {
        var dimDefItem = dimensionsDefine[dimIndex];
        if (isObject(dimDefItem)) {
            dimName = dimDefItem.name;
            dimType = dimDefItem.type;
        }
        else if (isString(dimDefItem)) {
            dimName = dimDefItem;
        }
    }

    if (dimType != null) {
        return dimType === 'ordinal' ? BE_ORDINAL.Must : BE_ORDINAL.Not;
    }

    if (sourceFormat === SOURCE_FORMAT_ARRAY_ROWS) {
        if (seriesLayoutBy === SERIES_LAYOUT_BY_ROW) {
            var sample = data[dimIndex];
            for (var i = 0; i < (sample || []).length && i < maxLoop; i++) {
                if ((result = detectValue(sample[startIndex + i])) != null) {
                    return result;
                }
            }
        }
        else {
            for (var i = 0; i < data.length && i < maxLoop; i++) {
                var row = data[startIndex + i];
                if (row && (result = detectValue(row[dimIndex])) != null) {
                    return result;
                }
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS) {
        if (!dimName) {
            return BE_ORDINAL.Not;
        }
        for (var i = 0; i < data.length && i < maxLoop; i++) {
            var item = data[i];
            if (item && (result = detectValue(item[dimName])) != null) {
                return result;
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        if (!dimName) {
            return BE_ORDINAL.Not;
        }
        var sample = data[dimName];
        if (!sample || isTypedArray(sample)) {
            return BE_ORDINAL.Not;
        }
        for (var i = 0; i < sample.length && i < maxLoop; i++) {
            if ((result = detectValue(sample[i])) != null) {
                return result;
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        for (var i = 0; i < data.length && i < maxLoop; i++) {
            var item = data[i];
            var val = getDataItemValue(item);
            if (!isArray(val)) {
                return BE_ORDINAL.Not;
            }
            if ((result = detectValue(val[dimIndex])) != null) {
                return result;
            }
        }
    }

    function detectValue(val) {
        var beStr = isString(val);
        // Consider usage convenience, '1', '2' will be treated as "number".
        // `isFinit('')` get `true`.
        if (val != null && isFinite(val) && val !== '') {
            return beStr ? BE_ORDINAL.Might : BE_ORDINAL.Not;
        }
        else if (beStr && val !== '-') {
            return BE_ORDINAL.Must;
        }
    }

    return BE_ORDINAL.Not;
}
