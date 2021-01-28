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

import {
    isTypedArray, HashMap, clone, createHashMap, isArray, isObject, isArrayLike,
    hasOwn, assert, each, map, isNumber, isString
} from 'zrender/src/core/util';
import {
    SourceFormat, SeriesLayoutBy, DimensionDefinition,
    OptionEncodeValue, OptionSourceData,
    SOURCE_FORMAT_ORIGINAL,
    SERIES_LAYOUT_BY_COLUMN,
    SOURCE_FORMAT_UNKNOWN,
    SOURCE_FORMAT_KEYED_COLUMNS,
    SOURCE_FORMAT_TYPED_ARRAY,
    DimensionName,
    OptionSourceHeader,
    DimensionDefinitionLoose,
    OptionEncode,
    SOURCE_FORMAT_ARRAY_ROWS,
    SOURCE_FORMAT_OBJECT_ROWS,
    Dictionary,
    OptionSourceDataObjectRows,
    OptionDataValue,
    OptionSourceDataArrayRows,
    SERIES_LAYOUT_BY_ROW,
    OptionSourceDataOriginal,
    OptionSourceDataKeyedColumns
} from '../util/types';
import { DatasetOption } from '../component/dataset/install';
import { getDataItemValue } from '../util/model';

/**
 * [sourceFormat]
 *
 * + "original":
 * This format is only used in series.data, where
 * itemStyle can be specified in data item.
 *
 * + "arrayRows":
 * [
 *     ['product', 'score', 'amount'],
 *     ['Matcha Latte', 89.3, 95.8],
 *     ['Milk Tea', 92.1, 89.4],
 *     ['Cheese Cocoa', 94.4, 91.2],
 *     ['Walnut Brownie', 85.4, 76.9]
 * ]
 *
 * + "objectRows":
 * [
 *     {product: 'Matcha Latte', score: 89.3, amount: 95.8},
 *     {product: 'Milk Tea', score: 92.1, amount: 89.4},
 *     {product: 'Cheese Cocoa', score: 94.4, amount: 91.2},
 *     {product: 'Walnut Brownie', score: 85.4, amount: 76.9}
 * ]
 *
 * + "keyedColumns":
 * {
 *     'product': ['Matcha Latte', 'Milk Tea', 'Cheese Cocoa', 'Walnut Brownie'],
 *     'count': [823, 235, 1042, 988],
 *     'score': [95.8, 81.4, 91.2, 76.9]
 * }
 *
 * + "typedArray"
 *
 * + "unknown"
 */

export interface SourceMetaRawOption {
    seriesLayoutBy: SeriesLayoutBy;
    sourceHeader: OptionSourceHeader;
    dimensions: DimensionDefinitionLoose[];
}

// Prevent from `new Source()` external and circular reference.
export interface Source extends SourceImpl {};
// @inner
class SourceImpl {

    /**
     * Not null/undefined.
     */
    readonly data: OptionSourceData;

    /**
     * See also "detectSourceFormat".
     * Not null/undefined.
     */
    readonly sourceFormat: SourceFormat;

    /**
     * 'row' or 'column'
     * Not null/undefined.
     */
    readonly seriesLayoutBy: SeriesLayoutBy;

    /**
     * dimensions definition from:
     * (1) standalone defined in option prop `dimensions: [...]`
     * (2) detected from option data. See `determineSourceDimensions`.
     * If can not be detected (e.g., there is only pure data `[[11, 33], ...]`
     * `dimensionsDefine` will be null/undefined.
     */
    readonly dimensionsDefine: DimensionDefinition[];

    /**
     * encode definition in option.
     * can be null/undefined.
     * Might be specified outside.
     */
    readonly encodeDefine: HashMap<OptionEncodeValue, DimensionName>;

    /**
     * Only make sense in `SOURCE_FORMAT_ARRAY_ROWS`.
     * That is the same as `sourceHeader: number`,
     * which means from which line the real data start.
     * Not null/undefined, uint.
     */
    readonly startIndex: number;

    /**
     * Dimension count detected from data. Only works when `dimensionDefine`
     * does not exists.
     * Can be null/undefined (when unknown), uint.
     */
    readonly dimensionsDetectedCount: number;

    /**
     * Raw props from user option.
     */
    readonly metaRawOption: SourceMetaRawOption;

    // readonly frozen: boolean;


    constructor(fields: {
        data: OptionSourceData,
        sourceFormat: SourceFormat, // default: SOURCE_FORMAT_UNKNOWN

        // Visit config are optional:
        seriesLayoutBy?: SeriesLayoutBy, // default: 'column'
        dimensionsDefine?: DimensionDefinition[],
        startIndex?: number, // default: 0
        dimensionsDetectedCount?: number,

        metaRawOption?: SourceMetaRawOption,

        // [Caveat]
        // This is the raw user defined `encode` in `series`.
        // If user not defined, DO NOT make a empty object or hashMap here.
        // An empty object or hashMap will prevent from auto generating encode.
        encodeDefine?: HashMap<OptionEncodeValue, DimensionName>
    }) {

        this.data = fields.data || (
            fields.sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS ? {} : []
        );
        this.sourceFormat = fields.sourceFormat || SOURCE_FORMAT_UNKNOWN;

        // Visit config
        this.seriesLayoutBy = fields.seriesLayoutBy || SERIES_LAYOUT_BY_COLUMN;
        this.startIndex = fields.startIndex || 0;
        this.dimensionsDefine = fields.dimensionsDefine;
        this.dimensionsDetectedCount = fields.dimensionsDetectedCount;
        this.encodeDefine = fields.encodeDefine;
        this.metaRawOption = fields.metaRawOption;
    }

    // There is performance issue in some browser like Safari,
    // an also slower than clone in Chrome.
    // So DO NOT use `Object.freeze`.
    /**
     * When expose the source to thrid-party transform, it probably better to
     * freeze to make sure immutability.
     * If a third-party transform modify the raw upstream data structure, it might bring about
     * "uncertain effect" when using multiple transforms with different combinations.
     *
     * [Caveat]
     * `OptionManager.ts` have perform `clone` in `setOption`.
     * The original user input object should better not be frozen in case they
     * make other usages.
     */
    // freeze() {
    //     assert(sourceFormatCanBeExposed(this));
    //     const data = this.data as OptionSourceDataArrayRows;
    //     if (this.frozen || !data || !isFunction(Object.freeze)) {
    //         return;
    //     }
    //     // @ts-ignore
    //     this.frozen = true;
    //     // PENDING:
    //     // There is a flaw that there might be non-primitive values like `Date`.
    //     // Is it worth handling that?
    //     for (let i = 0; i < data.length; i++) {
    //         Object.freeze(data[i]);
    //     }
    //     Object.freeze(data);
    // }

}

export function isSourceInstance(val: unknown): val is Source {
    return val instanceof SourceImpl;
}

export function createSource(
    sourceData: OptionSourceData,
    thisMetaRawOption: SourceMetaRawOption,
    // can be null. If not provided, auto detect it from `sourceData`.
    sourceFormat: SourceFormat,
    encodeDefine: OptionEncode  // can be null
): Source {
    sourceFormat = sourceFormat || detectSourceFormat(sourceData);
    const seriesLayoutBy = thisMetaRawOption.seriesLayoutBy;
    const determined = determineSourceDimensions(
        sourceData,
        sourceFormat,
        seriesLayoutBy,
        thisMetaRawOption.sourceHeader,
        thisMetaRawOption.dimensions
    );
    const source = new SourceImpl({
        data: sourceData,
        sourceFormat: sourceFormat,

        seriesLayoutBy: seriesLayoutBy,
        dimensionsDefine: determined.dimensionsDefine,
        startIndex: determined.startIndex,
        dimensionsDetectedCount: determined.dimensionsDetectedCount,
        encodeDefine: makeEncodeDefine(encodeDefine),
        metaRawOption: clone(thisMetaRawOption)
    });

    return source;
}

/**
 * Wrap original series data for some compatibility cases.
 */
export function createSourceFromSeriesDataOption(data: OptionSourceData): Source {
    return new SourceImpl({
        data: data,
        sourceFormat: isTypedArray(data)
            ? SOURCE_FORMAT_TYPED_ARRAY
            : SOURCE_FORMAT_ORIGINAL
    });
}

/**
 * Clone source but excludes source data.
 */
export function cloneSourceShallow(source: Source): Source {
    return new SourceImpl({
        data: source.data,
        sourceFormat: source.sourceFormat,

        seriesLayoutBy: source.seriesLayoutBy,
        dimensionsDefine: clone(source.dimensionsDefine),
        startIndex: source.startIndex,
        dimensionsDetectedCount: source.dimensionsDetectedCount,
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

/**
 * Note: An empty array will be detected as `SOURCE_FORMAT_ARRAY_ROWS`.
 */
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

    return sourceFormat;
}

/**
 * Determine the source definitions from data standalone dimensions definitions
 * are not specified.
 */
function determineSourceDimensions(
    data: OptionSourceData,
    sourceFormat: SourceFormat,
    seriesLayoutBy: SeriesLayoutBy,
    sourceHeader: OptionSourceHeader,
    // standalone raw dimensions definition, like:
    // {
    //     dimensions: ['aa', 'bb', { name: 'cc', type: 'time' }]
    // }
    // in `dataset` or `series`
    dimensionsDefine: DimensionDefinitionLoose[]
): {
    // If the input `dimensionsDefine` is specified, return it.
    // Else determine dimensions from the input `data`.
    // If not determined, `dimensionsDefine` will be null/undefined.
    dimensionsDefine: Source['dimensionsDefine'];
    startIndex: Source['startIndex'];
    dimensionsDetectedCount: Source['dimensionsDetectedCount'];
} {
    let dimensionsDetectedCount;
    let startIndex: number;

    // PEDING: could data be null/undefined here?
    // currently, if `dataset.source` not specified, error thrown.
    // if `series.data` not specified, nothing rendered without error thrown.
    // Should test these cases.
    if (!data) {
        return {
            dimensionsDefine: normalizeDimensionsOption(dimensionsDefine),
            startIndex,
            dimensionsDetectedCount
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

        dimensionsDetectedCount = dimensionsDefine
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
        dimensionsDetectedCount = isArray(value0) && value0.length || 1;
    }
    else if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
        if (__DEV__) {
            assert(!!dimensionsDefine, 'dimensions must be given if data is TypedArray.');
        }
    }

    return {
        startIndex: startIndex,
        dimensionsDefine: normalizeDimensionsOption(dimensionsDefine),
        dimensionsDetectedCount: dimensionsDetectedCount
    };
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

// Consider dimensions defined like ['A', 'price', 'B', 'price', 'C', 'price'],
// which is reasonable. But dimension name is duplicated.
// Returns undefined or an array contains only object without null/undefiend or string.
function normalizeDimensionsOption(dimensionsDefine: DimensionDefinitionLoose[]): DimensionDefinition[] {
    if (!dimensionsDefine) {
        // The meaning of null/undefined is different from empty array.
        return;
    }
    const nameMap = createHashMap<{ count: number }, string>();
    return map(dimensionsDefine, function (rawItem, index) {
        rawItem = isObject(rawItem) ? rawItem : { name: rawItem };
        // Other fields will be discarded.
        const item: DimensionDefinition = {
            name: rawItem.name,
            displayName: rawItem.displayName,
            type: rawItem.type
        };

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
