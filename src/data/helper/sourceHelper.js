import {__DEV__} from '../../config';
import {makeInner} from '../../util/model';
import {getCoordSysDefineBySeries} from '../../model/referHelper';
import {
    createHashMap,
    each,
    isArray,
    isString,
    isObject,
    isTypedArray,
    isArrayLike,
    assert
} from 'zrender/src/core/util';
import {getDataItemValue} from '../../util/model';
import Source from '../Source';

var inner = makeInner();

// Avoid typo.
export var SOURCE_FORMAT_ORIGINAL = 'original';
export var SOURCE_FORMAT_ARRAY_ROWS = 'arrayRows';
export var SOURCE_FORMAT_OBJECT_ROWS = 'objectRows';
export var SOURCE_FORMAT_KEYED_COLUMNS = 'keyedColumns';
export var SOURCE_FORMAT_UNKNOWN = 'unknown';
// ??? CHANGE A NAME
export var SOURCE_FORMAT_TYPED_ARRAY = 'typedArray';

export var SERIES_LAYOUT_BY_COLUMN = 'column';
export var SERIES_LAYOUT_BY_ROW = 'row';

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
            if (data.hasOwnProtytpe(key) && isArrayLike(data[key])) {
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
    var sourceFormat = SOURCE_FORMAT_ORIGINAL;
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

    // Note: dataset option does not have `encode`.
    var encodeDefine = seriesOption.encode;
    if (!encodeDefine && datasetModel) {
        encodeDefine = makeDefaultEncode(
            seriesModel, datasetModel, data, sourceFormat, seriesLayoutBy, completeResult
        );
    }

    inner(seriesModel).source = new Source({
        data: data,
        fromDataset: fromDataset,
        seriesLayoutBy: seriesLayoutBy,
        sourceFormat: sourceFormat,
        dimensionsDefine: completeResult.dimensionsDefine,
        startIndex: completeResult.startIndex,
        dimensionsDetectCount: completeResult.dimensionsDetectCount,
        encodeDefine: encodeDefine,
    });
}

// return {startIndex, dimensionsDefine, dimensionsCount}
function completeBySourceData(data, sourceFormat, seriesLayoutBy, sourceHeader, dimensionsDefine) {
    if (!data) {
        return {dimensionsDefine: dimensionsDefine};
    }

    var dimensionsDetectCount;
    var startIndex;
    var findPotentialName;

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
                dimensionsDefine[index] = val + '';
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
            findPotentialName = true;
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        if (!dimensionsDefine) {
            dimensionsDefine = [];
            findPotentialName = true;
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

    var potentialNameDimIndex;
    if (findPotentialName) {
        each(dimensionsDefine, function (dim, idx) {
            if ((isObject(dim) ? dim.name : dim) === 'name') {
                potentialNameDimIndex = idx;
            }
        });
    }

    return {
        startIndex: startIndex,
        dimensionsDefine: dimensionsDefine,
        dimensionsDetectCount: dimensionsDetectCount,
        potentialNameDimIndex: potentialNameDimIndex
        // TODO: potentialIdDimIdx
    };
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

// ??? TODO merge to completedimensions, where also has
// default encode making logic.
function makeDefaultEncode(
    seriesModel, datasetModel, data, sourceFormat, seriesLayoutBy, completeResult
) {
    var coordSysDefine = getCoordSysDefineBySeries(seriesModel);
    var encode = {tooltip: [], itemName: [], label: [], seriesName: []};
    var seriesType = seriesModel.subType;

    // Usually in this case series will use the first data
    // dimension as the "value" dimension, or other default
    // processes respectively.
    if (coordSysDefine) {
        var ecModel = seriesModel.ecModel;
        var datasetMap = inner(ecModel).datasetMap;
        var key = datasetModel.uid + '_' + seriesLayoutBy;
        var datasetRecord = datasetMap.get(key)
            || datasetMap.set(key, {categoryWayDim: 1, valueWayDim: 0});

        // ??? TODO refactor: provide by series itself.
        each(coordSysDefine.coordSysDims, function (coordDim) {
            // In value way.
            if (coordSysDefine.firstCategoryDimIndex == null) {
                var dataDim = datasetRecord.valueWayDim++;
                encode[coordDim] = dataDim;
                encode.tooltip.push(dataDim);
                encode.itemName.push(dataDim);
                encode.label.push(dataDim);
            }
            // In category way, category axis.
            else if (coordSysDefine.categoryAxisMap.get(coordDim)) {
                encode[coordDim] = 0;
            }
            // In category way, non-category axis.
            else {
                var dataDim = datasetRecord.categoryWayDim++;
                encode[coordDim] = dataDim;
                encode.tooltip.push(dataDim);
                encode.itemName.push(dataDim);
                encode.label.push(dataDim);
                encode.seriesName.push(dataDim);
            }
        });
    }
    // ??? TODO refactor: provide by series itself.
    // [{name: ..., value: ...}, ...] like:
    else if (seriesType === 'pie' || seriesType === 'map' || seriesType === 'funnel') {
        // Find the first not ordinal. (5 is an experience value)
        var firstNotOrdinal;
        for (var i = 0; i < 5 && firstNotOrdinal == null; i++) {
            if (!doGuessOrdinal(
                data, sourceFormat, seriesLayoutBy,
                completeResult.dimensionsDefine, completeResult.startIndex, i
            )) {
                firstNotOrdinal = i;
            }
        }
        if (firstNotOrdinal != null) {
            encode.value = encode.tooltip = firstNotOrdinal;
            encode.itemName = completeResult.potentialNameDimIndex
                || Math.max(firstNotOrdinal - 1, 0);
            // By default, label use itemName in charts.
            // So we dont set encode.label here.
            encode.seriesName = encode.itemName;
        }
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
 * @return {boolean} Whether ordinal.
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
function doGuessOrdinal(
    data, sourceFormat, seriesLayoutBy, dimensionsDefine, startIndex, dimIndex
) {
    var result;
    // Experience value.
    var maxLoop = 5;

    if (isTypedArray(data)) {
        return false;
    }

    // When sourceType is 'objectRows' or 'keyedColumns', dimensionsDefine
    // always exists in source.
    var dimName;
    if (dimensionsDefine) {
        if (dimIndex >= dimensionsDefine.length) {
            return;
        }
        dimName = dimensionsDefine[dimIndex];
        isObject(dimName) && (dimName = dimName.name);
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
        if (__DEV__) {
            assert(dimName != null);
        }
        for (var i = 0; i < data.length && i < maxLoop; i++) {
            var item = data[i];
            if (item && (result = detectValue(item[dimName])) != null) {
                return result;
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        if (__DEV__) {
            assert(dimName != null);
        }
        var sample = data[dimName];
        if (!sample || isTypedArray(sample)) {
            return false;
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
                return false;
            }
            if ((result = detectValue(val[dimIndex])) != null) {
                return result;
            }
        }
    }

    function detectValue(val) {
        // Consider usage convenience, '1', '2' will be treated as "number".
        // `isFinit('')` get `true`.
        if (val != null && isFinite(val) && val !== '') {
            return false;
        }
        else if (isString(val) && val !== '-') {
            return true;
        }
    }

    return false;
}
