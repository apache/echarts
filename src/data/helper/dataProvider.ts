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

import {isTypedArray, extend, assert, each, isObject} from 'zrender/src/core/util';
import {getDataItemValue} from '../../util/model';
import Source from '../Source';
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
    DimensionIndexLoose, OptionDataItem, OptionDataValue
} from '../../util/types';
import List from '../List';


export interface DataProvider {
    // If data is pure without style configuration
    pure: boolean;
    // If data is persistent and will not be released after use.
    persistent: boolean;

    getSource(): Source;
    count(): number;
    getItem(idx: number, out?: OptionDataItem): OptionDataItem;
    appendData(newData: ArrayLike<OptionDataItem>): void;
    clean(): void;
}


let providerMethods: Dictionary<any>;

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
        const source: Source = !(sourceParam instanceof Source)
            ? Source.seriesDataToSource(sourceParam as OptionSourceData)
            : sourceParam as Source;

        // declare source is Source;
        this._source = source;

        const data = this._data = source.data;
        const sourceFormat = source.sourceFormat;

        // Typed array. TODO IE10+?
        if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
            if (__DEV__) {
                if (dimSize == null) {
                    throw new Error('Typed array data must specify dimension size');
                }
            }
            this._offset = 0;
            this._dimSize = dimSize;
            this._data = data;
        }

        const methods = providerMethods[
            sourceFormat === SOURCE_FORMAT_ARRAY_ROWS
            ? sourceFormat + '_' + source.seriesLayoutBy
            : sourceFormat
        ];

        if (__DEV__) {
            assert(methods, 'Invalide sourceFormat: ' + sourceFormat);
        }

        extend(this, methods);
    }

    getSource(): Source {
        return this._source;
    }

    count(): number {
        return 0;
    }

    getItem(idx: number): OptionDataItem {
        return;
    }

    appendData(newData: OptionSourceData): void {
    }

    clean(): void {
    }

    private static internalField = (function () {

        providerMethods = {

            [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_COLUMN]: {
                pure: true,
                count: function (this: DefaultDataProvider): number {
                    return Math.max(0, (this._data as OptionDataItem[][]).length - this._source.startIndex);
                },
                getItem: function (this: DefaultDataProvider, idx: number): OptionDataValue[] {
                    return (this._data as OptionDataValue[][])[idx + this._source.startIndex];
                },
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_ARRAY_ROWS + '_' + SERIES_LAYOUT_BY_ROW]: {
                pure: true,
                count: function (this: DefaultDataProvider): number {
                    const row = (this._data as OptionDataValue[][])[0];
                    return row ? Math.max(0, row.length - this._source.startIndex) : 0;
                },
                getItem: function (this: DefaultDataProvider, idx: number): OptionDataValue[] {
                    idx += this._source.startIndex;
                    const item = [];
                    const data = this._data as OptionDataValue[][];
                    for (let i = 0; i < data.length; i++) {
                        const row = data[i];
                        item.push(row ? row[idx] : null);
                    }
                    return item;
                },
                appendData: function () {
                    throw new Error('Do not support appendData when set seriesLayoutBy: "row".');
                }
            },

            [SOURCE_FORMAT_OBJECT_ROWS]: {
                pure: true,
                count: countSimply,
                getItem: getItemSimply,
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_KEYED_COLUMNS]: {
                pure: true,
                count: function (this: DefaultDataProvider): number {
                    const dimName = this._source.dimensionsDefine[0].name;
                    const col = (this._data as Dictionary<OptionDataValue[]>)[dimName];
                    return col ? col.length : 0;
                },
                getItem: function (this: DefaultDataProvider, idx: number): OptionDataValue[] {
                    const item = [];
                    const dims = this._source.dimensionsDefine;
                    for (let i = 0; i < dims.length; i++) {
                        const col = (this._data as Dictionary<OptionDataValue[]>)[dims[i].name];
                        item.push(col ? col[idx] : null);
                    }
                    return item;
                },
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
                count: countSimply,
                getItem: getItemSimply,
                appendData: appendDataSimply
            },

            [SOURCE_FORMAT_TYPED_ARRAY]: {
                persistent: false,
                pure: true,
                count: function (this: DefaultDataProvider): number {
                    return this._data ? ((this._data as ArrayLike<number>).length / this._dimSize) : 0;
                },
                getItem: function (this: DefaultDataProvider, idx: number, out: ArrayLike<number>): ArrayLike<number> {
                    idx = idx - this._offset;
                    out = out || [];
                    const offset = this._dimSize * idx;
                    for (let i = 0; i < this._dimSize; i++) {
                        out[i] = (this._data as ArrayLike<number>)[offset + i];
                    }
                    return out;
                },
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

        function countSimply(this: DefaultDataProvider): number {
            return (this._data as []).length;
        }
        function getItemSimply(this: DefaultDataProvider, idx: number): OptionDataItem {
            return (this._data as [])[idx];
        }
        function appendDataSimply(this: DefaultDataProvider, newData: ArrayLike<OptionDataItem>): void {
            for (let i = 0; i < newData.length; i++) {
                (this._data as any[]).push(newData[i]);
            }
        }

    })();
}
// TODO
// merge it to dataProvider?
type RawValueGetter = (
    dataItem: OptionDataItem,
    dataIndex: number,
    dimIndex: DimensionIndex,
    dimName: DimensionName
    // If dimIndex not provided, return OptionDataItem.
    // If dimIndex provided, return OptionDataPrimitive.
) => OptionDataValue | OptionDataItem;

const rawValueGetters: {[sourceFormat: string]: RawValueGetter} = {

    [SOURCE_FORMAT_ARRAY_ROWS]: getRawValueSimply,

    [SOURCE_FORMAT_OBJECT_ROWS]: function (
        dataItem: Dictionary<OptionDataValue>, dataIndex: number, dimIndex: number, dimName: string
    ): OptionDataValue | Dictionary<OptionDataValue> {
        return dimIndex != null ? dataItem[dimName] : dataItem;
    },

    [SOURCE_FORMAT_KEYED_COLUMNS]: getRawValueSimply,

    [SOURCE_FORMAT_ORIGINAL]: function (
        dataItem: OptionDataItem, dataIndex: number, dimIndex: number, dimName: string
    ): OptionDataValue | OptionDataItem {
        // FIXME: In some case (markpoint in geo (geo-map.html)),
        // dataItem is {coord: [...]}
        const value = getDataItemValue(dataItem);
        return (dimIndex == null || !(value instanceof Array))
            ? value
            : value[dimIndex];
    },

    [SOURCE_FORMAT_TYPED_ARRAY]: getRawValueSimply
};

function getRawValueSimply(
    dataItem: ArrayLike<OptionDataValue>, dataIndex: number, dimIndex: number, dimName: string
): OptionDataValue | ArrayLike<OptionDataValue> {
    return dimIndex != null ? dataItem[dimIndex] : dataItem;
}

// ??? FIXME can these logic be more neat: getRawValue, getRawDataItem,
// Consider persistent.
// Caution: why use raw value to display on label or tooltip?
// A reason is to avoid format. For example time value we do not know
// how to format is expected. More over, if stack is used, calculated
// value may be 0.91000000001, which have brings trouble to display.
// TODO: consider how to treat null/undefined/NaN when display?
export function retrieveRawValue(
    data: List, dataIndex: number, dim?: DimensionName | DimensionIndexLoose
): any {
    if (!data) {
        return;
    }

    // Consider data may be not persistent.
    const dataItem = data.getRawDataItem(dataIndex);

    if (dataItem == null) {
        return;
    }

    const sourceFormat = data.getProvider().getSource().sourceFormat;
    let dimName;
    let dimIndex;

    const dimInfo = data.getDimensionInfo(dim);
    if (dimInfo) {
        dimName = dimInfo.name;
        dimIndex = dimInfo.index;
    }

    return rawValueGetters[sourceFormat](dataItem, dataIndex, dimIndex, dimName);
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
export function retrieveRawAttr(data: List, dataIndex: number, attr: string): any {
    if (!data) {
        return;
    }

    const sourceFormat = data.getProvider().getSource().sourceFormat;

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
