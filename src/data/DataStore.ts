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

import { assert, clone, createHashMap, isFunction, keys, map, reduce } from 'zrender/src/core/util';
import {
    DimensionIndex,
    DimensionName,
    OptionDataItem,
    ParsedValue,
    ParsedValueNumeric
} from '../util/types';
import { DataProvider } from './helper/dataProvider';
import { parseDataValue } from './helper/dataValueHelper';
import OrdinalMeta from './OrdinalMeta';
import { shouldRetrieveDataByName, Source } from './Source';

const UNDEFINED = 'undefined';
/* global Float64Array, Int32Array, Uint32Array, Uint16Array */

// Caution: MUST not use `new CtorUint32Array(arr, 0, len)`, because the Ctor of array is
// different from the Ctor of typed array.
export const CtorUint32Array = typeof Uint32Array === UNDEFINED ? Array : Uint32Array;
export const CtorUint16Array = typeof Uint16Array === UNDEFINED ? Array : Uint16Array;
export const CtorInt32Array = typeof Int32Array === UNDEFINED ? Array : Int32Array;
export const CtorFloat64Array = typeof Float64Array === UNDEFINED ? Array : Float64Array;
/**
 * Multi dimensional data store
 */
const dataCtors = {
    'float': CtorFloat64Array,
    'int': CtorInt32Array,
    // Ordinal data type can be string or int
    'ordinal': Array,
    'number': Array,
    'time': CtorFloat64Array
} as const;

export type DataStoreDimensionType = keyof typeof dataCtors;

type DataTypedArray = Uint32Array | Int32Array | Uint16Array | Float64Array;
type DataTypedArrayConstructor = typeof Uint32Array | typeof Int32Array | typeof Uint16Array | typeof Float64Array;
type DataArrayLikeConstructor = typeof Array | DataTypedArrayConstructor;


type DataValueChunk = ArrayLike<ParsedValue>;

// If Ctx not specified, use List as Ctx
type EachCb0 = (idx: number) => void;
type EachCb1 = (x: ParsedValue, idx: number) => void;
type EachCb2 = (x: ParsedValue, y: ParsedValue, idx: number) => void;
type EachCb = (...args: any) => void;
type FilterCb0 = (idx: number) => boolean;
type FilterCb1 = (x: ParsedValue, idx: number) => boolean;
type FilterCb = (...args: any) => boolean;
// type MapArrayCb = (...args: any) => any;
type MapCb = (...args: any) => ParsedValue | ParsedValue[];

export type DimValueGetter = (
    this: DataStore,
    dataItem: any,
    property: string,
    dataIndex: number,
    dimIndex: DimensionIndex
) => ParsedValue;

export interface DataStoreDimensionDefine {
    /**
     * Default to be float.
     */
    type?: DataStoreDimensionType;

    /**
     * Only used in SOURCE_FORMAT_OBJECT_ROWS and SOURCE_FORMAT_KEYED_COLUMNS to retrieve value
     * by "object property".
     * For example, in `[{bb: 124, aa: 543}, ...]`, "aa" and "bb" is "object property".
     *
     * Deliberately name it as "property" rather than "name" to prevent it from been used in
     * SOURCE_FORMAT_ARRAY_ROWS, because if it comes from series, it probably
     * can not be shared by different series.
     */
    property?: string;

    /**
     * When using category axis.
     * Category strings will be collected and stored in ordinalMeta.categories.
     * And store will store the index of categories.
     */
    ordinalMeta?: OrdinalMeta,

    /**
     * Offset for ordinal parsing and collect
     */
    ordinalOffset?: number
}

let defaultDimValueGetters: {[sourceFormat: string]: DimValueGetter};

function getIndicesCtor(rawCount: number): DataArrayLikeConstructor {
    // The possible max value in this._indicies is always this._rawCount despite of filtering.
    return rawCount > 65535 ? CtorUint32Array : CtorUint16Array;
};
function getInitialExtent(): [number, number] {
    return [Infinity, -Infinity];
};
function cloneChunk(originalChunk: DataValueChunk): DataValueChunk {
    const Ctor = originalChunk.constructor;
    // Only shallow clone is enough when Array.
    return Ctor === Array
        ? (originalChunk as Array<ParsedValue>).slice()
        : new (Ctor as DataTypedArrayConstructor)(originalChunk as DataTypedArray);
}

function prepareStore(
    store: DataValueChunk[],
    dimIdx: number,
    dimType: DataStoreDimensionType,
    end: number,
    append?: boolean
): void {
    const DataCtor = dataCtors[dimType || 'float'];

    if (append) {
        const oldStore = store[dimIdx];
        const oldLen = oldStore && oldStore.length;
        if (!(oldLen === end)) {
            const newStore = new DataCtor(end);
            // The cost of the copy is probably inconsiderable
            // within the initial chunkSize.
            for (let j = 0; j < oldLen; j++) {
                newStore[j] = oldStore[j];
            }
            store[dimIdx] = newStore;
        }
    }
    else {
        store[dimIdx] = new DataCtor(end);
    }
};

/**
 * Basically, DataStore API keep immutable.
 */
class DataStore {
    private _chunks: DataValueChunk[] = [];

    private _provider: DataProvider;

    // It will not be calculated until needed.
    private _rawExtent: [number, number][] = [];

    private _extent: [number, number][] = [];

    // Indices stores the indices of data subset after filtered.
    // This data subset will be used in chart.
    private _indices: ArrayLike<any>;

    private _count: number = 0;
    private _rawCount: number = 0;

    private _dimensions: DataStoreDimensionDefine[];
    private _dimValueGetter: DimValueGetter;

    private _calcDimNameToIdx = createHashMap<DimensionIndex, DimensionName>();

    defaultDimValueGetter: DimValueGetter;

    /**
     * Initialize from data
     */
    initData(
        provider: DataProvider,
        inputDimensions: DataStoreDimensionDefine[],
        dimValueGetter?: DimValueGetter
    ): void {
        if (__DEV__) {
            assert(
                isFunction(provider.getItem) && isFunction(provider.count),
                'Invalid data provider.'
            );
        }

        this._provider = provider;

        // Clear
        this._chunks = [];
        this._indices = null;
        this.getRawIndex = this._getRawIdxIdentity;

        const source = provider.getSource();
        const defaultGetter = this.defaultDimValueGetter =
             defaultDimValueGetters[source.sourceFormat];
        // Default dim value getter
        this._dimValueGetter = dimValueGetter || defaultGetter;

        // Reset raw extent.
        this._rawExtent = [];
        const willRetrieveDataByName = shouldRetrieveDataByName(source);
        this._dimensions = map(inputDimensions, dim => {
            if (__DEV__) {
                if (willRetrieveDataByName) {
                    assert(dim.property != null);
                }
            }
            return {
                // Only pick these two props. Not leak other properties like orderMeta.
                type: dim.type,
                property: dim.property
            };
        });

        this._initDataFromProvider(0, provider.count());
    }

    getProvider(): DataProvider {
        return this._provider;
    }

    /**
     * Caution: even when a `source` instance owned by a series, the created data store
     * may still be shared by different sereis (the source hash does not use all `source`
     * props, see `sourceManager`). In this case, the `source` props that are not used in
     * hash (like `source.dimensionDefine`) probably only belongs to a certain series and
     * thus should not be fetch here.
     */
    getSource(): Source {
        return this._provider.getSource();
    }

    /**
     * @caution Only used in dataStack.
     */
    ensureCalculationDimension(dimName: DimensionName, type: DataStoreDimensionType): DimensionIndex {
        const calcDimNameToIdx = this._calcDimNameToIdx;
        const dimensions = this._dimensions;

        let calcDimIdx = calcDimNameToIdx.get(dimName);
        if (calcDimIdx != null) {
            if (dimensions[calcDimIdx].type === type) {
                return calcDimIdx;
            }
        }
        else {
            calcDimIdx = dimensions.length;
        }

        dimensions[calcDimIdx] = { type: type };
        calcDimNameToIdx.set(dimName, calcDimIdx);

        this._chunks[calcDimIdx] = new dataCtors[type || 'float'](this._rawCount);
        this._rawExtent[calcDimIdx] = getInitialExtent();

        return calcDimIdx;
    }

    collectOrdinalMeta(
        dimIdx: number,
        ordinalMeta: OrdinalMeta
    ): void {
        const chunk = this._chunks[dimIdx];
        const dim = this._dimensions[dimIdx];
        const rawExtents = this._rawExtent;

        const offset = dim.ordinalOffset || 0;
        const len = chunk.length;

        if (offset === 0) {
            // We need to reset the rawExtent if collect is from start.
            // Because this dimension may be guessed as number and calcuating a wrong extent.
            rawExtents[dimIdx] = getInitialExtent();
        }

        const dimRawExtent = rawExtents[dimIdx];

        // Parse from previous data offset. len may be changed after appendData
        for (let i = offset; i < len; i++) {
            const val = (chunk as any)[i] = ordinalMeta.parseAndCollect(chunk[i]);
            if (!isNaN(val)) {
                dimRawExtent[0] = Math.min(val, dimRawExtent[0]);
                dimRawExtent[1] = Math.max(val, dimRawExtent[1]);
            }
        }

        dim.ordinalMeta = ordinalMeta;
        dim.ordinalOffset = len;
        dim.type = 'ordinal';   // Force to be ordinal
    }

    getOrdinalMeta(dimIdx: number): OrdinalMeta {
        const dimInfo = this._dimensions[dimIdx];
        const ordinalMeta = dimInfo.ordinalMeta;
        return ordinalMeta;
    }

    getDimensionProperty(dimIndex: DimensionIndex): DataStoreDimensionDefine['property'] {
        const item = this._dimensions[dimIndex];
        return item && item.property;
    }

    /**
     * Caution: Can be only called on raw data (before `this._indices` created).
     */
    appendData(data: ArrayLike<any>): number[] {
        if (__DEV__) {
            assert(!this._indices, 'appendData can only be called on raw data.');
        }

        const provider = this._provider;
        const start = this.count();
        provider.appendData(data);
        let end = provider.count();
        if (!provider.persistent) {
            end += start;
        }

        if (start < end) {
            this._initDataFromProvider(start, end, true);
        }

        return [start, end];
    }

    appendValues(values: any[][], minFillLen?: number): { start: number; end: number } {
        const chunks = this._chunks;
        const dimensions = this._dimensions;
        const dimLen = dimensions.length;
        const rawExtent = this._rawExtent;

        const start = this.count();
        const end = start + Math.max(values.length, minFillLen || 0);

        for (let i = 0; i < dimLen; i++) {
            const dim = dimensions[i];
            prepareStore(chunks, i, dim.type, end, true);
        }

        const emptyDataItem: number[] = [];
        for (let idx = start; idx < end; idx++) {
            const sourceIdx = idx - start;
            // Store the data by dimensions
            for (let dimIdx = 0; dimIdx < dimLen; dimIdx++) {
                const dim = dimensions[dimIdx];
                const val = defaultDimValueGetters.arrayRows.call(
                    this, values[sourceIdx] || emptyDataItem, dim.property, sourceIdx, dimIdx
                ) as ParsedValueNumeric;
                (chunks[dimIdx] as any)[idx] = val;

                const dimRawExtent = rawExtent[dimIdx];
                val < dimRawExtent[0] && (dimRawExtent[0] = val);
                val > dimRawExtent[1] && (dimRawExtent[1] = val);
            }
        }

        this._rawCount = this._count = end;

        return {start, end};
    }

    private _initDataFromProvider(
        start: number,
        end: number,
        append?: boolean
    ): void {
        const provider = this._provider;
        const chunks = this._chunks;
        const dimensions = this._dimensions;
        const dimLen = dimensions.length;
        const rawExtent = this._rawExtent;
        const dimNames = map(dimensions, dim => dim.property);

        for (let i = 0; i < dimLen; i++) {
            const dim = dimensions[i];
            if (!rawExtent[i]) {
                rawExtent[i] = getInitialExtent();
            }
            prepareStore(chunks, i, dim.type, end, append);
        }

        if (provider.fillStorage) {
            provider.fillStorage(start, end, chunks, rawExtent);
        }
        else {
            let dataItem = [] as OptionDataItem;
            for (let idx = start; idx < end; idx++) {
                // NOTICE: Try not to write things into dataItem
                dataItem = provider.getItem(idx, dataItem);
                // Each data item is value
                // [1, 2]
                // 2
                // Bar chart, line chart which uses category axis
                // only gives the 'y' value. 'x' value is the indices of category
                // Use a tempValue to normalize the value to be a (x, y) value

                // Store the data by dimensions
                for (let dimIdx = 0; dimIdx < dimLen; dimIdx++) {
                    const dimStorage = chunks[dimIdx];
                    // PENDING NULL is empty or zero
                    const val = this._dimValueGetter(
                        dataItem, dimNames[dimIdx], idx, dimIdx
                    ) as ParsedValueNumeric;
                    (dimStorage as ParsedValue[])[idx] = val;

                    const dimRawExtent = rawExtent[dimIdx];
                    val < dimRawExtent[0] && (dimRawExtent[0] = val);
                    val > dimRawExtent[1] && (dimRawExtent[1] = val);
                }
            }
        }

        if (!provider.persistent && provider.clean) {
            // Clean unused data if data source is typed array.
            provider.clean();
        }

        this._rawCount = this._count = end;
        // Reset data extent
        this._extent = [];
    }

    count(): number {
        return this._count;
    }

    /**
     * Get value. Return NaN if idx is out of range.
     */
    get(dim: DimensionIndex, idx: number): ParsedValue {
        if (!(idx >= 0 && idx < this._count)) {
            return NaN;
        }
        const dimStore = this._chunks[dim];
        return dimStore ? dimStore[this.getRawIndex(idx)] : NaN;
    }

    getValues(idx: number): ParsedValue[];
    getValues(dimensions: readonly DimensionIndex[], idx?: number): ParsedValue[];
    getValues(dimensions: readonly DimensionIndex[] | number, idx?: number): ParsedValue[] {
        const values = [];
        let dimArr: DimensionIndex[] = [];
        if (idx == null) {
            idx = dimensions as number;
            // TODO get all from store?
            dimensions = [];
            // All dimensions
            for (let i = 0; i < this._dimensions.length; i++) {
                dimArr.push(i);
            }
        }
        else {
            dimArr = dimensions as DimensionIndex[];
        }

        for (let i = 0, len = dimArr.length; i < len; i++) {
            values.push(this.get(dimArr[i], idx));
        }

        return values;
    }

    /**
     * @param dim concrete dim
     */
    getByRawIndex(dim: DimensionIndex, rawIdx: number): ParsedValue {
        if (!(rawIdx >= 0 && rawIdx < this._rawCount)) {
            return NaN;
        }
        const dimStore = this._chunks[dim];
        return dimStore ? dimStore[rawIdx] : NaN;
    }

    /**
     * Get sum of data in one dimension
     */
    getSum(dim: DimensionIndex): number {
        const dimData = this._chunks[dim];
        let sum = 0;
        if (dimData) {
            for (let i = 0, len = this.count(); i < len; i++) {
                const value = this.get(dim, i) as number;
                if (!isNaN(value)) {
                    sum += value;
                }
            }
        }
        return sum;
    }

    /**
     * Get median of data in one dimension
     */
    getMedian(dim: DimensionIndex): number {
        const dimDataArray: ParsedValue[] = [];
        // map all data of one dimension
        this.each([dim], function (val) {
            if (!isNaN(val as number)) {
                dimDataArray.push(val);
            }
        });

        // TODO
        // Use quick select?
        const sortedDimDataArray = dimDataArray.sort(function (a: number, b: number) {
            return a - b;
        }) as number[];
        const len = this.count();
        // calculate median
        return len === 0
            ? 0
            : len % 2 === 1
            ? sortedDimDataArray[(len - 1) / 2]
            : (sortedDimDataArray[len / 2] + sortedDimDataArray[len / 2 - 1]) / 2;
    }

    /**
     * Retrieve the index with given raw data index.
     */
    indexOfRawIndex(rawIndex: number): number {
        if (rawIndex >= this._rawCount || rawIndex < 0) {
            return -1;
        }

        if (!this._indices) {
            return rawIndex;
        }

        // Indices are ascending
        const indices = this._indices;

        // If rawIndex === dataIndex
        const rawDataIndex = indices[rawIndex];
        if (rawDataIndex != null && rawDataIndex < this._count && rawDataIndex === rawIndex) {
            return rawIndex;
        }

        let left = 0;
        let right = this._count - 1;
        while (left <= right) {
            const mid = (left + right) / 2 | 0;
            if (indices[mid] < rawIndex) {
                left = mid + 1;
            }
            else if (indices[mid] > rawIndex) {
                right = mid - 1;
            }
            else {
                return mid;
            }
        }
        return -1;
    }


    /**
     * Retrieve the index of nearest value.
     * @param dim
     * @param value
     * @param [maxDistance=Infinity]
     * @return If and only if multiple indices have
     *         the same value, they are put to the result.
     */
    indicesOfNearest(
        dim: DimensionIndex, value: number, maxDistance?: number
    ): number[] {
        const chunks = this._chunks;
        const dimData = chunks[dim];
        const nearestIndices: number[] = [];

        if (!dimData) {
            return nearestIndices;
        }

        if (maxDistance == null) {
            maxDistance = Infinity;
        }

        let minDist = Infinity;
        let minDiff = -1;
        let nearestIndicesLen = 0;

        // Check the test case of `test/ut/spec/data/SeriesData.js`.
        for (let i = 0, len = this.count(); i < len; i++) {
            const dataIndex = this.getRawIndex(i);
            const diff = value - (dimData[dataIndex] as number);
            const dist = Math.abs(diff);
            if (dist <= maxDistance) {
                // When the `value` is at the middle of `this.get(dim, i)` and `this.get(dim, i+1)`,
                // we'd better not push both of them to `nearestIndices`, otherwise it is easy to
                // get more than one item in `nearestIndices` (more specifically, in `tooltip`).
                // So we choose the one that `diff >= 0` in this case.
                // But if `this.get(dim, i)` and `this.get(dim, j)` get the same value, both of them
                // should be push to `nearestIndices`.
                if (dist < minDist
                    || (dist === minDist && diff >= 0 && minDiff < 0)
                ) {
                    minDist = dist;
                    minDiff = diff;
                    nearestIndicesLen = 0;
                }
                if (diff === minDiff) {
                    nearestIndices[nearestIndicesLen++] = i;
                }
            }
        }
        nearestIndices.length = nearestIndicesLen;

        return nearestIndices;
    }

    getIndices(): ArrayLike<number> {
        let newIndices;

        const indices = this._indices;
        if (indices) {
            const Ctor = indices.constructor as DataArrayLikeConstructor;
            const thisCount = this._count;
            // `new Array(a, b, c)` is different from `new Uint32Array(a, b, c)`.
            if (Ctor === Array) {
                newIndices = new Ctor(thisCount);
                for (let i = 0; i < thisCount; i++) {
                    newIndices[i] = indices[i];
                }
            }
            else {
                newIndices = new (Ctor as DataTypedArrayConstructor)(
                    (indices as DataTypedArray).buffer, 0, thisCount
                );
            }
        }
        else {
            const Ctor = getIndicesCtor(this._rawCount);
            newIndices = new Ctor(this.count());
            for (let i = 0; i < newIndices.length; i++) {
                newIndices[i] = i;
            }
        }

        return newIndices;
    }

    /**
     * Data filter.
     */
    filter(
        dims: DimensionIndex[],
        cb: FilterCb
    ): DataStore {
        if (!this._count) {
            return this;
        }

        const newStore = this.clone();

        const count = newStore.count();
        const Ctor = getIndicesCtor(newStore._rawCount);
        const newIndices = new Ctor(count);
        const value = [];
        const dimSize = dims.length;

        let offset = 0;
        const dim0 = dims[0];
        const chunks = newStore._chunks;

        for (let i = 0; i < count; i++) {
            let keep;
            const rawIdx = newStore.getRawIndex(i);
            // Simple optimization
            if (dimSize === 0) {
                keep = (cb as FilterCb0)(i);
            }
            else if (dimSize === 1) {
                const val = chunks[dim0][rawIdx];
                keep = (cb as FilterCb1)(val, i);
            }
            else {
                let k = 0;
                for (; k < dimSize; k++) {
                    value[k] = chunks[dims[k]][rawIdx];
                }
                value[k] = i;
                keep = (cb as FilterCb).apply(null, value);
            }
            if (keep) {
                newIndices[offset++] = rawIdx;
            }
        }

        // Set indices after filtered.
        if (offset < count) {
            newStore._indices = newIndices;
        }
        newStore._count = offset;
        // Reset data extent
        newStore._extent = [];

        newStore._updateGetRawIdx();

        return newStore;
    }

    /**
     * Select data in range. (For optimization of filter)
     * (Manually inline code, support 5 million data filtering in data zoom.)
     */
    selectRange(range: {[dimIdx: number]: [number, number]}): DataStore {
        const newStore = this.clone();

        const len = newStore._count;

        if (!len) {
            return this;
        }

        const dims = keys(range);
        const dimSize = dims.length;
        if (!dimSize) {
            return this;
        }

        const originalCount = newStore.count();
        const Ctor = getIndicesCtor(newStore._rawCount);
        const newIndices = new Ctor(originalCount);

        let offset = 0;
        const dim0 = dims[0];

        const min = range[dim0][0];
        const max = range[dim0][1];
        const storeArr = newStore._chunks;

        let quickFinished = false;
        if (!newStore._indices) {
            // Extreme optimization for common case. About 2x faster in chrome.
            let idx = 0;
            if (dimSize === 1) {
                const dimStorage = storeArr[dims[0]];
                for (let i = 0; i < len; i++) {
                    const val = dimStorage[i];
                    // NaN will not be filtered. Consider the case, in line chart, empty
                    // value indicates the line should be broken. But for the case like
                    // scatter plot, a data item with empty value will not be rendered,
                    // but the axis extent may be effected if some other dim of the data
                    // item has value. Fortunately it is not a significant negative effect.
                    if (
                        (val >= min && val <= max) || isNaN(val as any)
                    ) {
                        newIndices[offset++] = idx;
                    }
                    idx++;
                }
                quickFinished = true;
            }
            else if (dimSize === 2) {
                const dimStorage = storeArr[dims[0]];
                const dimStorage2 = storeArr[dims[1]];
                const min2 = range[dims[1]][0];
                const max2 = range[dims[1]][1];
                for (let i = 0; i < len; i++) {
                    const val = dimStorage[i];
                    const val2 = dimStorage2[i];
                    // Do not filter NaN, see comment above.
                    if ((
                            (val >= min && val <= max) || isNaN(val as any)
                        )
                        && (
                            (val2 >= min2 && val2 <= max2) || isNaN(val2 as any)
                        )
                    ) {
                        newIndices[offset++] = idx;
                    }
                    idx++;
                }
                quickFinished = true;
            }
        }
        if (!quickFinished) {
            if (dimSize === 1) {
                for (let i = 0; i < originalCount; i++) {
                    const rawIndex = newStore.getRawIndex(i);
                    const val = storeArr[dims[0]][rawIndex];
                    // Do not filter NaN, see comment above.
                    if (
                        (val >= min && val <= max) || isNaN(val as any)
                    ) {
                        newIndices[offset++] = rawIndex;
                    }
                }
            }
            else {
                for (let i = 0; i < originalCount; i++) {
                    let keep = true;
                    const rawIndex = newStore.getRawIndex(i);
                    for (let k = 0; k < dimSize; k++) {
                        const dimk = dims[k];
                        const val = storeArr[dimk][rawIndex];
                        // Do not filter NaN, see comment above.
                        if (val < range[dimk][0] || val > range[dimk][1]) {
                            keep = false;
                        }
                    }
                    if (keep) {
                        newIndices[offset++] = newStore.getRawIndex(i);
                    }
                }
            }
        }

        // Set indices after filtered.
        if (offset < originalCount) {
            newStore._indices = newIndices;
        }
        newStore._count = offset;
        // Reset data extent
        newStore._extent = [];

        newStore._updateGetRawIdx();

        return newStore;
    }

    // /**
    //  * Data mapping to a plain array
    //  */
    // mapArray(dims: DimensionIndex[], cb: MapArrayCb): any[] {
    //     const result: any[] = [];
    //     this.each(dims, function () {
    //         result.push(cb && (cb as MapArrayCb).apply(null, arguments));
    //     });
    //     return result;
    // }

    /**
     * Data mapping to a new List with given dimensions
     */
    map(dims: DimensionIndex[], cb: MapCb): DataStore {
        // TODO only clone picked chunks.
        const target = this.clone(dims);
        this._updateDims(target, dims, cb);
        return target;
    }

    /**
     * @caution Danger!! Only used in dataStack.
     */
    modify(dims: DimensionIndex[], cb: MapCb) {
        this._updateDims(this, dims, cb);
    }

    private _updateDims(
        target: DataStore,
        dims: DimensionIndex[],
        cb: MapCb
    ) {
        const targetChunks = target._chunks;

        const tmpRetValue = [];
        const dimSize = dims.length;
        const dataCount = target.count();
        const values = [];
        const rawExtent = target._rawExtent;

        for (let i = 0; i < dims.length; i++) {
            rawExtent[dims[i]] = getInitialExtent();
        }

        for (let dataIndex = 0; dataIndex < dataCount; dataIndex++) {
            const rawIndex = target.getRawIndex(dataIndex);

            for (let k = 0; k < dimSize; k++) {
                values[k] = targetChunks[dims[k]][rawIndex];
            }
            values[dimSize] = dataIndex;

            let retValue = cb && cb.apply(null, values);
            if (retValue != null) {
                // a number or string (in oridinal dimension)?
                if (typeof retValue !== 'object') {
                    tmpRetValue[0] = retValue;
                    retValue = tmpRetValue;
                }

                for (let i = 0; i < retValue.length; i++) {
                    const dim = dims[i];
                    const val = retValue[i];
                    const rawExtentOnDim = rawExtent[dim];

                    const dimStore = targetChunks[dim];
                    if (dimStore) {
                        (dimStore as ParsedValue[])[rawIndex] = val;
                    }

                    if (val < rawExtentOnDim[0]) {
                        rawExtentOnDim[0] = val as number;
                    }
                    if (val > rawExtentOnDim[1]) {
                        rawExtentOnDim[1] = val as number;
                    }
                }
            }
        }
    }

    /**
     * Large data down sampling using largest-triangle-three-buckets
     * @param {string} valueDimension
     * @param {number} targetCount
     */
    lttbDownSample(
        valueDimension: DimensionIndex,
        rate: number
    ): DataStore {
        const target = this.clone([valueDimension], true);
        const targetStorage = target._chunks;
        const dimStore = targetStorage[valueDimension];
        const len = this.count();

        let sampledIndex = 0;

        const frameSize = Math.floor(1 / rate);

        let currentRawIndex = this.getRawIndex(0);
        let maxArea;
        let area;
        let nextRawIndex;

        const newIndices = new (getIndicesCtor(this._rawCount))(Math.min((Math.ceil(len / frameSize) + 2) * 2, len));

        // First frame use the first data.
        newIndices[sampledIndex++] = currentRawIndex;
        for (let i = 1; i < len - 1; i += frameSize) {
            const nextFrameStart = Math.min(i + frameSize, len - 1);
            const nextFrameEnd = Math.min(i + frameSize * 2, len);

            const avgX = (nextFrameEnd + nextFrameStart) / 2;
            let avgY = 0;

            for (let idx = nextFrameStart; idx < nextFrameEnd; idx++) {
                const rawIndex = this.getRawIndex(idx);
                const y = dimStore[rawIndex] as number;
                if (isNaN(y)) {
                    continue;
                }
                avgY += y as number;
            }
            avgY /= (nextFrameEnd - nextFrameStart);

            const frameStart = i;
            const frameEnd = Math.min(i + frameSize, len);

            const pointAX = i - 1;
            const pointAY = dimStore[currentRawIndex] as number;

            maxArea = -1;

            nextRawIndex = frameStart;

            let firstNaNIndex = -1;
            let countNaN = 0;
            // Find a point from current frame that construct a triangle with largest area with previous selected point
            // And the average of next frame.
            for (let idx = frameStart; idx < frameEnd; idx++) {
                const rawIndex = this.getRawIndex(idx);
                const y = dimStore[rawIndex] as number;
                if (isNaN(y)) {
                    countNaN++;
                    if (firstNaNIndex < 0) {
                        firstNaNIndex = rawIndex;
                    }
                    continue;
                }
                // Calculate triangle area over three buckets
                area = Math.abs((pointAX - avgX) * (y - pointAY)
                    - (pointAX - idx) * (avgY - pointAY)
                );
                if (area > maxArea) {
                    maxArea = area;
                    nextRawIndex = rawIndex; // Next a is this b
                }
            }

            if (countNaN > 0 && countNaN < frameEnd - frameStart) {
                // Append first NaN point in every bucket.
                // It is necessary to ensure the correct order of indices.
                newIndices[sampledIndex++] = Math.min(firstNaNIndex, nextRawIndex);
                nextRawIndex = Math.max(firstNaNIndex, nextRawIndex);
            }

            newIndices[sampledIndex++] = nextRawIndex;

            currentRawIndex = nextRawIndex; // This a is the next a (chosen b)
        }

        // First frame use the last data.
        newIndices[sampledIndex++] = this.getRawIndex(len - 1);
        target._count = sampledIndex;
        target._indices = newIndices;

        target.getRawIndex = this._getRawIdx;
        return target;
    }


    /**
     * Large data down sampling on given dimension
     * @param sampleIndex Sample index for name and id
     */
    downSample(
        dimension: DimensionIndex,
        rate: number,
        sampleValue: (frameValues: ArrayLike<ParsedValue>) => ParsedValueNumeric,
        sampleIndex: (frameValues: ArrayLike<ParsedValue>, value: ParsedValueNumeric) => number
    ): DataStore {
        const target = this.clone([dimension], true);
        const targetStorage = target._chunks;

        const frameValues = [];
        let frameSize = Math.floor(1 / rate);

        const dimStore = targetStorage[dimension];
        const len = this.count();
        const rawExtentOnDim = target._rawExtent[dimension] = getInitialExtent();

        const newIndices = new (getIndicesCtor(this._rawCount))(Math.ceil(len / frameSize));

        let offset = 0;
        for (let i = 0; i < len; i += frameSize) {
            // Last frame
            if (frameSize > len - i) {
                frameSize = len - i;
                frameValues.length = frameSize;
            }
            for (let k = 0; k < frameSize; k++) {
                const dataIdx = this.getRawIndex(i + k);
                frameValues[k] = dimStore[dataIdx];
            }
            const value = sampleValue(frameValues);
            const sampleFrameIdx = this.getRawIndex(
                Math.min(i + sampleIndex(frameValues, value) || 0, len - 1)
            );
            // Only write value on the filtered data
            (dimStore as number[])[sampleFrameIdx] = value;

            if (value < rawExtentOnDim[0]) {
                rawExtentOnDim[0] = value;
            }
            if (value > rawExtentOnDim[1]) {
                rawExtentOnDim[1] = value;
            }

            newIndices[offset++] = sampleFrameIdx;
        }

        target._count = offset;
        target._indices = newIndices;

        target._updateGetRawIdx();

        return target;
    }

    /**
     * Data iteration
     * @param ctx default this
     * @example
     *  list.each('x', function (x, idx) {});
     *  list.each(['x', 'y'], function (x, y, idx) {});
     *  list.each(function (idx) {})
     */
    each(dims: DimensionIndex[], cb: EachCb): void {
        if (!this._count) {
            return;
        }
        const dimSize = dims.length;
        const chunks = this._chunks;

        for (let i = 0, len = this.count(); i < len; i++) {
            const rawIdx = this.getRawIndex(i);
            // Simple optimization
            switch (dimSize) {
                case 0:
                    (cb as EachCb0)(i);
                    break;
                case 1:
                    (cb as EachCb1)(chunks[dims[0]][rawIdx], i);
                    break;
                case 2:
                    (cb as EachCb2)(
                        chunks[dims[0]][rawIdx], chunks[dims[1]][rawIdx], i
                    );
                    break;
                default:
                    let k = 0;
                    const value = [];
                    for (; k < dimSize; k++) {
                        value[k] = chunks[dims[k]][rawIdx];
                    }
                    // Index
                    value[k] = i;
                    (cb as EachCb).apply(null, value);
            }
        }
    }

    /**
     * Get extent of data in one dimension
     */
    getDataExtent(dim: DimensionIndex): [number, number] {
        // Make sure use concrete dim as cache name.
        const dimData = this._chunks[dim];
        const initialExtent = getInitialExtent();

        if (!dimData) {
            return initialExtent;
        }

        // Make more strict checkings to ensure hitting cache.
        const currEnd = this.count();

        // Consider the most cases when using data zoom, `getDataExtent`
        // happened before filtering. We cache raw extent, which is not
        // necessary to be cleared and recalculated when restore data.
        const useRaw = !this._indices;
        let dimExtent: [number, number];

        if (useRaw) {
            return this._rawExtent[dim].slice() as [number, number];
        }
        dimExtent = this._extent[dim];
        if (dimExtent) {
            return dimExtent.slice() as [number, number];
        }
        dimExtent = initialExtent;

        let min = dimExtent[0];
        let max = dimExtent[1];

        for (let i = 0; i < currEnd; i++) {
            const rawIdx = this.getRawIndex(i);
            const value = dimData[rawIdx] as ParsedValueNumeric;
            value < min && (min = value);
            value > max && (max = value);
        }

        dimExtent = [min, max];

        this._extent[dim] = dimExtent;

        return dimExtent;
    }

    /**
     * Get raw data index.
     * Do not initialize.
     * Default `getRawIndex`. And it can be changed.
     */
    getRawIndex: (idx: number) => number;

    /**
     * Get raw data item
     */
    getRawDataItem(idx: number): OptionDataItem {
        const rawIdx = this.getRawIndex(idx);
        if (!this._provider.persistent) {
            const val = [];
            const chunks = this._chunks;
            for (let i = 0; i < chunks.length; i++) {
                val.push(chunks[i][rawIdx]);
            }
            return val;
        }
        else {
            return this._provider.getItem(rawIdx);
        }
    }

    /**
     * Clone shallow.
     *
     * @param clonedDims Determine which dims to clone. Will share the data if not specified.
     */
    clone(clonedDims?: DimensionIndex[], ignoreIndices?: boolean): DataStore {
        const target = new DataStore();
        const chunks = this._chunks;
        const clonedDimsMap = clonedDims && reduce(clonedDims, (obj, dimIdx) => {
            obj[dimIdx] = true;
            return obj;
        }, {} as Record<DimensionIndex, boolean>);

        if (clonedDimsMap) {
            for (let i = 0; i < chunks.length; i++) {
                // Not clone if dim is not picked.
                target._chunks[i] = !clonedDimsMap[i] ? chunks[i] : cloneChunk(chunks[i]);
            }
        }
        else {
            target._chunks = chunks;
        }
        this._copyCommonProps(target);

        if (!ignoreIndices) {
            target._indices = this._cloneIndices();
        }
        target._updateGetRawIdx();
        return target;
    }

    private _copyCommonProps(target: DataStore): void {
        target._count = this._count;
        target._rawCount = this._rawCount;
        target._provider = this._provider;
        target._dimensions = this._dimensions;

        target._extent = clone(this._extent);
        target._rawExtent = clone(this._rawExtent);
    }

    private _cloneIndices(): DataStore['_indices'] {
        if (this._indices) {
            const Ctor = this._indices.constructor as DataArrayLikeConstructor;
            let indices;
            if (Ctor === Array) {
                const thisCount = this._indices.length;
                indices = new Ctor(thisCount);
                for (let i = 0; i < thisCount; i++) {
                    indices[i] = this._indices[i];
                }
            }
            else {
                indices = new (Ctor as DataTypedArrayConstructor)(this._indices);
            }
            return indices;
        }
        return null;
    }

    private _getRawIdxIdentity(idx: number): number {
        return idx;
    }
    private _getRawIdx(idx: number): number {
        if (idx < this._count && idx >= 0) {
            return this._indices[idx];
        }
        return -1;
    }

    private _updateGetRawIdx(): void {
        this.getRawIndex = this._indices ? this._getRawIdx : this._getRawIdxIdentity;
    }

    private static internalField = (function () {

        function getDimValueSimply(
            this: DataStore, dataItem: any, property: string, dataIndex: number, dimIndex: number
        ): ParsedValue {
            return parseDataValue(dataItem[dimIndex], this._dimensions[dimIndex]);
        }

        defaultDimValueGetters = {

            arrayRows: getDimValueSimply,

            objectRows(
                this: DataStore, dataItem: any, property: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                return parseDataValue(dataItem[property], this._dimensions[dimIndex]);
            },

            keyedColumns: getDimValueSimply,

            original(
                this: DataStore, dataItem: any, property: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                // Performance sensitive, do not use modelUtil.getDataItemValue.
                // If dataItem is an plain object with no value field, the let `value`
                // will be assigned with the object, but it will be tread correctly
                // in the `convertValue`.
                const value = dataItem && (dataItem.value == null ? dataItem : dataItem.value);

                return parseDataValue(
                    (value instanceof Array)
                        ? value[dimIndex]
                        // If value is a single number or something else not array.
                        : value,
                    this._dimensions[dimIndex]
                );
            },

            typedArray: function (
                this: DataStore, dataItem: any, property: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                return dataItem[dimIndex];
            }

        };

    })();
}

export default DataStore;
