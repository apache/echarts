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

/* global Float64Array, Int32Array, Uint32Array, Uint16Array */

/**
 * List for data storage
 */

import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import DataDiffer from './DataDiffer';
import {DefaultDataProvider, DataProvider} from './helper/dataProvider';
import {summarizeDimensions, DimensionSummary} from './helper/dimensionHelper';
import DataDimensionInfo from './DataDimensionInfo';
import {ArrayLike, Dictionary, FunctionPropertyNames} from 'zrender/src/core/types';
import Element from 'zrender/src/Element';
import {
    DimensionIndex, DimensionName, DimensionLoose, OptionDataItem,
    ParsedValue, ParsedValueNumeric, OrdinalNumber, DimensionUserOuput,
    ModelOption, SeriesDataType, OrdinalRawValue
} from '../util/types';
import {isDataItemOption, convertOptionIdName} from '../util/model';
import { getECData } from '../util/ecData';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import type Graph from './Graph';
import type Tree from './Tree';
import type { VisualMeta } from '../component/visualMap/VisualMapModel';
import { parseDataValue } from './helper/dataValueHelper';
import { isSourceInstance } from './Source';

const mathFloor = Math.floor;
const isObject = zrUtil.isObject;

const UNDEFINED = 'undefined';
const INDEX_NOT_FOUND = -1;

// Use prefix to avoid index to be the same as otherIdList[idx],
// which will cause weird udpate animation.
const ID_PREFIX = 'e\0\0';

const dataCtors = {
    'float': typeof Float64Array === UNDEFINED
        ? Array : Float64Array,
    'int': typeof Int32Array === UNDEFINED
        ? Array : Int32Array,
    // Ordinal data type can be string or int
    'ordinal': Array,
    'number': Array,
    'time': Array
};

export type ListDimensionType = keyof typeof dataCtors;

// Caution: MUST not use `new CtorUint32Array(arr, 0, len)`, because the Ctor of array is
// different from the Ctor of typed array.
const CtorUint32Array = typeof Uint32Array === UNDEFINED ? Array : Uint32Array;
const CtorInt32Array = typeof Int32Array === UNDEFINED ? Array : Int32Array;
const CtorUint16Array = typeof Uint16Array === UNDEFINED ? Array : Uint16Array;

type DataTypedArray = Uint32Array | Int32Array | Uint16Array | Float64Array;
type DataTypedArrayConstructor = typeof Uint32Array | typeof Int32Array | typeof Uint16Array | typeof Float64Array;
type DataArrayLikeConstructor = typeof Array | DataTypedArrayConstructor;


type DimValueGetter = (
    this: List,
    dataItem: any,
    dimName: DimensionName,
    dataIndex: number,
    dimIndex: DimensionIndex
) => ParsedValue;

type DataValueChunk = ArrayLike<ParsedValue>;
type DataStorage = {[dimName: string]: DataValueChunk[]};
type NameRepeatCount = {[name: string]: number};


type ItrParamDims = DimensionLoose | Array<DimensionLoose>;
// If Ctx not specified, use List as Ctx
type CtxOrList<Ctx> = unknown extends Ctx ? List : Ctx;
type EachCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => void;
type EachCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, idx: number) => void;
type EachCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, y: ParsedValue, idx: number) => void;
type EachCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => void;
type FilterCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => boolean;
type FilterCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, idx: number) => boolean;
type FilterCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, y: ParsedValue, idx: number) => boolean;
type FilterCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => boolean;
type MapArrayCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => any;
type MapArrayCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, idx: number) => any;
type MapArrayCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, y: ParsedValue, idx: number) => any;
type MapArrayCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => any;
type MapCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, idx: number) => ParsedValue | ParsedValue[];
type MapCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedValue, y: ParsedValue, idx: number) =>
    ParsedValue | ParsedValue[];
type MapCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => ParsedValue | ParsedValue[];


const TRANSFERABLE_PROPERTIES = [
    'hasItemOption', '_nameList', '_idList', '_invertedIndicesMap',
    '_rawData', '_chunkSize', '_chunkCount', '_dimValueGetter',
    '_count', '_rawCount', '_nameDimIdx', '_idDimIdx'
];
const CLONE_PROPERTIES = [
    '_extent', '_approximateExtent', '_rawExtent'
];

export interface DefaultDataVisual {
    style: PathStyleProps
    // Draw type determined which prop should be set with encoded color.
    // It's only available on the global visual. Use getVisual('drawType') to access it.
    // It will be set in visual/style.ts module in the first priority.
    drawType: 'fill' | 'stroke'

    symbol?: string
    symbolSize?: number | number[]
    symbolRotate?: number
    symbolKeepAspect?: boolean

    liftZ?: number
    // For legend.
    legendSymbol?: string

    // visualMap will inject visualMeta data
    visualMeta?: VisualMeta[]

    // If color is encoded from palette
    colorFromPalette?: boolean
}

export interface DataCalculationInfo<SERIES_MODEL> {
    stackedDimension: string;
    stackedByDimension: string;
    isStackedByIndex: boolean;
    stackedOverDimension: string;
    stackResultDimension: string;
    stackedOnSeries?: SERIES_MODEL;
}

// -----------------------------
// Internal method declarations:
// -----------------------------
let defaultDimValueGetters: {[sourceFormat: string]: DimValueGetter};
let prepareInvertedIndex: (list: List) => void;
let getRawValueFromStore: (list: List, dimIndex: number, rawIndex: number) => ParsedValue | OrdinalRawValue;
let getIndicesCtor: (list: List) => DataArrayLikeConstructor;
let prepareChunks: (
    storage: DataStorage, dimInfo: DataDimensionInfo, chunkSize: number, chunkCount: number, end: number
) => void;
let getRawIndexWithoutIndices: (this: List, idx: number) => number;
let getRawIndexWithIndices: (this: List, idx: number) => number;
let getId: (list: List, rawIndex: number) => string;
let normalizeDimensions: (dimensions: ItrParamDims) => Array<DimensionLoose>;
let validateDimensions: (list: List, dims: DimensionName[]) => void;
let cloneListForMapAndSample: (original: List, excludeDimensions: DimensionName[]) => List;
let cloneDimStore: (originalDimStore: DataValueChunk[]) => DataValueChunk[];
let getInitialExtent: () => [number, number];
let setItemDataAndSeriesIndex: (this: Element, child: Element) => void;
let transferProperties: (target: List, source: List) => void;

class List<
    HostModel extends Model = Model,
    Visual extends DefaultDataVisual = DefaultDataVisual
> {

    readonly type = 'list';

    readonly dimensions: string[];

    // Infomation of each data dimension, like data type.
    private _dimensionInfos: {[dimName: string]: DataDimensionInfo};

    readonly hostModel: HostModel;

    /**
     * @readonly
     */
    dataType: SeriesDataType;

    /**
     * @readonly
     * Host graph if List is used to store graph nodes / edges.
     */
    graph?: Graph;

    /**
     * @readonly
     * Host tree if List is used to store tree ndoes.
     */
    tree?: Tree;

    // Indices stores the indices of data subset after filtered.
    // This data subset will be used in chart.
    private _indices: ArrayLike<any>;

    private _count: number = 0;
    private _rawCount: number = 0;
    private _storage: DataStorage = {};
    private _storageArr: DataValueChunk[][] = [];
    private _nameList: string[] = [];
    private _idList: string[] = [];

    // Models of data option is stored sparse for optimizing memory cost
    // Never used yet (not used yet).
    // private _optionModels: Model[] = [];

    // Global visual properties after visual coding
    private _visual: Dictionary<any> = {};

    // Globel layout properties.
    private _layout: Dictionary<any> = {};

    // Item visual properties after visual coding
    private _itemVisuals: Dictionary<any>[] = [];

    // Item layout properties after layout
    private _itemLayouts: any[] = [];

    // Graphic elemnents
    private _graphicEls: Element[] = [];

    // Max size of each chunk.
    private _chunkSize: number = 1e5;

    private _chunkCount: number = 0;

    private _rawData: DataProvider;

    // Raw extent will not be cloned, but only transfered.
    // It will not be calculated util needed.
    private _rawExtent: {[dimName: string]: [number, number]} = {};

    private _extent: {[dimName: string]: [number, number]} = {};

    // key: dim, value: extent
    private _approximateExtent: {[dimName: string]: [number, number]} = {};

    private _dimensionsSummary: DimensionSummary;

    private _invertedIndicesMap: {[dimName: string]: ArrayLike<number>};

    private _calculationInfo: DataCalculationInfo<HostModel> = {} as DataCalculationInfo<HostModel>;

    // User output info of this data.
    // DO NOT use it in other places!
    // When preparing user params for user callbacks, we have
    // to clone these inner data structures to prevent users
    // from modifying them to effect built-in logic. And for
    // performance consideration we make this `userOutput` to
    // avoid clone them too many times.
    readonly userOutput: DimensionUserOuput;

    // If each data item has it's own option
    hasItemOption: boolean = true;

    // @readonly
    defaultDimValueGetter: DimValueGetter;
    private _dimValueGetter: DimValueGetter;
    private _dimValueGetterArrayRows: DimValueGetter;

    private _nameRepeatCount: NameRepeatCount;
    private _nameDimIdx: number;
    private _idDimIdx: number;

    private __wrappedMethods: string[];

    // Methods that create a new list based on this list should be listed here.
    // Notice that those method should `RETURN` the new list.
    TRANSFERABLE_METHODS = ['cloneShallow', 'downSample', 'map'] as const;
    // Methods that change indices of this list should be listed here.
    CHANGABLE_METHODS = ['filterSelf', 'selectRange'] as const;


    /**
     * @param dimensions
     *        For example, ['someDimName', {name: 'someDimName', type: 'someDimType'}, ...].
     *        Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
     */
    constructor(dimensions: Array<string | object | DataDimensionInfo>, hostModel: HostModel) {
        dimensions = dimensions || ['x', 'y'];

        const dimensionInfos: Dictionary<DataDimensionInfo> = {};
        const dimensionNames = [];
        const invertedIndicesMap: Dictionary<number[]> = {};

        for (let i = 0; i < dimensions.length; i++) {
            // Use the original dimensions[i], where other flag props may exists.
            const dimInfoInput = dimensions[i];

            const dimensionInfo: DataDimensionInfo =
                zrUtil.isString(dimInfoInput)
                ? new DataDimensionInfo({name: dimInfoInput})
                : !(dimInfoInput instanceof DataDimensionInfo)
                ? new DataDimensionInfo(dimInfoInput)
                : dimInfoInput;

            const dimensionName = dimensionInfo.name;
            dimensionInfo.type = dimensionInfo.type || 'float';
            if (!dimensionInfo.coordDim) {
                dimensionInfo.coordDim = dimensionName;
                dimensionInfo.coordDimIndex = 0;
            }

            dimensionInfo.otherDims = dimensionInfo.otherDims || {};
            dimensionNames.push(dimensionName);
            dimensionInfos[dimensionName] = dimensionInfo;

            dimensionInfo.index = i;

            if (dimensionInfo.createInvertedIndices) {
                invertedIndicesMap[dimensionName] = [];
            }
        }

        this.dimensions = dimensionNames;
        this._dimensionInfos = dimensionInfos;
        this.hostModel = hostModel;

        // Cache summary info for fast visit. See "dimensionHelper".
        this._dimensionsSummary = summarizeDimensions(this);

        this._invertedIndicesMap = invertedIndicesMap;

        this.userOutput = this._dimensionsSummary.userOutput;
    }

    /**
     * The meanings of the input parameter `dim`:
     *
     * + If dim is a number (e.g., `1`), it means the index of the dimension.
     *   For example, `getDimension(0)` will return 'x' or 'lng' or 'radius'.
     * + If dim is a number-like string (e.g., `"1"`):
     *     + If there is the same concrete dim name defined in `this.dimensions`, it means that concrete name.
     *     + If not, it will be converted to a number, which means the index of the dimension.
     *        (why? because of the backward compatbility. We have been tolerating number-like string in
     *        dimension setting, although now it seems that it is not a good idea.)
     *     For example, `visualMap[i].dimension: "1"` is the same meaning as `visualMap[i].dimension: 1`,
     *     if no dimension name is defined as `"1"`.
     * + If dim is a not-number-like string, it means the concrete dim name.
     *   For example, it can be be default name `"x"`, `"y"`, `"z"`, `"lng"`, `"lat"`, `"angle"`, `"radius"`,
     *   or customized in `dimensions` property of option like `"age"`.
     *
     * Get dimension name
     * @param dim See above.
     * @return Concrete dim name.
     */
    getDimension(dim: DimensionLoose): DimensionName {
        if (typeof dim === 'number'
            // If being a number-like string but not being defined a dimension name.
            || (!isNaN(dim as any) && !this._dimensionInfos.hasOwnProperty(dim))
        ) {
            dim = this.dimensions[dim as DimensionIndex];
        }
        return dim as DimensionName;
    }

    /**
     * Get type and calculation info of particular dimension
     * @param dim
     *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
     *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
     */
    getDimensionInfo(dim: DimensionLoose): DataDimensionInfo {
        // Do not clone, because there may be categories in dimInfo.
        return this._dimensionInfos[this.getDimension(dim)];
    }

    /**
     * concrete dimension name list on coord.
     */
    getDimensionsOnCoord(): DimensionName[] {
        return this._dimensionsSummary.dataDimsOnCoord.slice();
    }

    /**
     * @param coordDim
     * @param idx A coordDim may map to more than one data dim.
     *        If not specified, return the first dim not extra.
     * @return concrete data dim. If not found, return null/undefined
     */
    mapDimension(coordDim: DimensionName): DimensionName;
    mapDimension(coordDim: DimensionName, idx: number): DimensionName;
    mapDimension(coordDim: DimensionName, idx?: number): DimensionName {
        const dimensionsSummary = this._dimensionsSummary;

        if (idx == null) {
            return dimensionsSummary.encodeFirstDimNotExtra[coordDim] as any;
        }

        const dims = dimensionsSummary.encode[coordDim];
        return dims ? dims[idx as number] as any : null;
    }

    mapDimensionsAll(coordDim: DimensionName): DimensionName[] {
        const dimensionsSummary = this._dimensionsSummary;
        const dims = dimensionsSummary.encode[coordDim];
        return (dims || []).slice();
    }

    /**
     * Initialize from data
     * @param data source or data or data provider.
     * @param nameLIst The name of a datum is used on data diff and
     *        defualt label/tooltip.
     *        A name can be specified in encode.itemName,
     *        or dataItem.name (only for series option data),
     *        or provided in nameList from outside.
     */
    initData(
        data: any,
        nameList?: string[],
        dimValueGetter?: DimValueGetter
    ): void {

        const notProvider = isSourceInstance(data) || zrUtil.isArrayLike(data);
        if (notProvider) {
            data = new DefaultDataProvider(data, this.dimensions.length);
        }

        if (__DEV__) {
            if (!notProvider
                && (typeof data.getItem !== 'function' || typeof data.count !== 'function')
            ) {
                throw new Error('Inavlid data provider.');
            }
        }

        this._rawData = data;

        // Clear
        this._storage = {};
        this._storageArr = [];
        this._indices = null;

        this._nameList = nameList || [];

        this._idList = [];

        this._nameRepeatCount = {};

        if (!dimValueGetter) {
            this.hasItemOption = false;
        }

        this.defaultDimValueGetter = defaultDimValueGetters[
            this._rawData.getSource().sourceFormat
        ];
        // Default dim value getter
        this._dimValueGetter = dimValueGetter = dimValueGetter
            || this.defaultDimValueGetter;
        this._dimValueGetterArrayRows = defaultDimValueGetters.arrayRows;

        // Reset raw extent.
        this._rawExtent = {};

        this._initDataFromProvider(0, data.count());

        // If data has no item option.
        if (data.pure) {
            this.hasItemOption = false;
        }
    }

    getProvider(): DataProvider {
        return this._rawData;
    }

    /**
     * Caution: Can be only called on raw data (before `this._indices` created).
     */
    appendData(data: ArrayLike<any>): void {
        if (__DEV__) {
            zrUtil.assert(!this._indices, 'appendData can only be called on raw data.');
        }

        const rawData = this._rawData;
        const start = this.count();
        rawData.appendData(data);
        let end = rawData.count();
        if (!rawData.persistent) {
            end += start;
        }
        this._initDataFromProvider(start, end);
    }

    /**
     * Caution: Can be only called on raw data (before `this._indices` created).
     * This method does not modify `rawData` (`dataProvider`), but only
     * add values to storage.
     *
     * The final count will be increased by `Math.max(values.length, names.length)`.
     *
     * @param values That is the SourceType: 'arrayRows', like
     *        [
     *            [12, 33, 44],
     *            [NaN, 43, 1],
     *            ['-', 'asdf', 0]
     *        ]
     *        Each item is exaclty cooresponding to a dimension.
     */
    appendValues(values: any[][], names?: string[]): void {
        const chunkSize = this._chunkSize;
        const storage = this._storage;
        const storageArr = this._storageArr;
        const dimensions = this.dimensions;
        const dimLen = dimensions.length;
        const rawExtent = this._rawExtent;

        const start = this.count();
        const end = start + Math.max(values.length, names ? names.length : 0);
        const originalChunkCount = this._chunkCount;

        for (let i = 0; i < dimLen; i++) {
            const dim = dimensions[i];
            if (!rawExtent[dim]) {
                rawExtent[dim] = getInitialExtent();
            }
            if (!storage[dim]) {
                const store: DataValueChunk[] = [];
                storage[dim] = store;
                storageArr.push(store);
            }
            prepareChunks(storage, this._dimensionInfos[dim], chunkSize, originalChunkCount, end);
            this._chunkCount = storage[dim].length;
        }

        const rawExtentArr = zrUtil.map(dimensions, (dim) => {
            return rawExtent[dim];
        });

        const emptyDataItem = new Array(dimLen);
        for (let idx = start; idx < end; idx++) {
            const sourceIdx = idx - start;
            const chunkIndex = mathFloor(idx / chunkSize);
            const chunkOffset = idx % chunkSize;

            // Store the data by dimensions
            for (let dimIdx = 0; dimIdx < dimLen; dimIdx++) {
                const dim = dimensions[dimIdx];
                const val = this._dimValueGetterArrayRows(
                    values[sourceIdx] || emptyDataItem, dim, sourceIdx, dimIdx
                ) as ParsedValueNumeric;
                storageArr[dimIdx][chunkIndex][chunkOffset] = val;

                const dimRawExtent = rawExtentArr[dimIdx];
                val < dimRawExtent[0] && (dimRawExtent[0] = val);
                val > dimRawExtent[1] && (dimRawExtent[1] = val);
            }

            if (names) {
                this._nameList[idx] = names[sourceIdx];
            }
        }

        this._rawCount = this._count = end;

        // Reset data extent
        this._extent = {};

        prepareInvertedIndex(this);
    }

    private _initDataFromProvider(start: number, end: number): void {
        if (start >= end) {
            return;
        }

        const chunkSize = this._chunkSize;
        const rawData = this._rawData;
        const storage = this._storage;
        const storageArr = this._storageArr;
        const dimensions = this.dimensions;
        const dimLen = dimensions.length;
        const dimensionInfoMap = this._dimensionInfos;
        const nameList = this._nameList;
        const idList = this._idList;
        const rawExtent = this._rawExtent;
        const nameRepeatCount: NameRepeatCount = this._nameRepeatCount = {};
        let nameDimIdx;

        const originalChunkCount = this._chunkCount;

        for (let i = 0; i < dimLen; i++) {
            const dim = dimensions[i];
            if (!rawExtent[dim]) {
                rawExtent[dim] = getInitialExtent();
            }

            const dimInfo = dimensionInfoMap[dim];
            if (dimInfo.otherDims.itemName === 0) {
                nameDimIdx = this._nameDimIdx = i;
            }
            if (dimInfo.otherDims.itemId === 0) {
                this._idDimIdx = i;
            }

            if (!storage[dim]) {
                const store: DataValueChunk[] = [];
                storage[dim] = store;
                storageArr.push(store);
            }

            prepareChunks(storage, dimInfo, chunkSize, originalChunkCount, end);

            this._chunkCount = storage[dim].length;
        }

        const rawExtentArr = zrUtil.map(dimensions, (dim) => {
            return rawExtent[dim];
        });

        let dataItem = [] as OptionDataItem;
        for (let idx = start; idx < end; idx++) {
            // NOTICE: Try not to write things into dataItem
            dataItem = rawData.getItem(idx, dataItem);
            // Each data item is value
            // [1, 2]
            // 2
            // Bar chart, line chart which uses category axis
            // only gives the 'y' value. 'x' value is the indices of category
            // Use a tempValue to normalize the value to be a (x, y) value
            const chunkIndex = mathFloor(idx / chunkSize);
            const chunkOffset = idx % chunkSize;

            // Store the data by dimensions
            for (let dimIdx = 0; dimIdx < dimLen; dimIdx++) {
                const dim = dimensions[dimIdx];
                const dimStorage = storageArr[dimIdx][chunkIndex];
                // PENDING NULL is empty or zero
                const val = this._dimValueGetter(dataItem, dim, idx, dimIdx) as ParsedValueNumeric;
                dimStorage[chunkOffset] = val;

                const dimRawExtent = rawExtentArr[dimIdx];
                val < dimRawExtent[0] && (dimRawExtent[0] = val);
                val > dimRawExtent[1] && (dimRawExtent[1] = val);
            }

            // ??? FIXME not check by pure but sourceFormat?
            // TODO refactor these logic.
            if (!rawData.pure) {
                let name: string = nameList[idx];

                if (dataItem && name == null) {
                    // If dataItem is {name: ...}, it has highest priority.
                    // That is appropriate for many common cases.
                    if ((dataItem as any).name != null) {
                        // There is no other place to persistent dataItem.name,
                        // so save it to nameList.
                        nameList[idx] = name = convertOptionIdName((dataItem as any).name, null);
                    }
                    else if (nameDimIdx != null) {
                        const nameDim = dimensions[nameDimIdx];
                        const nameDimChunk = storage[nameDim][chunkIndex];
                        if (nameDimChunk) {
                            const ordinalMeta = dimensionInfoMap[nameDim].ordinalMeta;
                            name = convertOptionIdName(
                                (ordinalMeta && ordinalMeta.categories.length)
                                    ? ordinalMeta.categories[nameDimChunk[chunkOffset] as number]
                                    : nameDimChunk[chunkOffset],
                                null
                            );
                        }
                    }
                }

                // Try using the id in option
                // id or name is used on dynamical data, mapping old and new items.
                let id: string = dataItem == null ? null : convertOptionIdName((dataItem as any).id, null);

                if (id == null && name != null) {
                    // Use name as id and add counter to avoid same name
                    nameRepeatCount[name] = nameRepeatCount[name] || 0;
                    id = name;
                    if (nameRepeatCount[name] > 0) {
                        id += '__ec__' + nameRepeatCount[name];
                    }
                    nameRepeatCount[name]++;
                }
                id != null && (idList[idx] = id);
            }
        }

        if (!rawData.persistent && rawData.clean) {
            // Clean unused data if data source is typed array.
            rawData.clean();
        }

        this._rawCount = this._count = end;

        // Reset data extent
        this._extent = {};

        prepareInvertedIndex(this);
    }

    count(): number {
        return this._count;
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
            const Ctor = getIndicesCtor(this);
            newIndices = new Ctor(this.count());
            for (let i = 0; i < newIndices.length; i++) {
                newIndices[i] = i;
            }
        }

        return newIndices;
    }

    // Get data by index of dimension.
    // Because in v8 access array by number variable is faster than access object by string variable
    // Not sure why but the optimization just works.
    getByDimIdx(dimIdx: number, idx: number): ParsedValue {
        if (!(idx >= 0 && idx < this._count)) {
            return NaN;
        }

        const dimStore = this._storageArr[dimIdx];
        const chunkSize = this._chunkSize;
        if (!dimStore) {
            return NaN;
        }
        idx = this.getRawIndex(idx);

        const chunkIndex = mathFloor(idx / chunkSize);
        const chunkOffset = idx % chunkSize;

        return dimStore[chunkIndex][chunkOffset];
    }

    /**
     * Get value. Return NaN if idx is out of range.
     * @param dim Dim must be concrete name.
     */
    get(dim: DimensionName, idx: number): ParsedValue {
        if (!(idx >= 0 && idx < this._count)) {
            return NaN;
        }
        const dimStore = this._storage[dim];
        const chunkSize = this._chunkSize;
        if (!dimStore) {
            return NaN;
        }

        idx = this.getRawIndex(idx);

        const chunkIndex = mathFloor(idx / chunkSize);
        const chunkOffset = idx % chunkSize;

        return dimStore[chunkIndex][chunkOffset];
    }

    /**
     * @param dim concrete dim
     */
    getByRawIndex(dim: DimensionName, rawIdx: number): ParsedValue {
        if (!(rawIdx >= 0 && rawIdx < this._rawCount)) {
            return NaN;
        }
        const dimStore = this._storage[dim];
        const chunkSize = this._chunkSize;
        if (!dimStore) {
            // TODO Warn ?
            return NaN;
        }

        const chunkIndex = mathFloor(rawIdx / chunkSize);
        const chunkOffset = rawIdx % chunkSize;
        const chunkStore = dimStore[chunkIndex];
        return chunkStore[chunkOffset];
    }

    /**
     * FIXME Use `get` on chrome maybe slow(in filterSelf and selectRange).
     * Hack a much simpler _getFast
     */
    private _getFast(dimIdx: number, rawIdx: number): ParsedValue {
        const chunkSize = this._chunkSize;
        const chunkIndex = mathFloor(rawIdx / chunkSize);
        const chunkOffset = rawIdx % chunkSize;
        return this._storageArr[dimIdx][chunkIndex][chunkOffset];
    }

    /**
     * Get value for multi dimensions.
     * @param dimensions If ignored, using all dimensions.
     */
    getValues(idx: number): ParsedValue[];
    getValues(dimensions: readonly DimensionName[], idx: number): ParsedValue[];
    getValues(dimensions: readonly DimensionName[] | number, idx?: number): ParsedValue[] {
        const values = [];

        if (!zrUtil.isArray(dimensions)) {
            // stack = idx;
            idx = dimensions as number;
            dimensions = this.dimensions;
        }

        for (let i = 0, len = dimensions.length; i < len; i++) {
            values.push(this.get(dimensions[i], idx /*, stack */));
        }

        return values;
    }

    /**
     * If value is NaN. Inlcuding '-'
     * Only check the coord dimensions.
     */
    hasValue(idx: number): boolean {
        const dataDimsOnCoord = this._dimensionsSummary.dataDimsOnCoord;
        for (let i = 0, len = dataDimsOnCoord.length; i < len; i++) {
            // Ordinal type originally can be string or number.
            // But when an ordinal type is used on coord, it can
            // not be string but only number. So we can also use isNaN.
            if (isNaN(this.get(dataDimsOnCoord[i], idx) as any)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get extent of data in one dimension
     */
    getDataExtent(dim: DimensionLoose): [number, number] {
        // Make sure use concrete dim as cache name.
        dim = this.getDimension(dim);
        const dimData = this._storage[dim];
        const initialExtent = getInitialExtent();
        const chunkSize = this._chunkSize;

        // stack = !!((stack || false) && this.getCalculationInfo(dim));

        if (!dimData) {
            return initialExtent;
        }

        // Make more strict checkings to ensure hitting cache.
        const currEnd = this.count();
        // let cacheName = [dim, !!stack].join('_');
        // let cacheName = dim;

        // Consider the most cases when using data zoom, `getDataExtent`
        // happened before filtering. We cache raw extent, which is not
        // necessary to be cleared and recalculated when restore data.
        const useRaw = !this._indices; // && !stack;
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
            const chunkIndex = mathFloor(rawIdx / chunkSize);
            const chunkOffset = rawIdx % chunkSize;
            const value = dimData[chunkIndex][chunkOffset] as ParsedValueNumeric;
            value < min && (min = value);
            value > max && (max = value);
        }

        dimExtent = [min, max];

        this._extent[dim] = dimExtent;

        return dimExtent;
    }

    /**
     * PENDING: In fact currently this function is only used to short-circuit
     * the calling of `scale.unionExtentFromData` when data have been filtered by modules
     * like "dataZoom". `scale.unionExtentFromData` is used to calculate data extent for series on
     * an axis, but if a "axis related data filter module" is used, the extent of the axis have
     * been fixed and no need to calling `scale.unionExtentFromData` actually.
     * But if we add "custom data filter" in future, which is not "axis related", this method may
     * be still needed.
     *
     * Optimize for the scenario that data is filtered by a given extent.
     * Consider that if data amount is more than hundreds of thousand,
     * extent calculation will cost more than 10ms and the cache will
     * be erased because of the filtering.
     */
    getApproximateExtent(dim: DimensionLoose): [number, number] {
        dim = this.getDimension(dim);
        return this._approximateExtent[dim] || this.getDataExtent(dim);
    }

    /**
     * Calculate extent on a filtered data might be time consuming.
     * Approximate extent is only used for: calculte extent of filtered data outside.
     */
    setApproximateExtent(extent: [number, number], dim: DimensionLoose): void {
        dim = this.getDimension(dim);
        this._approximateExtent[dim] = extent.slice() as [number, number];
    }

    getCalculationInfo<CALC_INFO_KEY extends keyof DataCalculationInfo<HostModel>>(
        key: CALC_INFO_KEY
    ): DataCalculationInfo<HostModel>[CALC_INFO_KEY] {
        return this._calculationInfo[key];
    }

    /**
     * @param key or k-v object
     */
    setCalculationInfo(
        key: DataCalculationInfo<HostModel>
    ): void;
    setCalculationInfo<CALC_INFO_KEY extends keyof DataCalculationInfo<HostModel>>(
        key: CALC_INFO_KEY,
        value: DataCalculationInfo<HostModel>[CALC_INFO_KEY]
    ): void;
    setCalculationInfo(
        key: (keyof DataCalculationInfo<HostModel>) | DataCalculationInfo<HostModel>,
        value?: DataCalculationInfo<HostModel>[keyof DataCalculationInfo<HostModel>]
    ): void {
        isObject(key)
            ? zrUtil.extend(this._calculationInfo, key as object)
            : ((this._calculationInfo as any)[key] = value);
    }

    /**
     * Get sum of data in one dimension
     */
    getSum(dim: DimensionName): number {
        const dimData = this._storage[dim];
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
    getMedian(dim: DimensionLoose): number {
        const dimDataArray: ParsedValue[] = [];
        // map all data of one dimension
        this.each(dim, function (val) {
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

    // /**
    //  * Retreive the index with given value
    //  * @param {string} dim Concrete dimension.
    //  * @param {number} value
    //  * @return {number}
    //  */
    // Currently incorrect: should return dataIndex but not rawIndex.
    // Do not fix it until this method is to be used somewhere.
    // FIXME Precision of float value
    // indexOf(dim, value) {
    //     let storage = this._storage;
    //     let dimData = storage[dim];
    //     let chunkSize = this._chunkSize;
    //     if (dimData) {
    //         for (let i = 0, len = this.count(); i < len; i++) {
    //             let chunkIndex = mathFloor(i / chunkSize);
    //             let chunkOffset = i % chunkSize;
    //             if (dimData[chunkIndex][chunkOffset] === value) {
    //                 return i;
    //             }
    //         }
    //     }
    //     return -1;
    // }

    /**
     * Only support the dimension which inverted index created.
     * Do not support other cases until required.
     * @param dim concrete dim
     * @param value ordinal index
     * @return rawIndex
     */
    rawIndexOf(dim: DimensionName, value: OrdinalNumber): number {
        const invertedIndices = dim && this._invertedIndicesMap[dim];
        if (__DEV__) {
            if (!invertedIndices) {
                throw new Error('Do not supported yet');
            }
        }
        const rawIndex = invertedIndices[value];
        if (rawIndex == null || isNaN(rawIndex)) {
            return INDEX_NOT_FOUND;
        }
        return rawIndex;
    }

    /**
     * Retreive the index with given name
     */
    indexOfName(name: string): number {
        for (let i = 0, len = this.count(); i < len; i++) {
            if (this.getName(i) === name) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Retreive the index with given raw data index
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
     * Retreive the index of nearest value
     * @param dim
     * @param value
     * @param [maxDistance=Infinity]
     * @return If and only if multiple indices has
     *         the same value, they are put to the result.
     */
    indicesOfNearest(
        dim: DimensionName, value: number, maxDistance?: number
    ): number[] {
        const storage = this._storage;
        const dimData = storage[dim];
        const nearestIndices: number[] = [];
        const chunkSize = this._chunkSize;

        if (!dimData) {
            return nearestIndices;
        }

        if (maxDistance == null) {
            maxDistance = Infinity;
        }

        let minDist = Infinity;
        let minDiff = -1;
        let nearestIndicesLen = 0;


        // Check the test case of `test/ut/spec/data/List.js`.
        for (let i = 0, len = this.count(); i < len; i++) {
            const chunkIndex = mathFloor(i / chunkSize);
            const chunkOffset = i % chunkSize;
            const diff = value - (dimData[chunkIndex][chunkOffset] as number);
            const dist = Math.abs(diff);
            if (dist <= maxDistance) {
                // When the `value` is at the middle of `this.get(dim, i)` and `this.get(dim, i+1)`,
                // we'd better not push both of them to `nearestIndices`, otherwise it is easy to
                // get more than one item in `nearestIndices` (more specifically, in `tooltip`).
                // So we chose the one that `diff >= 0` in this csae.
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

    /**
     * Get raw data index.
     * Do not initialize.
     * Default `getRawIndex`. And it can be changed.
     */
    getRawIndex: (idx: number) => number = getRawIndexWithoutIndices;

    /**
     * Get raw data item
     */
    getRawDataItem(idx: number): OptionDataItem {
        if (!this._rawData.persistent) {
            const val = [];
            for (let i = 0; i < this.dimensions.length; i++) {
                const dim = this.dimensions[i];
                val.push(this.get(dim, idx));
            }
            return val;
        }
        else {
            return this._rawData.getItem(this.getRawIndex(idx));
        }
    }

    /**
     * @return Never be null/undefined. `number` will be converted to string. Becuase:
     * In most cases, name is used in display, where returning a string is more convenient.
     * In other cases, name is used in query (see `indexOfName`), where we can keep the
     * rule that name `2` equals to name `'2'`.
     */
    getName(idx: number): string {
        const rawIndex = this.getRawIndex(idx);
        return this._nameList[rawIndex]
            || convertOptionIdName(getRawValueFromStore(this, this._nameDimIdx, rawIndex), '')
            || '';
    }

    /**
     * @return Never null/undefined. `number` will be converted to string. Becuase:
     * In all cases having encountered at present, id is used in making diff comparison, which
     * are usually based on hash map. We can keep the rule that the internal id are always string
     * (treat `2` is the same as `'2'`) to make the related logic simple.
     */
    getId(idx: number): string {
        return getId(this, this.getRawIndex(idx));
    }

    /**
     * Data iteration
     * @param ctx default this
     * @example
     *  list.each('x', function (x, idx) {});
     *  list.each(['x', 'y'], function (x, y, idx) {});
     *  list.each(function (idx) {})
     */
    each<Ctx>(cb: EachCb0<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    each<Ctx>(dims: DimensionLoose, cb: EachCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    each<Ctx>(dims: [DimensionLoose], cb: EachCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    each<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: EachCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    each<Ctx>(dims: ItrParamDims, cb: EachCb<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    each<Ctx>(
        dims: ItrParamDims | EachCb<Ctx>,
        cb: EachCb<Ctx> | Ctx,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): void {
        'use strict';

        if (!this._count) {
            return;
        }

        if (typeof dims === 'function') {
            ctxCompat = ctx;
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        const dimNames = zrUtil.map(normalizeDimensions(dims), this.getDimension, this);

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }

        const dimSize = dimNames.length;
        const dimIndices = zrUtil.map(dimNames, (dimName) => {
            return this._dimensionInfos[dimName].index;
        });

        for (let i = 0; i < this.count(); i++) {
            // Simple optimization
            switch (dimSize) {
                case 0:
                    (cb as EachCb0<Ctx>).call(fCtx, i);
                    break;
                case 1:
                    (cb as EachCb1<Ctx>).call(fCtx, this._getFast(dimIndices[0], i), i);
                    break;
                case 2:
                    (cb as EachCb2<Ctx>).call(
                        fCtx, this._getFast(dimIndices[0], i), this._getFast(dimIndices[1], i), i
                    );
                    break;
                default:
                    let k = 0;
                    const value = [];
                    for (; k < dimSize; k++) {
                        value[k] = this._getFast(dimIndices[k], i);
                    }
                    // Index
                    value[k] = i;
                    (cb as EachCb<Ctx>).apply(fCtx, value);
            }
        }
    }

    /**
     * Data filter
     */
    filterSelf<Ctx>(cb: FilterCb0<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(dims: DimensionLoose, cb: FilterCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(dims: [DimensionLoose], cb: FilterCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: FilterCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(dims: ItrParamDims, cb: FilterCb<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(
        dims: ItrParamDims | FilterCb<Ctx>,
        cb: FilterCb<Ctx> | Ctx,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): List {
        'use strict';

        if (!this._count) {
            return;
        }

        if (typeof dims === 'function') {
            ctxCompat = ctx;
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        const dimNames = zrUtil.map(
            normalizeDimensions(dims), this.getDimension, this
        );

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }


        const count = this.count();
        const Ctor = getIndicesCtor(this);
        const newIndices = new Ctor(count);
        const value = [];
        const dimSize = dimNames.length;

        let offset = 0;
        const dimIndices = zrUtil.map(dimNames, (dimName) => {
            return this._dimensionInfos[dimName].index;
        });
        const dim0 = dimIndices[0];

        for (let i = 0; i < count; i++) {
            let keep;
            const rawIdx = this.getRawIndex(i);
            // Simple optimization
            if (dimSize === 0) {
                keep = (cb as FilterCb0<Ctx>).call(fCtx, i);
            }
            else if (dimSize === 1) {
                const val = this._getFast(dim0, rawIdx);
                keep = (cb as FilterCb1<Ctx>).call(fCtx, val, i);
            }
            else {
                let k = 0;
                for (; k < dimSize; k++) {
                    value[k] = this._getFast(dimIndices[k], rawIdx);
                }
                value[k] = i;
                keep = (cb as FilterCb<Ctx>).apply(fCtx, value);
            }
            if (keep) {
                newIndices[offset++] = rawIdx;
            }
        }

        // Set indices after filtered.
        if (offset < count) {
            this._indices = newIndices;
        }
        this._count = offset;
        // Reset data extent
        this._extent = {};

        this.getRawIndex = this._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

        return this;
    }

    /**
     * Select data in range. (For optimization of filter)
     * (Manually inline code, support 5 million data filtering in data zoom.)
     */
    selectRange(range: {[dimName: string]: [number, number]}): List {
        'use strict';

        if (!this._count) {
            return;
        }

        const dimensions = [];
        for (const dim in range) {
            if (range.hasOwnProperty(dim)) {
                dimensions.push(dim);
            }
        }

        if (__DEV__) {
            validateDimensions(this, dimensions);
        }

        const dimSize = dimensions.length;
        if (!dimSize) {
            return;
        }

        const originalCount = this.count();
        const Ctor = getIndicesCtor(this);
        const newIndices = new Ctor(originalCount);

        let offset = 0;
        const dim0 = dimensions[0];
        const dimIndices = zrUtil.map(dimensions, (dimName) => {
            return this._dimensionInfos[dimName].index;
        });

        const min = range[dim0][0];
        const max = range[dim0][1];

        let quickFinished = false;
        if (!this._indices) {
            // Extreme optimization for common case. About 2x faster in chrome.
            let idx = 0;
            if (dimSize === 1) {
                const dimStorage = this._storage[dim0];
                for (let k = 0; k < this._chunkCount; k++) {
                    const chunkStorage = dimStorage[k];
                    const len = Math.min(this._count - k * this._chunkSize, this._chunkSize);
                    for (let i = 0; i < len; i++) {
                        const val = chunkStorage[i];
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
                }
                quickFinished = true;
            }
            else if (dimSize === 2) {
                const dimStorage = this._storage[dim0];
                const dimStorage2 = this._storage[dimensions[1]];
                const min2 = range[dimensions[1]][0];
                const max2 = range[dimensions[1]][1];
                for (let k = 0; k < this._chunkCount; k++) {
                    const chunkStorage = dimStorage[k];
                    const chunkStorage2 = dimStorage2[k];
                    const len = Math.min(this._count - k * this._chunkSize, this._chunkSize);
                    for (let i = 0; i < len; i++) {
                        const val = chunkStorage[i];
                        const val2 = chunkStorage2[i];
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
                }
                quickFinished = true;
            }
        }
        if (!quickFinished) {
            if (dimSize === 1) {
                for (let i = 0; i < originalCount; i++) {
                    const rawIndex = this.getRawIndex(i);
                    const val = this._getFast(dimIndices[0], rawIndex);
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
                    const rawIndex = this.getRawIndex(i);
                    for (let k = 0; k < dimSize; k++) {
                        const dimk = dimensions[k];
                        const val = this._getFast(dimIndices[k], rawIndex);
                        // Do not filter NaN, see comment above.
                        if (val < range[dimk][0] || val > range[dimk][1]) {
                            keep = false;
                        }
                    }
                    if (keep) {
                        newIndices[offset++] = this.getRawIndex(i);
                    }
                }
            }
        }

        // Set indices after filtered.
        if (offset < originalCount) {
            this._indices = newIndices;
        }
        this._count = offset;
        // Reset data extent
        this._extent = {};

        this.getRawIndex = this._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

        return this;
    }

    /**
     * Data mapping to a plain array
     */
    mapArray<Ctx, Cb extends MapArrayCb0<Ctx>>(cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    /* eslint-disable */
    mapArray<Ctx, Cb extends MapArrayCb1<Ctx>>(dims: DimensionLoose, cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb1<Ctx>>(dims: [DimensionLoose], cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb2<Ctx>>(dims: [DimensionLoose, DimensionLoose], cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb<Ctx>>(dims: ItrParamDims, cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    /* eslint-enable */
    mapArray<Ctx>(
        dims: ItrParamDims | MapArrayCb<Ctx>,
        cb: MapArrayCb<Ctx> | Ctx,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): any[] {
        'use strict';

        if (typeof dims === 'function') {
            ctxCompat = ctx;
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        ctx = (ctx || ctxCompat || this) as Ctx;

        const result: any[] = [];
        this.each(dims, function () {
            result.push(cb && (cb as MapArrayCb<Ctx>).apply(this, arguments));
        }, ctx);
        return result;
    }

    /**
     * Data mapping to a new List with given dimensions
     */
    map<Ctx>(dims: DimensionLoose, cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List<HostModel>;
    map<Ctx>(dims: [DimensionLoose], cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List<HostModel>;
    map<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: MapCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List<HostModel>;
    map<Ctx>(
        dims: ItrParamDims,
        cb: MapCb<Ctx>,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): List {
        'use strict';

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        const dimNames = zrUtil.map(
            normalizeDimensions(dims), this.getDimension, this
        );

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }

        const list = cloneListForMapAndSample(this, dimNames);

        // Following properties are all immutable.
        // So we can reference to the same value
        list._indices = this._indices;
        list.getRawIndex = list._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

        const storage = list._storage;

        const tmpRetValue = [];
        const chunkSize = this._chunkSize;
        const dimSize = dimNames.length;
        const dataCount = this.count();
        const values = [];
        const rawExtent = list._rawExtent;

        for (let dataIndex = 0; dataIndex < dataCount; dataIndex++) {
            for (let dimIndex = 0; dimIndex < dimSize; dimIndex++) {
                values[dimIndex] = this.get(dimNames[dimIndex], dataIndex);
            }
            values[dimSize] = dataIndex;

            let retValue = cb && cb.apply(fCtx, values);
            if (retValue != null) {
                // a number or string (in oridinal dimension)?
                if (typeof retValue !== 'object') {
                    tmpRetValue[0] = retValue;
                    retValue = tmpRetValue;
                }

                const rawIndex = this.getRawIndex(dataIndex);
                const chunkIndex = mathFloor(rawIndex / chunkSize);
                const chunkOffset = rawIndex % chunkSize;

                for (let i = 0; i < retValue.length; i++) {
                    const dim = dimNames[i];
                    const val = retValue[i];
                    const rawExtentOnDim = rawExtent[dim];

                    const dimStore = storage[dim];
                    if (dimStore) {
                        dimStore[chunkIndex][chunkOffset] = val;
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

        return list;
    }

    /**
     * Large data down sampling on given dimension
     * @param sampleIndex Sample index for name and id
     */
    downSample(
        dimension: DimensionName,
        rate: number,
        sampleValue: (frameValues: ArrayLike<ParsedValue>) => ParsedValueNumeric,
        sampleIndex: (frameValues: ArrayLike<ParsedValue>, value: ParsedValueNumeric) => number
    ): List<HostModel> {
        const list = cloneListForMapAndSample(this, [dimension]);
        const targetStorage = list._storage;

        const frameValues = [];
        let frameSize = mathFloor(1 / rate);

        const dimStore = targetStorage[dimension];
        const len = this.count();
        const chunkSize = this._chunkSize;
        const rawExtentOnDim = list._rawExtent[dimension];

        const newIndices = new (getIndicesCtor(this))(len);

        let offset = 0;
        for (let i = 0; i < len; i += frameSize) {
            // Last frame
            if (frameSize > len - i) {
                frameSize = len - i;
                frameValues.length = frameSize;
            }
            for (let k = 0; k < frameSize; k++) {
                const dataIdx = this.getRawIndex(i + k);
                const originalChunkIndex = mathFloor(dataIdx / chunkSize);
                const originalChunkOffset = dataIdx % chunkSize;
                frameValues[k] = dimStore[originalChunkIndex][originalChunkOffset];
            }
            const value = sampleValue(frameValues);
            const sampleFrameIdx = this.getRawIndex(
                Math.min(i + sampleIndex(frameValues, value) || 0, len - 1)
            );
            const sampleChunkIndex = mathFloor(sampleFrameIdx / chunkSize);
            const sampleChunkOffset = sampleFrameIdx % chunkSize;
            // Only write value on the filtered data
            dimStore[sampleChunkIndex][sampleChunkOffset] = value;

            if (value < rawExtentOnDim[0]) {
                rawExtentOnDim[0] = value;
            }
            if (value > rawExtentOnDim[1]) {
                rawExtentOnDim[1] = value;
            }

            newIndices[offset++] = sampleFrameIdx;
        }

        list._count = offset;
        list._indices = newIndices;

        list.getRawIndex = getRawIndexWithIndices;

        return list as List<HostModel>;
    }

    /**
     * Large data down sampling using largest-triangle-three-buckets
     * https://github.com/pingec/downsample-lttb
     * @param {string} baseDimension
     * @param {string} valueDimension
     * @param {number} threshold target counts
     */
    lttbDownSample(
        baseDimension: DimensionName,
        valueDimension: DimensionName,
        threshold: number
    ) {
        const list = cloneListForMapAndSample(this, [baseDimension, valueDimension]);
        const targetStorage = list._storage;
        const baseDimStore = targetStorage[baseDimension];
        const valueDimStore = targetStorage[valueDimension];
        const len = this.count();
        const chunkSize = this._chunkSize;
        const newIndices = new (getIndicesCtor(this))(len);
        const getPair = (
            i: number
            ) : Array<any> => {
            const originalChunkIndex = mathFloor(i / chunkSize);
            const originalChunkOffset = i % chunkSize;
            return [
                baseDimStore[originalChunkIndex][originalChunkOffset],
                valueDimStore[originalChunkIndex][originalChunkOffset]
            ];
        };

        let sampledIndex = 0;

        const every = (len - 2) / (threshold - 2);

        let a = 0;
        let maxArea;
        let area;
        let nextA;

        newIndices[sampledIndex++] = a;
        for (let i = 0; i < threshold - 2; i++) {

            let avgX = 0;
            let avgY = 0;
            let avgRangeStart = mathFloor((i + 1) * every) + 1;
            let avgRangeEnd = mathFloor((i + 2) * every) + 1;

            avgRangeEnd = avgRangeEnd < len ? avgRangeEnd : len;

            const avgRangeLength = avgRangeEnd - avgRangeStart;

            for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
                avgX += getPair(avgRangeStart)[0] * 1; // * 1 enforces Number (value may be Date)
                avgY += getPair(avgRangeStart)[1] * 1;
            }
            avgX /= avgRangeLength;
            avgY /= avgRangeLength;

            // Get the range for this bucket
            let rangeOffs = mathFloor((i + 0) * every) + 1;
                const rangeTo = mathFloor((i + 1) * every) + 1;

            // Point a
            const pointAX = getPair(a)[0] * 1; // enforce Number (value may be Date)
                const pointAY = getPair(a)[1] * 1;

            maxArea = area = -1;

            for (; rangeOffs < rangeTo; rangeOffs++) {
                // Calculate triangle area over three buckets
                area = Math.abs((pointAX - avgX) * (getPair(rangeOffs)[1] - pointAY)
                            - (pointAX - getPair(rangeOffs)[0]) * (avgY - pointAY)
                        ) * 0.5;
                if (area > maxArea) {
                    maxArea = area;
                    nextA = rangeOffs; // Next a is this b
                }
            }

            newIndices[sampledIndex++] = nextA;

            a = nextA; // This a is the next a (chosen b)
        }

        newIndices[sampledIndex++] = len - 1;
        list._count = sampledIndex;
        list._indices = newIndices;

        list.getRawIndex = getRawIndexWithIndices;
        return list;
    }


    /**
     * Get model of one data item.
     */
    // TODO: Type of data item
    getItemModel<ItemOpts extends unknown = unknown>(idx: number): Model<ItemOpts
        // Extract item option with value key. FIXME will cause incompatitable issue
        // Extract<HostModel['option']['data'][number], { value?: any }>
    > {
        const hostModel = this.hostModel;
        const dataItem = this.getRawDataItem(idx) as ModelOption;
        return new Model(dataItem, hostModel, hostModel && hostModel.ecModel);
    }

    /**
     * Create a data differ
     */
    diff(otherList: List): DataDiffer {
        const thisList = this;

        return new DataDiffer(
            otherList ? otherList.getIndices() : [],
            this.getIndices(),
            function (idx: number) {
                return getId(otherList, idx);
            },
            function (idx: number) {
                return getId(thisList, idx);
            }
        );
    }

    /**
     * Get visual property.
     */
    getVisual<K extends keyof Visual>(key: K): Visual[K] {
        const visual = this._visual as Visual;
        return visual && visual[key];
    }

    /**
     * Set visual property
     *
     * @example
     *  setVisual('color', color);
     *  setVisual({
     *      'color': color
     *  });
     */
    setVisual<K extends keyof Visual>(key: K, val: Visual[K]): void;
    setVisual(kvObj: Partial<Visual>): void;
    setVisual(kvObj: string | Partial<Visual>, val?: any): void {
        this._visual = this._visual || {};
        if (isObject(kvObj)) {
            zrUtil.extend(this._visual, kvObj);
        }
        else {
            this._visual[kvObj as string] = val;
        }
    }

    /**
     * Get visual property of single data item
     */
    // eslint-disable-next-line
    getItemVisual<K extends keyof Visual>(idx: number, key: K): Visual[K] {
        const itemVisual = this._itemVisuals[idx] as Visual;
        const val = itemVisual && itemVisual[key];
        if (val == null) {
            // Use global visual property
            return this.getVisual(key);
        }
        return val;
    }

    /**
     * Make sure itemVisual property is unique
     */
    // TODO: use key to save visual to reduce memory.
    // eslint-disable-next-line
    ensureUniqueItemVisual<K extends keyof Visual>(idx: number, key: K): Visual[K] {
        const itemVisuals = this._itemVisuals;
        let itemVisual = itemVisuals[idx] as Visual;
        if (!itemVisual) {
            itemVisual = itemVisuals[idx] = {} as Visual;
        }
        let val = itemVisual[key];
        if (!val) {
            val = this.getVisual(key);

            // TODO Performance?
            if (zrUtil.isArray(val)) {
                val = val.slice() as unknown as Visual[K];
            }
            else if (isObject(val)) {
                val = zrUtil.extend({}, val);
            }

            itemVisual[key] = val;
        }
        return val;
    }
    /**
     * Set visual property of single data item
     *
     * @param {number} idx
     * @param {string|Object} key
     * @param {*} [value]
     *
     * @example
     *  setItemVisual(0, 'color', color);
     *  setItemVisual(0, {
     *      'color': color
     *  });
     */
    // eslint-disable-next-line
    setItemVisual<K extends keyof Visual>(idx: number, key: K, value: Visual[K]): void;
    setItemVisual(idx: number, kvObject: Partial<Visual>): void;
    // eslint-disable-next-line
    setItemVisual<K extends keyof Visual>(idx: number, key: K | Partial<Visual>, value?: Visual[K]): void {
        const itemVisual = this._itemVisuals[idx] || {};
        this._itemVisuals[idx] = itemVisual;

        if (isObject(key)) {
            zrUtil.extend(itemVisual, key);
        }
        else {
            itemVisual[key as string] = value;
        }
    }

    /**
     * Clear itemVisuals and list visual.
     */
    clearAllVisual(): void {
        this._visual = {};
        this._itemVisuals = [];
    }

    /**
     * Set layout property.
     */
    setLayout(key: string, val: any): void;
    setLayout(kvObj: Dictionary<any>): void;
    setLayout(key: string | Dictionary<any>, val?: any): void {
        if (isObject(key)) {
            for (const name in key) {
                if (key.hasOwnProperty(name)) {
                    this.setLayout(name, key[name]);
                }
            }
            return;
        }
        this._layout[key] = val;
    }

    /**
     * Get layout property.
     */
    getLayout(key: string): any {
        return this._layout[key];
    }

    /**
     * Get layout of single data item
     */
    getItemLayout(idx: number): any {
        return this._itemLayouts[idx];
    }

    /**
     * Set layout of single data item
     */
    setItemLayout<M = false>(
        idx: number,
        layout: (M extends true ? Dictionary<any> : any),
        merge?: M
    ): void {
        this._itemLayouts[idx] = merge
            ? zrUtil.extend(this._itemLayouts[idx] || {}, layout)
            : layout;
    }

    /**
     * Clear all layout of single data item
     */
    clearItemLayouts(): void {
        this._itemLayouts.length = 0;
    }

    /**
     * Set graphic element relative to data. It can be set as null
     */
    setItemGraphicEl(idx: number, el: Element): void {
        const hostModel = this.hostModel;

        if (el) {
            const ecData = getECData(el);
            // Add data index and series index for indexing the data by element
            // Useful in tooltip
            ecData.dataIndex = idx;
            ecData.dataType = this.dataType;
            ecData.seriesIndex = hostModel && (hostModel as any).seriesIndex;

            // TODO: not store dataIndex on children.
            if (el.type === 'group') {
                el.traverse(setItemDataAndSeriesIndex, el);
            }
        }

        this._graphicEls[idx] = el;
    }

    getItemGraphicEl(idx: number): Element {
        return this._graphicEls[idx];
    }

    eachItemGraphicEl<Ctx = unknown>(
        cb: (this: Ctx, el: Element, idx: number) => void,
        context?: Ctx
    ): void {
        zrUtil.each(this._graphicEls, function (el, idx) {
            if (el) {
                cb && cb.call(context, el, idx);
            }
        });
    }

    /**
     * Shallow clone a new list except visual and layout properties, and graph elements.
     * New list only change the indices.
     */
    cloneShallow(list?: List<HostModel>): List<HostModel> {
        if (!list) {
            const dimensionInfoList = zrUtil.map(this.dimensions, this.getDimensionInfo, this);
            list = new List(dimensionInfoList, this.hostModel);
        }

        // FIXME
        list._storage = this._storage;
        list._storageArr = this._storageArr;

        transferProperties(list, this);

        // Clone will not change the data extent and indices
        if (this._indices) {
            const Ctor = this._indices.constructor as DataArrayLikeConstructor;
            if (Ctor === Array) {
                const thisCount = this._indices.length;
                list._indices = new Ctor(thisCount);
                for (let i = 0; i < thisCount; i++) {
                    list._indices[i] = this._indices[i];
                }
            }
            else {
                list._indices = new (Ctor as DataTypedArrayConstructor)(this._indices);
            }
        }
        else {
            list._indices = null;
        }
        list.getRawIndex = list._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

        return list;
    }

    /**
     * Wrap some method to add more feature
     */
    wrapMethod(
        methodName: FunctionPropertyNames<List>,
        injectFunction: (...args: any) => any
    ): void {
        const originalMethod = this[methodName];
        if (typeof originalMethod !== 'function') {
            return;
        }
        this.__wrappedMethods = this.__wrappedMethods || [];
        this.__wrappedMethods.push(methodName);
        this[methodName] = function () {
            const res = (originalMethod as any).apply(this, arguments);
            return injectFunction.apply(this, [res].concat(zrUtil.slice(arguments)));
        };
    }


    // ----------------------------------------------------------
    // A work around for internal method visiting private member.
    // ----------------------------------------------------------
    private static internalField = (function () {

        defaultDimValueGetters = {

            arrayRows: getDimValueSimply,

            objectRows: function (
                this: List, dataItem: Dictionary<any>, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                return parseDataValue(dataItem[dimName], this._dimensionInfos[dimName]);
            },

            keyedColumns: getDimValueSimply,

            original: function (
                this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                // Performance sensitive, do not use modelUtil.getDataItemValue.
                // If dataItem is an plain object with no value field, the let `value`
                // will be assigned with the object, but it will be tread correctly
                // in the `convertDataValue`.
                const value = dataItem && (dataItem.value == null ? dataItem : dataItem.value);

                // If any dataItem is like { value: 10 }
                if (!this._rawData.pure && isDataItemOption(dataItem)) {
                    this.hasItemOption = true;
                }
                return parseDataValue(
                    (value instanceof Array)
                        ? value[dimIndex]
                        // If value is a single number or something else not array.
                        : value,
                    this._dimensionInfos[dimName]
                );
            },

            typedArray: function (
                this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedValue {
                return dataItem[dimIndex];
            }

        };

        function getDimValueSimply(
            this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
        ): ParsedValue {
            return parseDataValue(dataItem[dimIndex], this._dimensionInfos[dimName]);
        }

        prepareInvertedIndex = function (list: List): void {
            const invertedIndicesMap = list._invertedIndicesMap;
            zrUtil.each(invertedIndicesMap, function (invertedIndices, dim) {
                const dimInfo = list._dimensionInfos[dim];

                // Currently, only dimensions that has ordinalMeta can create inverted indices.
                const ordinalMeta = dimInfo.ordinalMeta;
                if (ordinalMeta) {
                    invertedIndices = invertedIndicesMap[dim] = new CtorInt32Array(
                        ordinalMeta.categories.length
                    );
                    // The default value of TypedArray is 0. To avoid miss
                    // mapping to 0, we should set it as INDEX_NOT_FOUND.
                    for (let i = 0; i < invertedIndices.length; i++) {
                        invertedIndices[i] = INDEX_NOT_FOUND;
                    }
                    for (let i = 0; i < list._count; i++) {
                        // Only support the case that all values are distinct.
                        invertedIndices[list.get(dim, i) as number] = i;
                    }
                }
            });
        };

        getRawValueFromStore = function (
            list: List, dimIndex: number, rawIndex: number
        ): ParsedValue | OrdinalRawValue {
            let val;
            if (dimIndex != null) {
                const chunkSize = list._chunkSize;
                const chunkIndex = mathFloor(rawIndex / chunkSize);
                const chunkOffset = rawIndex % chunkSize;
                const dim = list.dimensions[dimIndex];
                const chunk = list._storage[dim][chunkIndex];
                if (chunk) {
                    val = chunk[chunkOffset];
                    const ordinalMeta = list._dimensionInfos[dim].ordinalMeta;
                    if (ordinalMeta && ordinalMeta.categories.length) {
                        val = ordinalMeta.categories[val as OrdinalNumber];
                    }
                }
            }
            return val;
        };

        getIndicesCtor = function (list: List): DataArrayLikeConstructor {
            // The possible max value in this._indicies is always this._rawCount despite of filtering.
            return list._rawCount > 65535 ? CtorUint32Array : CtorUint16Array;
        };

        prepareChunks = function (
            storage: DataStorage,
            dimInfo: DataDimensionInfo,
            chunkSize: number,
            chunkCount: number,
            end: number
        ): void {
            const DataCtor = dataCtors[dimInfo.type];
            const lastChunkIndex = chunkCount - 1;
            const dim = dimInfo.name;
            const resizeChunkArray = storage[dim][lastChunkIndex];
            if (resizeChunkArray && resizeChunkArray.length < chunkSize) {
                const newStore = new DataCtor(Math.min(end - lastChunkIndex * chunkSize, chunkSize));
                // The cost of the copy is probably inconsiderable
                // within the initial chunkSize.
                for (let j = 0; j < resizeChunkArray.length; j++) {
                    newStore[j] = resizeChunkArray[j];
                }
                storage[dim][lastChunkIndex] = newStore;
            }

            // Create new chunks.
            for (let k = chunkCount * chunkSize; k < end; k += chunkSize) {
                storage[dim].push(new DataCtor(Math.min(end - k, chunkSize)));
            }
        };

        getRawIndexWithoutIndices = function (this: List, idx: number): number {
            return idx;
        };

        getRawIndexWithIndices = function (this: List, idx: number): number {
            if (idx < this._count && idx >= 0) {
                return this._indices[idx];
            }
            return -1;
        };

        /**
         * @see the comment of `List['getId']`.
         */
        getId = function (list: List, rawIndex: number): string {
            let id = list._idList[rawIndex];
            if (id == null) {
                id = convertOptionIdName(getRawValueFromStore(list, list._idDimIdx, rawIndex), null);
            }
            if (id == null) {
                // FIXME Check the usage in graph, should not use prefix.
                id = ID_PREFIX + rawIndex;
            }
            return id;
        };

        normalizeDimensions = function (
            dimensions: ItrParamDims
        ): Array<DimensionLoose> {
            if (!zrUtil.isArray(dimensions)) {
                dimensions = [dimensions];
            }
            return dimensions;
        };

        validateDimensions = function (list: List, dims: DimensionName[]): void {
            for (let i = 0; i < dims.length; i++) {
                // stroage may be empty when no data, so use
                // dimensionInfos to check.
                if (!list._dimensionInfos[dims[i]]) {
                    console.error('Unkown dimension ' + dims[i]);
                }
            }
        };

        // Data in excludeDimensions is copied, otherwise transfered.
        cloneListForMapAndSample = function (
            original: List, excludeDimensions: DimensionName[]
        ): List {
            const allDimensions = original.dimensions;
            const list = new List(
                zrUtil.map(allDimensions, original.getDimensionInfo, original),
                original.hostModel
            );
            // FIXME If needs stackedOn, value may already been stacked
            transferProperties(list, original);

            const storage = list._storage = {} as DataStorage;
            const originalStorage = original._storage;
            const storageArr: DataValueChunk[][] = list._storageArr = [];

            // Init storage
            for (let i = 0; i < allDimensions.length; i++) {
                const dim = allDimensions[i];
                if (originalStorage[dim]) {
                    // Notice that we do not reset invertedIndicesMap here, becuase
                    // there is no scenario of mapping or sampling ordinal dimension.
                    if (zrUtil.indexOf(excludeDimensions, dim) >= 0) {
                        storage[dim] = cloneDimStore(originalStorage[dim]);
                        list._rawExtent[dim] = getInitialExtent();
                        list._extent[dim] = null;
                    }
                    else {
                        // Direct reference for other dimensions
                        storage[dim] = originalStorage[dim];
                    }
                    storageArr.push(storage[dim]);
                }
            }
            return list;
        };

        cloneDimStore = function (originalDimStore: DataValueChunk[]): DataValueChunk[] {
            const newDimStore = new Array(originalDimStore.length);
            for (let j = 0; j < originalDimStore.length; j++) {
                newDimStore[j] = cloneChunk(originalDimStore[j]);
            }
            return newDimStore;
        };

        function cloneChunk(originalChunk: DataValueChunk): DataValueChunk {
            const Ctor = originalChunk.constructor;
            // Only shallow clone is enough when Array.
            return Ctor === Array
                ? (originalChunk as Array<ParsedValue>).slice()
                : new (Ctor as DataTypedArrayConstructor)(originalChunk as DataTypedArray);
        }

        getInitialExtent = function (): [number, number] {
            return [Infinity, -Infinity];
        };

        setItemDataAndSeriesIndex = function (this: Element, child: Element): void {
            const childECData = getECData(child);
            const thisECData = getECData(this);
            childECData.seriesIndex = thisECData.seriesIndex;
            childECData.dataIndex = thisECData.dataIndex;
            childECData.dataType = thisECData.dataType;
        };

        transferProperties = function (target: List, source: List): void {
            zrUtil.each(
                TRANSFERABLE_PROPERTIES.concat(source.__wrappedMethods || []),
                function (propName) {
                    if (source.hasOwnProperty(propName)) {
                        (target as any)[propName] = (source as any)[propName];
                    }
                }
            );

            target.__wrappedMethods = source.__wrappedMethods;

            zrUtil.each(CLONE_PROPERTIES, function (propName) {
                (target as any)[propName] = zrUtil.clone((source as any)[propName]);
            });

            target._calculationInfo = zrUtil.extend({}, source._calculationInfo);
        };

    })();

}

interface List {
    getLinkedData(dataType?: SeriesDataType): List;
    getLinkedDataAll(): { data: List, type?: SeriesDataType }[];
}

export default List;
