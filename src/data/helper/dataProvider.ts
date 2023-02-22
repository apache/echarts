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

// TODO
// ??? refactor? check the outer usage of data provider.
// merge with defaultDimValueGetter?

import {isTypedArray, extend, assert, each, isObject, bind} from 'zrender/src/core/util';
import {getDataItemValue} from '../../util/model';
import { createSourceFromSeriesDataOption, Source, isSourceInstance } from '../Source';
import {ArrayLike, Dictionary} from 'zrender/src/core/types';
import {
    SOURCE_FORMAT_ORIGINAL,
    SOURCE_FORMAT_OBJECT_ROWS,
    SOURCE_FORMAT_KEYED_COLUMNS,
    SOURCE_FORMAT_TYPED_ARRAY,
    SOURCE_FORMAT_ARRAY_ROWS,
    SERIES_LAYOUT_BY_COLUMN,
    SERIES_LAYOUT_BY_ROW,
    DimensionName, DimensionIndex, OptionSourceData,
    OptionDataItem, OptionDataValue, SourceFormat, SeriesLayoutBy, ParsedValue, DimensionLoose, NullUndefined
} from '../../util/types';
import SeriesData from '../SeriesData';

export interface DataProvider {
    /**
     * true: all of the value are in primitive type (in type `OptionDataValue`).
     * false: Not sure whether any of them is non primitive type (in type `OptionDataItemObject`).
     *     Like `data: [ { value: xx, itemStyle: {...} }, ...]`
     *     At present it only happen in `SOURCE_FORMAT_ORIGINAL`.
     */
    pure?: boolean;
    /**
     * If data is persistent and will not be released after use.
     */
    persistent?: boolean;

    getSource(): Source;
    count(): number;
    getItem(idx: number, out?: OptionDataItem): OptionDataItem;
    fillStorage?(
        start: number,
        end: number,
        out: ArrayLike<ParsedValue>[],
        extent: number[][]
    ): void
    appendData?(newData: ArrayLike<OptionDataItem>): void;
    clean?(): void;
}


let providerMethods: Dictionary<any>;
let mountMethods: (provider: DefaultDataProvider, data: OptionSourceData, source: Source) => void;

export interface DefaultDataProvider {
    fillStorage?(
        start: number,
        end: number,
        out: ArrayLike<ParsedValue>[],
        extent: number[][]
    ): void
}
/**
 * If normal array used, mutable chunk size is supported.
 * If typed array used, chunk size must be fixed.
 */
export class DefaultDataProvider implements DataProvider {

    private _source: Source;

    private _data: OptionSourceData;

    private _offset: number;

    private _dimSize: number;

    pure: boolean;

    persistent: boolean;

    static protoInitialize = (function () {
        // PENDING: To avoid potential incompat (e.g., prototype
        // is visited somewhere), still init them on prototype.
        const proto = DefaultDataProvider.prototype;
        proto.pure = false;
        proto.persistent = true;
    })();


    constructor(sourceParam: Source | OptionSourceData, dimSize?: number) {
        // let source: Source;
        const source: Source = !isSourceInstance(sourceParam)
            ? createSourceFromSeriesDataOption(sourceParam as OptionSourceData)
            : sourceParam as Source;

        // declare source is Source;
        this._source = source;
        const data = this._data = source.data;

        // Typed array. TODO IE10+?
        if (source.sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
            if (__DEV__) {
                if (dimSize == null) {
                    throw new Error('Typed array data must specify dimension size');
                }
            }
            this._offset = 0;
            this._dimSize = dimSize;
            this._data = data;
        }

        mountMethods(this, data, source);
    }

    getSource(): Source {
        return this._source;
    }

    count(): number {
        return 0;
    }

    getItem(idx: number, out?: ArrayLike<OptionDataValue>): OptionDataItem {
        return;
    }

    appendData(newData: OptionSourceData): void {
    }

    clean(): void {
    }

    private static internalField = (function () {

        mountMethods = function (provider, data, source) {
            const sourceFormat = source.sourceFormat;
            const seriesLayoutBy = source.seriesLayoutBy;
            const startIndex = source.startIndex;
            const dimsDef = source.dimensionsDefine;

            const methods = providerMethods[getMethodMapKey(sourceFormat, seriesLayoutBy)];
            if (__DEV__) {
                assert(methods, 'Invalide sourceFormat: ' + sourceFormat);
            }

            extend(provider, methods);

            if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
                provider.getItem = getItemForTypedArray;
                provider.count = countForTypedArray;
                provider.fillStorage = fillStorageForTypedArray;
            }
            else {
                const rawItemGetter = getRawSourceItemGetter(sourceFormat, seriesLayoutBy);
                provider.getItem = bind(rawItemGetter, null, data, startIndex, dimsDef);
                const rawCounter = getRawSourceDataCounter(sourceFormat, seriesLayoutBy);
                provider.count = bind(rawCounter, null, data, startIndex, dimsDef);
            }
        };

        const getItemForTypedArray: DefaultDataProvider['getItem'] = function (
            this: DefaultDataProvider, idx: number, out: ArrayLike<number>
        ): ArrayLike<number> {
            idx = idx - this._offset;
            out = out || [];
            const data = this._data;
            const dimSize = this._dimSize;
            const offset = dimSize * idx;
            for (let i = 0; i < dimSize; i++) {
                out[i] = (data as ArrayLike<number>)[offset + i];
            }
            return out;
        };

        const fillStorageForTypedArray: DefaultDataProvider['fillStorage'] = function (
            this: DefaultDataProvider, start: number, end: number, storage: ArrayLike<ParsedValue>[], extent: number[][]
        ) {
            const data = this._data as ArrayLike<number>;
            const dimSize = this._dimSize;

            for (let dim = 0; dim < dimSize; dim++) {
                const dimExtent = extent[dim];
                let min = dimExtent[0] == null ? Infinity : dimExtent[0];
                let max = dimExtent[1] == null ? -Infinity : dimExtent[1];
                const count = end - start;
                const arr = storage[dim];
                for (let i = 0; i < count; i++) {
                    // appendData with TypedArray will always do replace in provider.
                    const val = data[i * dimSize + dim];
                    arr[start + i] = val;
                    val < min && (min = val);
                    val > max && (max = val);
                }
                dimExtent[0] = min;
                dimExtent[1] = max;
            }
        };

        const countForTypedArray: DefaultDataProvider['count'] = function (
            this: DefaultDataProvider
        ) {
            return this._data ? ((this._data as ArrayLike<number>).length / this._dimSize) : 0;
        };

        providerMethods = {

            [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_COLUMN]: {
                pure: true,
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_ROW]: {
                pure: true,
                appendData: function () {
                    throw new Error('Do not support appendData when set seriesLayoutBy: "row".');
                }
            },

            [SOURCE_FORMAT_OBJECT_ROWS]: {
                pure: true,
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_KEYED_COLUMNS]: {
                pure: true,
                appendData: function (this: DefaultDataProvider, newData: Dictionary<OptionDataValue[]>) {
                    const data = this._data as Dictionary<OptionDataValue[]>;
                    each(newData, function (newCol, key) {
                        const oldCol = data[key] || (data[key] = []);
                        for (let i = 0; i < (newCol || []).length; i++) {
                            oldCol.push(newCol[i]);
                        }
                    });
                }
            },

            [SOURCE_FORMAT_ORIGINAL]: {
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_TYPED_ARRAY]: {
                persistent: false,
                pure: true,
                appendData: function (this: DefaultDataProvider, newData: ArrayLike<number>): void {
                    if (__DEV__) {
                        assert(
                            isTypedArray(newData),
                            'Added data must be TypedArray if data in initialization is TypedArray'
                        );
                    }
                    this._data = newData;
                },

                // Clean self if data is already used.
                clean: function (this: DefaultDataProvider): void {
                    // PENDING
                    this._offset += this.count();
                    this._data = null;
                }
            }
        };

        function appendDataSimply(this: DefaultDataProvider, newData: ArrayLike<OptionDataItem>): void {
            for (let i = 0; i < newData.length; i++) {
                (this._data as any[]).push(newData[i]);
            }
        }

    })();
}



type RawSourceItemGetter = (
    rawData: OptionSourceData,
    startIndex: number,
    dimsDef: { name?: DimensionName }[],
    idx: number,
    // Only used in SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_ROW and SOURCE_FORMAT_KEYED_COLUMNS
    // to avoid create a new [] if `out` is provided.
    out?: ArrayLike<OptionDataValue>
) => OptionDataItem | ArrayLike<OptionDataValue>;

const getItemSimply: RawSourceItemGetter = function (
    rawData, startIndex, dimsDef, idx
): OptionDataItem {
    return (rawData as [])[idx];
};

const rawSourceItemGetterMap: Dictionary<RawSourceItemGetter> = {
    [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_COLUMN]: function (
        rawData, startIndex, dimsDef, idx
    ) {
        return (rawData as OptionDataValue[][])[idx + startIndex];
    },
    [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_ROW]: function (
        rawData, startIndex, dimsDef, idx, out
    ) {
        idx += startIndex;
        const item = out || [];
        const data = rawData as OptionDataValue[][];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            item[i] = row ? row[idx] : null;
        }
        return item;
    },
    [SOURCE_FORMAT_OBJECT_ROWS]: getItemSimply,
    [SOURCE_FORMAT_KEYED_COLUMNS]: function (
        rawData, startIndex, dimsDef, idx, out
    ) {
        const item = out || [];
        for (let i = 0; i < dimsDef.length; i++) {
            const dimName = dimsDef[i].name;
            if (__DEV__) {
                if (dimName == null) {
                    throw new Error();
                }
            }
            const col = (rawData as Dictionary<OptionDataValue[]>)[dimName];
            item[i] = col ? col[idx] : null;
        }
        return item;
    },
    [SOURCE_FORMAT_ORIGINAL]: getItemSimply
};

export function getRawSourceItemGetter(
    sourceFormat: SourceFormat, seriesLayoutBy: SeriesLayoutBy
): RawSourceItemGetter {
    const method = rawSourceItemGetterMap[getMethodMapKey(sourceFormat, seriesLayoutBy)];
    if (__DEV__) {
        assert(method, 'Do not support get item on "' + sourceFormat + '", "' + seriesLayoutBy + '".');
    }
    return method;
}




type RawSourceDataCounter = (
    rawData: OptionSourceData,
    startIndex: number,
    dimsDef: { name?: DimensionName }[]
) => number;

const countSimply: RawSourceDataCounter = function (
    rawData, startIndex, dimsDef
) {
    return (rawData as []).length;
};

const rawSourceDataCounterMap: Dictionary<RawSourceDataCounter> = {
    [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_COLUMN]: function (
        rawData, startIndex, dimsDef
    ) {
        return Math.max(0, (rawData as OptionDataItem[][]).length - startIndex);
    },
    [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_ROW]: function (
        rawData, startIndex, dimsDef
    ) {
        const row = (rawData as OptionDataValue[][])[0];
        return row ? Math.max(0, row.length - startIndex) : 0;
    },
    [SOURCE_FORMAT_OBJECT_ROWS]: countSimply,
    [SOURCE_FORMAT_KEYED_COLUMNS]: function (
        rawData, startIndex, dimsDef
    ) {
        const dimName = dimsDef[0].name;
        if (__DEV__) {
            if (dimName == null) {
                throw new Error();
            }
        }
        const col = (rawData as Dictionary<OptionDataValue[]>)[dimName];
        return col ? col.length : 0;
    },
    [SOURCE_FORMAT_ORIGINAL]: countSimply
};

export function getRawSourceDataCounter(
    sourceFormat: SourceFormat, seriesLayoutBy: SeriesLayoutBy
): RawSourceDataCounter {
    const method = rawSourceDataCounterMap[getMethodMapKey(sourceFormat, seriesLayoutBy)];
    if (__DEV__) {
        assert(method, 'Do not support count on "' + sourceFormat + '", "' + seriesLayoutBy + '".');
    }
    return method;
}


type RawSourceValueGetter = (
    dataItem: OptionDataItem,
    dimIndex: DimensionIndex,
    property: DimensionName
) => OptionDataValue;

const getRawValueSimply = function (
    dataItem: ArrayLike<OptionDataValue>, dimIndex: number, property: string
): OptionDataValue {
    return dataItem[dimIndex];
};

const rawSourceValueGetterMap: Partial<Record<SourceFormat, RawSourceValueGetter>> = {

    [SOURCE_FORMAT_ARRAY_ROWS]: getRawValueSimply,

    [SOURCE_FORMAT_OBJECT_ROWS]: function (
        dataItem: Dictionary<OptionDataValue>, dimIndex: number, property: string
    ): OptionDataValue {
        return dataItem[property];
    },

    [SOURCE_FORMAT_KEYED_COLUMNS]: getRawValueSimply,

    [SOURCE_FORMAT_ORIGINAL]: function (
        dataItem: OptionDataItem, dimIndex: number, property: string
    ): OptionDataValue {
        // FIXME: In some case (markpoint in geo (geo-map.html)),
        // dataItem is {coord: [...]}
        const value = getDataItemValue(dataItem);
        return !(value instanceof Array)
            ? value
            : value[dimIndex];
    },

    [SOURCE_FORMAT_TYPED_ARRAY]: getRawValueSimply
};

export function getRawSourceValueGetter(sourceFormat: SourceFormat): RawSourceValueGetter {
    const method = rawSourceValueGetterMap[sourceFormat];
    if (__DEV__) {
        assert(method, 'Do not support get value on "' + sourceFormat + '".');
    }
    return method;
}


function getMethodMapKey(sourceFormat: SourceFormat, seriesLayoutBy: SeriesLayoutBy): string {
    return sourceFormat === SOURCE_FORMAT_ARRAY_ROWS
        ? sourceFormat + '_' + seriesLayoutBy
        : sourceFormat;
}


// ??? FIXME can these logic be more neat: getRawValue, getRawDataItem,
// Consider persistent.
// Caution: why use raw value to display on label or tooltip?
// A reason is to avoid format. For example time value we do not know
// how to format is expected. More over, if stack is used, calculated
// value may be 0.91000000001, which have brings trouble to display.
// TODO: consider how to treat null/undefined/NaN when display?
export function retrieveRawValue(
    data: SeriesData, dataIndex: number,
    // If dimIndex is null/undefined, return OptionDataItem.
    // Otherwise, return OptionDataValue.
    dim?: DimensionLoose | NullUndefined
): OptionDataValue | OptionDataItem {
    if (!data) {
        return;
    }

    // Consider data may be not persistent.
    const dataItem = data.getRawDataItem(dataIndex);

    if (dataItem == null) {
        return;
    }

    const store = data.getStore();
    const sourceFormat = store.getSource().sourceFormat;

    if (dim != null) {
        const dimIndex = data.getDimensionIndex(dim);
        const property = store.getDimensionProperty(dimIndex);

        return getRawSourceValueGetter(sourceFormat)(dataItem, dimIndex, property);
    }
    else {
        let result = dataItem;
        if (sourceFormat === SOURCE_FORMAT_ORIGINAL) {
            result = getDataItemValue(dataItem);
        }
        return result;
    }
}


/**
 * Compatible with some cases (in pie, map) like:
 * data: [{name: 'xx', value: 5, selected: true}, ...]
 * where only sourceFormat is 'original' and 'objectRows' supported.
 *
 * // TODO
 * Supported detail options in data item when using 'arrayRows'.
 *
 * @param data
 * @param dataIndex
 * @param attr like 'selected'
 */
export function retrieveRawAttr(data: SeriesData, dataIndex: number, attr: string): any {
    if (!data) {
        return;
    }

    const sourceFormat = data.getStore().getSource().sourceFormat;

    if (sourceFormat !== SOURCE_FORMAT_ORIGINAL
        && sourceFormat !== SOURCE_FORMAT_OBJECT_ROWS
    ) {
        return;
    }

    let dataItem = data.getRawDataItem(dataIndex);
    if (sourceFormat === SOURCE_FORMAT_ORIGINAL && !isObject(dataItem)) {
        dataItem = null;
    }
    if (dataItem) {
        return (dataItem as Dictionary<OptionDataValue>)[attr];
    }
}
