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


import {makeInner, getDataItemValue, queryReferringComponents, SINGLE_REFERRING} from '../../util/model';
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
    assert,
    hasOwn,
    HashMap,
    isNumber,
    clone
} from 'zrender/src/core/util';
import Source from '../Source';

import {
    SOURCE_FORMAT_ORIGINAL,
    SOURCE_FORMAT_ARRAY_ROWS,
    SOURCE_FORMAT_OBJECT_ROWS,
    SERIES_LAYOUT_BY_ROW,
    SOURCE_FORMAT_KEYED_COLUMNS,
    SOURCE_FORMAT_TYPED_ARRAY,
    SOURCE_FORMAT_UNKNOWN,
    SourceFormat,
    Dictionary,
    OptionSourceData,
    SeriesLayoutBy,
    OptionSourceHeader,
    DimensionName,
    DimensionDefinition,
    DimensionDefinitionLoose,
    OptionSourceDataArrayRows,
    OptionDataValue,
    OptionSourceDataKeyedColumns,
    OptionSourceDataOriginal,
    OptionSourceDataObjectRows,
    OptionEncode,
    DimensionIndex,
    SeriesEncodableModel,
    OptionEncodeValue
} from '../../util/types';
import { DatasetModel, DatasetOption } from '../../component/dataset';
import SeriesModel from '../../model/Series';
import GlobalModel from '../../model/Global';
import { CoordDimensionDefinition } from './createDimensions';

// The result of `guessOrdinal`.
export const BE_ORDINAL = {
    Must: 1, // Encounter string but not '-' and not number-like.
    Might: 2, // Encounter string but number-like.
    Not: 3 // Other cases
};
type BeOrdinalValue = (typeof BE_ORDINAL)[keyof typeof BE_ORDINAL];

const innerGlobalModel = makeInner<{
    datasetMap: HashMap<DatasetRecord, string>
}, GlobalModel>();


interface DatasetRecord {
    categoryWayDim: number;
    valueWayDim: number;
}

type SeriesEncodeInternal = {
    [key in keyof OptionEncode]: DimensionIndex[];
};

export interface SourceMetaRawOption {
    seriesLayoutBy: SeriesLayoutBy;
    sourceHeader: OptionSourceHeader;
    dimensions: DimensionDefinitionLoose[];
}

export function detectSourceFormat(data: DatasetOption['source']): SourceFormat {
    let sourceFormat: SourceFormat = SOURCE_FORMAT_UNKNOWN;

    if (isTypedArray(data)) {
        sourceFormat = SOURCE_FORMAT_TYPED_ARRAY;
    }
    else if (isArray(data)) {
        // FIXME Whether tolerate null in top level array?
        if (data.length === 0) {
            sourceFormat = SOURCE_FORMAT_ARRAY_ROWS;
        }

        for (let i = 0, len = data.length; i < len; i++) {
            const item = data[i];

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
        for (const key in data) {
            if (hasOwn(data, key) && isArrayLike((data as Dictionary<unknown>)[key])) {
                sourceFormat = SOURCE_FORMAT_KEYED_COLUMNS;
                break;
            }
        }
    }
    else if (data != null) {
        throw new Error('Invalid data');
    }

    return sourceFormat;
}

/**
 * MUST be called before mergeOption of all series.
 */
export function resetSourceDefaulter(ecModel: GlobalModel): void {
    // `datasetMap` is used to make default encode.
    innerGlobalModel(ecModel).datasetMap = createHashMap();
}

export function createSource(
    sourceData: OptionSourceData,
    thisMetaRawOption: SourceMetaRawOption,
    // can be null. If not provided, auto detect it from `sourceData`.
    sourceFormat: SourceFormat,
    encodeDefine: OptionEncode  // can be null
): Source {
    sourceFormat = sourceFormat || detectSourceFormat(sourceData);
    const dimInfo = determineSourceDimensions(
        sourceData,
        sourceFormat,
        thisMetaRawOption.seriesLayoutBy,
        thisMetaRawOption.sourceHeader,
        thisMetaRawOption.dimensions
    );
    const source = new Source({
        data: sourceData,
        sourceFormat: sourceFormat,

        seriesLayoutBy: thisMetaRawOption.seriesLayoutBy,
        dimensionsDefine: dimInfo.dimensionsDefine,
        startIndex: dimInfo.startIndex,
        dimensionsDetectCount: dimInfo.dimensionsDetectCount,
        encodeDefine: makeEncodeDefine(encodeDefine)
    });

    return source;
}

/**
 * Clone except source data.
 */
export function cloneSourceShallow(source: Source) {
    return new Source({
        data: source.data,
        sourceFormat: source.sourceFormat,

        seriesLayoutBy: source.seriesLayoutBy,
        dimensionsDefine: clone(source.dimensionsDefine),
        startIndex: source.startIndex,
        dimensionsDetectCount: source.dimensionsDetectCount,
        encodeDefine: makeEncodeDefine(source.encodeDefine)
    });
}

function makeEncodeDefine(
    encodeDefine: OptionEncode | HashMap<OptionEncodeValue, DimensionName>
): HashMap<OptionEncodeValue, DimensionName> {
    // null means user not specify `series.encode`.
    return encodeDefine
        ? createHashMap<OptionEncodeValue, DimensionName>(encodeDefine)
        : null;
}


// return {startIndex, dimensionsDefine, dimensionsCount}
export function determineSourceDimensions(
    data: OptionSourceData,
    sourceFormat: SourceFormat,
    seriesLayoutBy: SeriesLayoutBy,
    sourceHeader: OptionSourceHeader,
    dimensionsDefine: DimensionDefinitionLoose[]
): {
    dimensionsDefine: DimensionDefinition[];
    startIndex: number;
    dimensionsDetectCount: number;
} {
    let dimensionsDetectCount;
    let startIndex: number;

    if (!data) {
        return {
            dimensionsDefine: normalizeDimensionsOption(dimensionsDefine),
            startIndex,
            dimensionsDetectCount
        };
    }

    if (sourceFormat === SOURCE_FORMAT_ARRAY_ROWS) {
        const dataArrayRows = data as OptionSourceDataArrayRows;
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
            }, seriesLayoutBy, dataArrayRows, 10);
        }
        else {
            startIndex = isNumber(sourceHeader) ? sourceHeader : sourceHeader ? 1 : 0;
        }

        if (!dimensionsDefine && startIndex === 1) {
            dimensionsDefine = [];
            arrayRowsTravelFirst(function (val, index) {
                dimensionsDefine[index] = (val != null ? val + '' : '') as DimensionName;
            }, seriesLayoutBy, dataArrayRows, Infinity);
        }

        dimensionsDetectCount = dimensionsDefine
            ? dimensionsDefine.length
            : seriesLayoutBy === SERIES_LAYOUT_BY_ROW
            ? dataArrayRows.length
            : dataArrayRows[0]
            ? dataArrayRows[0].length
            : null;
    }
    else if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS) {
        if (!dimensionsDefine) {
            dimensionsDefine = objectRowsCollectDimensions(data as OptionSourceDataObjectRows);
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        if (!dimensionsDefine) {
            dimensionsDefine = [];
            each(data as OptionSourceDataKeyedColumns, function (colArr, key) {
                dimensionsDefine.push(key);
            });
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        const value0 = getDataItemValue((data as OptionSourceDataOriginal)[0]);
        dimensionsDetectCount = isArray(value0) && value0.length || 1;
    }
    else if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
        if (__DEV__) {
            assert(!!dimensionsDefine, 'dimensions must be given if data is TypedArray.');
        }
    }

    return {
        startIndex: startIndex,
        dimensionsDefine: normalizeDimensionsOption(dimensionsDefine),
        dimensionsDetectCount: dimensionsDetectCount
    };
}

// Consider dimensions defined like ['A', 'price', 'B', 'price', 'C', 'price'],
// which is reasonable. But dimension name is duplicated.
// Returns undefined or an array contains only object without null/undefiend or string.
function normalizeDimensionsOption(dimensionsDefine: DimensionDefinitionLoose[]): DimensionDefinition[] {
    if (!dimensionsDefine) {
        // The meaning of null/undefined is different from empty array.
        return;
    }
    const nameMap = createHashMap<{ count: number }, string>();
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

        const exist = nameMap.get(item.name);
        if (!exist) {
            nameMap.set(item.name, {count: 1});
        }
        else {
            item.name += '-' + exist.count++;
        }

        return item;
    });
}

function arrayRowsTravelFirst(
    cb: (val: OptionDataValue, idx: number) => void,
    seriesLayoutBy: SeriesLayoutBy,
    data: OptionSourceDataArrayRows,
    maxLoop: number
): void {
    if (seriesLayoutBy === SERIES_LAYOUT_BY_ROW) {
        for (let i = 0; i < data.length && i < maxLoop; i++) {
            cb(data[i] ? data[i][0] : null, i);
        }
    }
    else {
        const value0 = data[0] || [];
        for (let i = 0; i < value0.length && i < maxLoop; i++) {
            cb(value0[i], i);
        }
    }
}

function objectRowsCollectDimensions(data: OptionSourceDataObjectRows): DimensionDefinitionLoose[] {
    let firstIndex = 0;
    let obj;
    while (firstIndex < data.length && !(obj = data[firstIndex++])) {} // jshint ignore: line
    if (obj) {
        const dimensions: DimensionDefinitionLoose[] = [];
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
 * @return encode Never be `null/undefined`.
 */
export function makeSeriesEncodeForAxisCoordSys(
    coordDimensions: (DimensionName | CoordDimensionDefinition)[],
    seriesModel: SeriesModel,
    source: Source
): SeriesEncodeInternal {
    const encode: SeriesEncodeInternal = {};

    const datasetModel = querySeriesUpstreamDatasetModel(seriesModel);
    // Currently only make default when using dataset, util more reqirements occur.
    if (!datasetModel || !coordDimensions) {
        return encode;
    }

    const encodeItemName: DimensionIndex[] = [];
    const encodeSeriesName: DimensionIndex[] = [];

    const ecModel = seriesModel.ecModel;
    const datasetMap = innerGlobalModel(ecModel).datasetMap;
    const key = datasetModel.uid + '_' + source.seriesLayoutBy;

    let baseCategoryDimIndex: number;
    let categoryWayValueDimStart;
    coordDimensions = coordDimensions.slice();
    each(coordDimensions, function (coordDimInfoLoose, coordDimIdx) {
        const coordDimInfo: CoordDimensionDefinition = isObject(coordDimInfoLoose)
            ? coordDimInfoLoose
            : (coordDimensions[coordDimIdx] = { name: coordDimInfoLoose as DimensionName });
        if (coordDimInfo.type === 'ordinal' && baseCategoryDimIndex == null) {
            baseCategoryDimIndex = coordDimIdx;
            categoryWayValueDimStart = getDataDimCountOnCoordDim(coordDimInfo);
        }
        encode[coordDimInfo.name] = [];
    });

    const datasetRecord = datasetMap.get(key)
        || datasetMap.set(key, {categoryWayDim: categoryWayValueDimStart, valueWayDim: 0});

    // TODO
    // Auto detect first time axis and do arrangement.
    each(coordDimensions, function (coordDimInfo: CoordDimensionDefinition, coordDimIdx) {
        const coordDimName = coordDimInfo.name;
        const count = getDataDimCountOnCoordDim(coordDimInfo);

        // In value way.
        if (baseCategoryDimIndex == null) {
            const start = datasetRecord.valueWayDim;
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
            const start = datasetRecord.categoryWayDim;
            pushDim(encode[coordDimName], start, count);
            pushDim(encodeSeriesName, start, count);
            datasetRecord.categoryWayDim += count;
        }
    });

    function pushDim(dimIdxArr: DimensionIndex[], idxFrom: number, idxCount: number) {
        for (let i = 0; i < idxCount; i++) {
            dimIdxArr.push(idxFrom + i);
        }
    }

    function getDataDimCountOnCoordDim(coordDimInfo: CoordDimensionDefinition) {
        const dimsDef = coordDimInfo.dimsDef;
        return dimsDef ? dimsDef.length : 1;
    }

    encodeItemName.length && (encode.itemName = encodeItemName);
    encodeSeriesName.length && (encode.seriesName = encodeSeriesName);

    return encode;
}

/**
 * Work for data like [{name: ..., value: ...}, ...].
 *
 * @return encode Never be `null/undefined`.
 */
export function makeSeriesEncodeForNameBased(
    seriesModel: SeriesModel,
    source: Source,
    dimCount: number
): SeriesEncodeInternal {
    const encode: SeriesEncodeInternal = {};

    const datasetModel = querySeriesUpstreamDatasetModel(seriesModel);
    // Currently only make default when using dataset, util more reqirements occur.
    if (!datasetModel) {
        return encode;
    }

    const sourceFormat = source.sourceFormat;
    const dimensionsDefine = source.dimensionsDefine;

    let potentialNameDimIndex;
    if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS || sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        each(dimensionsDefine, function (dim, idx) {
            if ((isObject(dim) ? dim.name : dim) === 'name') {
                potentialNameDimIndex = idx;
            }
        });
    }

    type IdxResult = { v: number, n: number };

    const idxResult = (function () {

        const idxRes0 = {} as IdxResult;
        const idxRes1 = {} as IdxResult;
        const guessRecords = [];

        // 5 is an experience value.
        for (let i = 0, len = Math.min(5, dimCount); i < len; i++) {
            const guessResult = doGuessOrdinal(
                source.data, sourceFormat, source.seriesLayoutBy,
                dimensionsDefine, source.startIndex, i
            );
            guessRecords.push(guessResult);
            const isPureNumber = guessResult === BE_ORDINAL.Not;

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

        function fulfilled(idxResult: IdxResult) {
            return idxResult.v != null && idxResult.n != null;
        }

        return fulfilled(idxRes0) ? idxRes0 : fulfilled(idxRes1) ? idxRes1 : null;
    })();

    if (idxResult) {
        encode.value = [idxResult.v];
        // `potentialNameDimIndex` has highest priority.
        const nameDimIndex = potentialNameDimIndex != null ? potentialNameDimIndex : idxResult.n;
        // By default, label use itemName in charts.
        // So we dont set encodeLabel here.
        encode.itemName = [nameDimIndex];
        encode.seriesName = [nameDimIndex];
    }

    return encode;
}

/**
 * @return If return null/undefined, indicate that should not use datasetModel.
 */
export function querySeriesUpstreamDatasetModel(
    seriesModel: SeriesEncodableModel
): DatasetModel {
    // Caution: consider the scenario:
    // A dataset is declared and a series is not expected to use the dataset,
    // and at the beginning `setOption({series: { noData })` (just prepare other
    // option but no data), then `setOption({series: {data: [...]}); In this case,
    // the user should set an empty array to avoid that dataset is used by default.
    const thisData = seriesModel.get('data', true);
    if (!thisData) {
        return queryReferringComponents(
            seriesModel.ecModel,
            'dataset',
            {
                index: seriesModel.get('datasetIndex', true),
                id: seriesModel.get('datasetId', true)
            },
            SINGLE_REFERRING
        ).models[0] as DatasetModel;
    }
}

/**
 * @return Always return an array event empty.
 */
export function queryDatasetUpstreamDatasetModels(
    datasetModel: DatasetModel
): DatasetModel[] {
    // Only these attributes declared, we by defualt reference to `datasetIndex: 0`.
    // Otherwise, no reference.
    if (!datasetModel.get('transform', true)
        && !datasetModel.get('fromTransformResult', true)
    ) {
        return [];
    }

    return queryReferringComponents(
        datasetModel.ecModel,
        'dataset',
        {
            index: datasetModel.get('fromDatasetIndex', true),
            id: datasetModel.get('fromDatasetId', true)
        },
        SINGLE_REFERRING
    ).models as DatasetModel[];
}

/**
 * The rule should not be complex, otherwise user might not
 * be able to known where the data is wrong.
 * The code is ugly, but how to make it neat?
 */
export function guessOrdinal(source: Source, dimIndex: DimensionIndex): BeOrdinalValue {
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
    data: Source['data'],
    sourceFormat: Source['sourceFormat'],
    seriesLayoutBy: Source['seriesLayoutBy'],
    dimensionsDefine: Source['dimensionsDefine'],
    startIndex: Source['startIndex'],
    dimIndex: DimensionIndex
): BeOrdinalValue {
    let result;
    // Experience value.
    const maxLoop = 5;

    if (isTypedArray(data)) {
        return BE_ORDINAL.Not;
    }

    // When sourceType is 'objectRows' or 'keyedColumns', dimensionsDefine
    // always exists in source.
    let dimName;
    let dimType;
    if (dimensionsDefine) {
        const dimDefItem = dimensionsDefine[dimIndex];
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
        const dataArrayRows = data as OptionSourceDataArrayRows;
        if (seriesLayoutBy === SERIES_LAYOUT_BY_ROW) {
            const sample = dataArrayRows[dimIndex];
            for (let i = 0; i < (sample || []).length && i < maxLoop; i++) {
                if ((result = detectValue(sample[startIndex + i])) != null) {
                    return result;
                }
            }
        }
        else {
            for (let i = 0; i < dataArrayRows.length && i < maxLoop; i++) {
                const row = dataArrayRows[startIndex + i];
                if (row && (result = detectValue(row[dimIndex])) != null) {
                    return result;
                }
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS) {
        const dataObjectRows = data as OptionSourceDataObjectRows;
        if (!dimName) {
            return BE_ORDINAL.Not;
        }
        for (let i = 0; i < dataObjectRows.length && i < maxLoop; i++) {
            const item = dataObjectRows[i];
            if (item && (result = detectValue(item[dimName])) != null) {
                return result;
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS) {
        const dataKeyedColumns = data as OptionSourceDataKeyedColumns;
        if (!dimName) {
            return BE_ORDINAL.Not;
        }
        const sample = dataKeyedColumns[dimName];
        if (!sample || isTypedArray(sample)) {
            return BE_ORDINAL.Not;
        }
        for (let i = 0; i < sample.length && i < maxLoop; i++) {
            if ((result = detectValue(sample[i])) != null) {
                return result;
            }
        }
    }
    else if (sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        const dataOriginal = data as OptionSourceDataOriginal;
        for (let i = 0; i < dataOriginal.length && i < maxLoop; i++) {
            const item = dataOriginal[i];
            const val = getDataItemValue(item);
            if (!isArray(val)) {
                return BE_ORDINAL.Not;
            }
            if ((result = detectValue(val[dimIndex])) != null) {
                return result;
            }
        }
    }

    function detectValue(val: OptionDataValue): BeOrdinalValue {
        const beStr = isString(val);
        // Consider usage convenience, '1', '2' will be treated as "number".
        // `isFinit('')` get `true`.
        if (val != null && isFinite(val as number) && val !== '') {
            return beStr ? BE_ORDINAL.Might : BE_ORDINAL.Not;
        }
        else if (beStr && val !== '-') {
            return BE_ORDINAL.Must;
        }
    }

    return BE_ORDINAL.Not;
}
