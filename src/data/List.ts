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
 * @module echarts/data/List
 */

import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import DataDiffer from './DataDiffer';
import Source, { SourceConstructor } from './Source';
import {DefaultDataProvider, DataProvider} from './helper/dataProvider';
import {summarizeDimensions, DimensionSummary} from './helper/dimensionHelper';
import DataDimensionInfo from './DataDimensionInfo';
import {ArrayLike, Dictionary, FunctionPropertyNames} from 'zrender/src/core/types';
import Element from 'zrender/src/Element';
import {
    DimensionIndex, DimensionName, ECElement, DimensionLoose, OptionDataItem,
    ParsedDataValue, ParsedDataNumeric, OrdinalNumber, DimensionUserOuput, ModelOption
} from '../util/types';
import {parseDate} from '../util/number';
import {isDataItemOption} from '../util/model';


var isObject = zrUtil.isObject;

var UNDEFINED = 'undefined';
var INDEX_NOT_FOUND = -1;

// Use prefix to avoid index to be the same as otherIdList[idx],
// which will cause weird udpate animation.
var ID_PREFIX = 'e\0\0';

var dataCtors = {
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
var CtorUint32Array = typeof Uint32Array === UNDEFINED ? Array : Uint32Array;
var CtorInt32Array = typeof Int32Array === UNDEFINED ? Array : Int32Array;
var CtorUint16Array = typeof Uint16Array === UNDEFINED ? Array : Uint16Array;

type DataTypedArray = Uint32Array | Int32Array | Uint16Array | Float64Array;
type DataTypedArrayConstructor = typeof Uint32Array | typeof Int32Array | typeof Uint16Array | typeof Float64Array;
type DataArrayLikeConstructor = typeof Array | DataTypedArrayConstructor;



type DimValueGetter = (
    this: List,
    dataItem: any,
    dimName: DimensionName,
    dataIndex: number,
    dimIndex: DimensionIndex
) => ParsedDataValue;

type DataValueChunk = ArrayLike<ParsedDataValue>;
type DataStorage = {[dimName: string]: DataValueChunk[]};
type NameRepeatCount = {[name: string]: number};


type ItrParamDims = DimensionLoose | Array<DimensionLoose>;
// If Ctx not specified, use List as Ctx
type CtxOrList<Ctx> = unknown extends Ctx ? List : Ctx;
type EachCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => void;
type EachCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, idx: number) => void;
type EachCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, y: ParsedDataValue, idx: number) => void;
type EachCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => void;
type FilterCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => boolean;
type FilterCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, idx: number) => boolean;
type FilterCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, y: ParsedDataValue, idx: number) => boolean;
type FilterCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => boolean;
type MapArrayCb0<Ctx> = (this: CtxOrList<Ctx>, idx: number) => any;
type MapArrayCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, idx: number) => any;
type MapArrayCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, y: ParsedDataValue, idx: number) => any;
type MapArrayCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => any;
type MapCb1<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, idx: number) => ParsedDataValue | ParsedDataValue[];
type MapCb2<Ctx> = (this: CtxOrList<Ctx>, x: ParsedDataValue, y: ParsedDataValue, idx: number) =>
    ParsedDataValue | ParsedDataValue[];
type MapCb<Ctx> = (this: CtxOrList<Ctx>, ...args: any) => ParsedDataValue | ParsedDataValue[];



var TRANSFERABLE_PROPERTIES = [
    'hasItemOption', '_nameList', '_idList', '_invertedIndicesMap',
    '_rawData', '_chunkSize', '_chunkCount', '_dimValueGetter',
    '_count', '_rawCount', '_nameDimIdx', '_idDimIdx'
];
var CLONE_PROPERTIES = [
    '_extent', '_approximateExtent', '_rawExtent'
];



class List <HostModel extends Model = Model> {

    readonly type = 'list';

    readonly dimensions: string[];

    // Infomation of each data dimension, like data type.
    private _dimensionInfos: {[dimName: string]: DataDimensionInfo};

    readonly hostModel: HostModel;

    readonly dataType: string;

    // Indices stores the indices of data subset after filtered.
    // This data subset will be used in chart.
    private _indices: ArrayLike<any>;

    private _count: number = 0;
    private _rawCount: number = 0;
    private _storage: DataStorage = {};
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

    // Key: visual type, Value: boolean
    // @readonly
    hasItemVisual: Dictionary<boolean> = {};

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

    private _calculationInfo: {[key: string]: any} = {};

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
    TRANSFERABLE_METHODS = ['cloneShallow', 'downSample', 'map'];
    // Methods that change indices of this list should be listed here.
    CHANGABLE_METHODS = ['filterSelf', 'selectRange'];


    /**
     * @param dimensions
     *        For example, ['someDimName', {name: 'someDimName', type: 'someDimType'}, ...].
     *        Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
     */
    constructor(dimensions: Array<string | object | DataDimensionInfo>, hostModel: HostModel) {
        dimensions = dimensions || ['x', 'y'];

        var dimensionInfos: Dictionary<DataDimensionInfo> = {};
        var dimensionNames = [];
        var invertedIndicesMap: Dictionary<number[]> = {};

        for (var i = 0; i < dimensions.length; i++) {
            // Use the original dimensions[i], where other flag props may exists.
            var dimInfoInput = dimensions[i];

            var dimensionInfo: DataDimensionInfo =
                zrUtil.isString(dimInfoInput)
                ? new DataDimensionInfo({name: dimInfoInput})
                : !(dimInfoInput instanceof DataDimensionInfo)
                ? new DataDimensionInfo(dimInfoInput)
                : dimInfoInput;

            var dimensionName = dimensionInfo.name;
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
     *        If idx is `true`, return a array of all mapped dims.
     *        If idx is not specified, return the first dim not extra.
     * @return concrete data dim.
     *        If idx is number, and not found, return null/undefined.
     *        If idx is `true`, and not found, return empty array (always return array).
     */
    mapDimension(coordDim: DimensionName): DimensionName;
    mapDimension(coordDim: DimensionName, idx: true): DimensionName[];
    mapDimension(coordDim: DimensionName, idx: number): DimensionName;
    mapDimension(coordDim: DimensionName, idx?: true | number): DimensionName | DimensionName[] {
        var dimensionsSummary = this._dimensionsSummary;

        if (idx == null) {
            return dimensionsSummary.encodeFirstDimNotExtra[coordDim] as any;
        }

        var dims = dimensionsSummary.encode[coordDim];
        return idx === true
            // always return array if idx is `true`
            ? (dims || []).slice()
            : (dims ? dims[idx as number] as any : null);
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

        var notProvider = (Source as SourceConstructor).isInstance(data)
            || zrUtil.isArrayLike(data);
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

        var rawData = this._rawData;
        var start = this.count();
        rawData.appendData(data);
        var end = rawData.count();
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
        var chunkSize = this._chunkSize;
        var storage = this._storage;
        var dimensions = this.dimensions;
        var dimLen = dimensions.length;
        var rawExtent = this._rawExtent;

        var start = this.count();
        var end = start + Math.max(values.length, names ? names.length : 0);
        var originalChunkCount = this._chunkCount;

        for (var i = 0; i < dimLen; i++) {
            var dim = dimensions[i];
            if (!rawExtent[dim]) {
                rawExtent[dim] = getInitialExtent();
            }
            if (!storage[dim]) {
                storage[dim] = [];
            }
            prepareChunks(storage, this._dimensionInfos[dim], chunkSize, originalChunkCount, end);
            this._chunkCount = storage[dim].length;
        }

        var emptyDataItem = new Array(dimLen);
        for (var idx = start; idx < end; idx++) {
            var sourceIdx = idx - start;
            var chunkIndex = Math.floor(idx / chunkSize);
            var chunkOffset = idx % chunkSize;

            // Store the data by dimensions
            for (var k = 0; k < dimLen; k++) {
                var dim = dimensions[k];
                var val = this._dimValueGetterArrayRows(
                    values[sourceIdx] || emptyDataItem, dim, sourceIdx, k
                ) as ParsedDataNumeric;
                storage[dim][chunkIndex][chunkOffset] = val;

                var dimRawExtent = rawExtent[dim];
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

        var chunkSize = this._chunkSize;
        var rawData = this._rawData;
        var storage = this._storage;
        var dimensions = this.dimensions;
        var dimLen = dimensions.length;
        var dimensionInfoMap = this._dimensionInfos;
        var nameList = this._nameList;
        var idList = this._idList;
        var rawExtent = this._rawExtent;
        var nameRepeatCount: NameRepeatCount = this._nameRepeatCount = {};
        var nameDimIdx;

        var originalChunkCount = this._chunkCount;
        for (var i = 0; i < dimLen; i++) {
            var dim = dimensions[i];
            if (!rawExtent[dim]) {
                rawExtent[dim] = getInitialExtent();
            }

            var dimInfo = dimensionInfoMap[dim];
            if (dimInfo.otherDims.itemName === 0) {
                nameDimIdx = this._nameDimIdx = i;
            }
            if (dimInfo.otherDims.itemId === 0) {
                this._idDimIdx = i;
            }

            if (!storage[dim]) {
                storage[dim] = [];
            }

            prepareChunks(storage, dimInfo, chunkSize, originalChunkCount, end);

            this._chunkCount = storage[dim].length;
        }

        var dataItem = new Array(dimLen) as OptionDataItem;
        for (var idx = start; idx < end; idx++) {
            // NOTICE: Try not to write things into dataItem
            dataItem = rawData.getItem(idx, dataItem);
            // Each data item is value
            // [1, 2]
            // 2
            // Bar chart, line chart which uses category axis
            // only gives the 'y' value. 'x' value is the indices of category
            // Use a tempValue to normalize the value to be a (x, y) value
            var chunkIndex = Math.floor(idx / chunkSize);
            var chunkOffset = idx % chunkSize;

            // Store the data by dimensions
            for (var k = 0; k < dimLen; k++) {
                var dim = dimensions[k];
                var dimStorage = storage[dim][chunkIndex];
                // PENDING NULL is empty or zero
                var val = this._dimValueGetter(dataItem, dim, idx, k) as ParsedDataNumeric;
                dimStorage[chunkOffset] = val;

                var dimRawExtent = rawExtent[dim];
                val < dimRawExtent[0] && (dimRawExtent[0] = val);
                val > dimRawExtent[1] && (dimRawExtent[1] = val);
            }

            // ??? FIXME not check by pure but sourceFormat?
            // TODO refactor these logic.
            if (!rawData.pure) {
                var name: any = nameList[idx];

                if (dataItem && name == null) {
                    // If dataItem is {name: ...}, it has highest priority.
                    // That is appropriate for many common cases.
                    if ((dataItem as any).name != null) {
                        // There is no other place to persistent dataItem.name,
                        // so save it to nameList.
                        nameList[idx] = name = (dataItem as any).name;
                    }
                    else if (nameDimIdx != null) {
                        var nameDim = dimensions[nameDimIdx];
                        var nameDimChunk = storage[nameDim][chunkIndex];
                        if (nameDimChunk) {
                            name = nameDimChunk[chunkOffset];
                            var ordinalMeta = dimensionInfoMap[nameDim].ordinalMeta;
                            if (ordinalMeta && ordinalMeta.categories.length) {
                                name = ordinalMeta.categories[name];
                            }
                        }
                    }
                }

                // Try using the id in option
                // id or name is used on dynamical data, mapping old and new items.
                var id = dataItem == null ? null : (dataItem as any).id;

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
        var newIndices;

        var indices = this._indices;
        if (indices) {
            var Ctor = indices.constructor as DataArrayLikeConstructor;
            var thisCount = this._count;
            // `new Array(a, b, c)` is different from `new Uint32Array(a, b, c)`.
            if (Ctor === Array) {
                newIndices = new Ctor(thisCount);
                for (var i = 0; i < thisCount; i++) {
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
            var Ctor = getIndicesCtor(this);
            newIndices = new Ctor(this.count());
            for (var i = 0; i < newIndices.length; i++) {
                newIndices[i] = i;
            }
        }

        return newIndices;
    }

    /**
     * Get value. Return NaN if idx is out of range.
     * @param dim Dim must be concrete name.
     */
    get(dim: DimensionName, idx: number): ParsedDataValue {
        if (!(idx >= 0 && idx < this._count)) {
            return NaN;
        }
        var storage = this._storage;
        if (!storage[dim]) {
            // TODO Warn ?
            return NaN;
        }

        idx = this.getRawIndex(idx);

        var chunkIndex = Math.floor(idx / this._chunkSize);
        var chunkOffset = idx % this._chunkSize;

        var chunkStore = storage[dim][chunkIndex];
        var value = chunkStore[chunkOffset];
        // FIXME ordinal data type is not stackable
        // if (stack) {
        //     var dimensionInfo = this._dimensionInfos[dim];
        //     if (dimensionInfo && dimensionInfo.stackable) {
        //         var stackedOn = this.stackedOn;
        //         while (stackedOn) {
        //             // Get no stacked data of stacked on
        //             var stackedValue = stackedOn.get(dim, idx);
        //             // Considering positive stack, negative stack and empty data
        //             if ((value >= 0 && stackedValue > 0)  // Positive stack
        //                 || (value <= 0 && stackedValue < 0) // Negative stack
        //             ) {
        //                 value += stackedValue;
        //             }
        //             stackedOn = stackedOn.stackedOn;
        //         }
        //     }
        // }

        return value;
    }

    /**
     * @param dim concrete dim
     */
    getByRawIndex(dim: DimensionName, rawIdx: number): ParsedDataValue {
        if (!(rawIdx >= 0 && rawIdx < this._rawCount)) {
            return NaN;
        }
        var dimStore = this._storage[dim];
        if (!dimStore) {
            // TODO Warn ?
            return NaN;
        }

        var chunkIndex = Math.floor(rawIdx / this._chunkSize);
        var chunkOffset = rawIdx % this._chunkSize;
        var chunkStore = dimStore[chunkIndex];
        return chunkStore[chunkOffset];
    }

    /**
     * FIXME Use `get` on chrome maybe slow(in filterSelf and selectRange).
     * Hack a much simpler _getFast
     */
    private _getFast(dim: DimensionName, rawIdx: number): ParsedDataValue {
        var chunkIndex = Math.floor(rawIdx / this._chunkSize);
        var chunkOffset = rawIdx % this._chunkSize;
        var chunkStore = this._storage[dim][chunkIndex];
        return chunkStore[chunkOffset];
    }

    /**
     * Get value for multi dimensions.
     * @param dimensions If ignored, using all dimensions.
     */
    getValues(idx: number): ParsedDataValue[];
    getValues(dimensions: DimensionName[], idx: number): ParsedDataValue[];
    getValues(dimensions: DimensionName[] | number, idx?: number): ParsedDataValue[] {
        var values = [];

        if (!zrUtil.isArray(dimensions)) {
            // stack = idx;
            idx = dimensions;
            dimensions = this.dimensions;
        }

        for (var i = 0, len = dimensions.length; i < len; i++) {
            values.push(this.get(dimensions[i], idx /*, stack */));
        }

        return values;
    }

    /**
     * If value is NaN. Inlcuding '-'
     * Only check the coord dimensions.
     */
    hasValue(idx: number): boolean {
        var dataDimsOnCoord = this._dimensionsSummary.dataDimsOnCoord;
        for (var i = 0, len = dataDimsOnCoord.length; i < len; i++) {
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
        var dimData = this._storage[dim];
        var initialExtent = getInitialExtent();

        // stack = !!((stack || false) && this.getCalculationInfo(dim));

        if (!dimData) {
            return initialExtent;
        }

        // Make more strict checkings to ensure hitting cache.
        var currEnd = this.count();
        // var cacheName = [dim, !!stack].join('_');
        // var cacheName = dim;

        // Consider the most cases when using data zoom, `getDataExtent`
        // happened before filtering. We cache raw extent, which is not
        // necessary to be cleared and recalculated when restore data.
        var useRaw = !this._indices; // && !stack;
        var dimExtent: [number, number];

        if (useRaw) {
            return this._rawExtent[dim].slice() as [number, number];
        }
        dimExtent = this._extent[dim];
        if (dimExtent) {
            return dimExtent.slice() as [number, number];
        }
        dimExtent = initialExtent;

        var min = dimExtent[0];
        var max = dimExtent[1];

        for (var i = 0; i < currEnd; i++) {
            // var value = stack ? this.get(dim, i, true) : this._getFast(dim, this.getRawIndex(i));
            var value = this._getFast(dim, this.getRawIndex(i)) as ParsedDataNumeric;
            value < min && (min = value);
            value > max && (max = value);
        }

        dimExtent = [min, max];

        this._extent[dim] = dimExtent;

        return dimExtent;
    }

    /**
     * Optimize for the scenario that data is filtered by a given extent.
     * Consider that if data amount is more than hundreds of thousand,
     * extent calculation will cost more than 10ms and the cache will
     * be erased because of the filtering.
     */
    getApproximateExtent(dim: DimensionLoose): [number, number] {
        dim = this.getDimension(dim);
        return this._approximateExtent[dim] || this.getDataExtent(dim /*, stack */);
    }

    setApproximateExtent(extent: [number, number], dim: DimensionLoose): void {
        dim = this.getDimension(dim);
        this._approximateExtent[dim] = extent.slice() as [number, number];
    }

    getCalculationInfo(key: string): any {
        return this._calculationInfo[key];
    }

    /**
     * @param key or k-v object
     */
    setCalculationInfo(key: string | object, value?: any) {
        isObject(key)
            ? zrUtil.extend(this._calculationInfo, key as object)
            : (this._calculationInfo[key] = value);
    }

    /**
     * Get sum of data in one dimension
     */
    getSum(dim: DimensionName): number {
        var dimData = this._storage[dim];
        var sum = 0;
        if (dimData) {
            for (var i = 0, len = this.count(); i < len; i++) {
                var value = this.get(dim, i) as number;
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
        var dimDataArray: ParsedDataValue[] = [];
        // map all data of one dimension
        this.each(dim, function (val) {
            if (!isNaN(val as number)) {
                dimDataArray.push(val);
            }
        });

        // TODO
        // Use quick select?

        // immutability & sort
        var sortedDimDataArray = [].concat(dimDataArray).sort(function (a, b) {
            return a - b;
        });
        var len = this.count();
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
    //     var storage = this._storage;
    //     var dimData = storage[dim];
    //     var chunkSize = this._chunkSize;
    //     if (dimData) {
    //         for (var i = 0, len = this.count(); i < len; i++) {
    //             var chunkIndex = Math.floor(i / chunkSize);
    //             var chunkOffset = i % chunkSize;
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
        var invertedIndices = dim && this._invertedIndicesMap[dim];
        if (__DEV__) {
            if (!invertedIndices) {
                throw new Error('Do not supported yet');
            }
        }
        var rawIndex = invertedIndices[value];
        if (rawIndex == null || isNaN(rawIndex)) {
            return INDEX_NOT_FOUND;
        }
        return rawIndex;
    }

    /**
     * Retreive the index with given name
     */
    indexOfName(name: string): number {
        for (var i = 0, len = this.count(); i < len; i++) {
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
        var indices = this._indices;

        // If rawIndex === dataIndex
        var rawDataIndex = indices[rawIndex];
        if (rawDataIndex != null && rawDataIndex < this._count && rawDataIndex === rawIndex) {
            return rawIndex;
        }

        var left = 0;
        var right = this._count - 1;
        while (left <= right) {
            var mid = (left + right) / 2 | 0;
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
        var storage = this._storage;
        var dimData = storage[dim];
        var nearestIndices: number[] = [];

        if (!dimData) {
            return nearestIndices;
        }

        if (maxDistance == null) {
            maxDistance = Infinity;
        }

        var minDist = Infinity;
        var minDiff = -1;
        var nearestIndicesLen = 0;

        // Check the test case of `test/ut/spec/data/List.js`.
        for (var i = 0, len = this.count(); i < len; i++) {
            var diff = value - (this.get(dim, i) as number);
            var dist = Math.abs(diff);
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
            var val = [];
            for (var i = 0; i < this.dimensions.length; i++) {
                var dim = this.dimensions[i];
                val.push(this.get(dim, idx));
            }
            return val;
        }
        else {
            return this._rawData.getItem(this.getRawIndex(idx));
        }
    }

    getName(idx: number): string {
        var rawIndex = this.getRawIndex(idx);
        return this._nameList[rawIndex]
            || getRawValueFromStore(this, this._nameDimIdx, rawIndex)
            || '';
    }

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
        var fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        var dimNames = zrUtil.map(normalizeDimensions(dims), this.getDimension, this);

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }

        var dimSize = dimNames.length;

        for (var i = 0; i < this.count(); i++) {
            // Simple optimization
            switch (dimSize) {
                case 0:
                    (cb as EachCb0<Ctx>).call(fCtx, i);
                    break;
                case 1:
                    (cb as EachCb1<Ctx>).call(fCtx, this.get(dimNames[0], i), i);
                    break;
                case 2:
                    (cb as EachCb2<Ctx>).call(fCtx, this.get(dimNames[0], i), this.get(dimNames[1], i), i);
                    break;
                default:
                    var k = 0;
                    var value = [];
                    for (; k < dimSize; k++) {
                        value[k] = this.get(dimNames[k], i);
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
    filterSelf<Ctx>(cb: FilterCb0<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    filterSelf<Ctx>(dims: DimensionLoose, cb: FilterCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    filterSelf<Ctx>(dims: [DimensionLoose], cb: FilterCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    filterSelf<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: FilterCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    filterSelf<Ctx>(dims: ItrParamDims, cb: FilterCb<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
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
        var fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        var dimNames = zrUtil.map(
            normalizeDimensions(dims), this.getDimension, this
        );

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }


        var count = this.count();
        var Ctor = getIndicesCtor(this);
        var newIndices = new Ctor(count);
        var value = [];
        var dimSize = dimNames.length;

        var offset = 0;
        var dim0 = dimNames[0];

        for (var i = 0; i < count; i++) {
            var keep;
            var rawIdx = this.getRawIndex(i);
            // Simple optimization
            if (dimSize === 0) {
                keep = (cb as FilterCb0<Ctx>).call(fCtx, i);
            }
            else if (dimSize === 1) {
                var val = this._getFast(dim0, rawIdx);
                keep = (cb as FilterCb1<Ctx>).call(fCtx, val, i);
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this._getFast(dim0, rawIdx);
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
    selectRange(range: {[dimName: string]: string}): List {
        'use strict';

        if (!this._count) {
            return;
        }

        var dimensions = [];
        for (var dim in range) {
            if (range.hasOwnProperty(dim)) {
                dimensions.push(dim);
            }
        }

        if (__DEV__) {
            validateDimensions(this, dimensions);
        }

        var dimSize = dimensions.length;
        if (!dimSize) {
            return;
        }

        var originalCount = this.count();
        var Ctor = getIndicesCtor(this);
        var newIndices = new Ctor(originalCount);

        var offset = 0;
        var dim0 = dimensions[0];

        var min = range[dim0][0];
        var max = range[dim0][1];

        var quickFinished = false;
        if (!this._indices) {
            // Extreme optimization for common case. About 2x faster in chrome.
            var idx = 0;
            if (dimSize === 1) {
                var dimStorage = this._storage[dimensions[0]];
                for (var k = 0; k < this._chunkCount; k++) {
                    var chunkStorage = dimStorage[k];
                    var len = Math.min(this._count - k * this._chunkSize, this._chunkSize);
                    for (var i = 0; i < len; i++) {
                        var val = chunkStorage[i];
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
                var dimStorage = this._storage[dim0];
                var dimStorage2 = this._storage[dimensions[1]];
                var min2 = range[dimensions[1]][0];
                var max2 = range[dimensions[1]][1];
                for (var k = 0; k < this._chunkCount; k++) {
                    var chunkStorage = dimStorage[k];
                    var chunkStorage2 = dimStorage2[k];
                    var len = Math.min(this._count - k * this._chunkSize, this._chunkSize);
                    for (var i = 0; i < len; i++) {
                        var val = chunkStorage[i];
                        var val2 = chunkStorage2[i];
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
                for (var i = 0; i < originalCount; i++) {
                    var rawIndex = this.getRawIndex(i);
                    var val = this._getFast(dim0, rawIndex);
                    // Do not filter NaN, see comment above.
                    if (
                        (val >= min && val <= max) || isNaN(val as any)
                    ) {
                        newIndices[offset++] = rawIndex;
                    }
                }
            }
            else {
                for (var i = 0; i < originalCount; i++) {
                    var keep = true;
                    var rawIndex = this.getRawIndex(i);
                    for (var k = 0; k < dimSize; k++) {
                        var dimk = dimensions[k];
                        var val = this._getFast(dim, rawIndex);
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
    mapArray<Ctx>(cb: MapArrayCb0<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): any[];
    mapArray<Ctx>(dims: DimensionLoose, cb: MapArrayCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): any[];
    mapArray<Ctx>(dims: [DimensionLoose], cb: MapArrayCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): any[];
    mapArray<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: MapArrayCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): any[];
    mapArray<Ctx>(dims: ItrParamDims, cb: MapArrayCb<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): any[];
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

        var result: any[] = [];
        this.each(dims, function () {
            result.push(cb && (cb as MapArrayCb<Ctx>).apply(this, arguments));
        }, ctx);
        return result;
    }

    /**
     * Data mapping to a new List with given dimensions
     */
    map<Ctx>(dims: DimensionLoose, cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    map<Ctx>(dims: [DimensionLoose], cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    map<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: MapCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): List;
    map<Ctx>(
        dims: ItrParamDims,
        cb: MapCb<Ctx>,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): List {
        'use strict';

        // ctxCompat just for compat echarts3
        var fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        var dimNames = zrUtil.map(
            normalizeDimensions(dims), this.getDimension, this
        );

        if (__DEV__) {
            validateDimensions(this, dimNames);
        }

        var list = cloneListForMapAndSample(this, dimNames);

        // Following properties are all immutable.
        // So we can reference to the same value
        list._indices = this._indices;
        list.getRawIndex = list._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

        var storage = list._storage;

        var tmpRetValue = [];
        var chunkSize = this._chunkSize;
        var dimSize = dimNames.length;
        var dataCount = this.count();
        var values = [];
        var rawExtent = list._rawExtent;

        for (var dataIndex = 0; dataIndex < dataCount; dataIndex++) {
            for (var dimIndex = 0; dimIndex < dimSize; dimIndex++) {
                values[dimIndex] = this.get(dimNames[dimIndex], dataIndex);
            }
            values[dimSize] = dataIndex;

            var retValue = cb && cb.apply(fCtx, values);
            if (retValue != null) {
                // a number or string (in oridinal dimension)?
                if (typeof retValue !== 'object') {
                    tmpRetValue[0] = retValue;
                    retValue = tmpRetValue;
                }

                var rawIndex = this.getRawIndex(dataIndex);
                var chunkIndex = Math.floor(rawIndex / chunkSize);
                var chunkOffset = rawIndex % chunkSize;

                for (var i = 0; i < retValue.length; i++) {
                    var dim = dimNames[i];
                    var val = retValue[i];
                    var rawExtentOnDim = rawExtent[dim];

                    var dimStore = storage[dim];
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
        sampleValue: (frameValues: ParsedDataValue[]) => ParsedDataNumeric,
        sampleIndex: (frameValues: ParsedDataValue[], value: ParsedDataNumeric) => number
    ): List {
        var list = cloneListForMapAndSample(this, [dimension]);
        var targetStorage = list._storage;

        var frameValues = [];
        var frameSize = Math.floor(1 / rate);

        var dimStore = targetStorage[dimension];
        var len = this.count();
        var chunkSize = this._chunkSize;
        var rawExtentOnDim = list._rawExtent[dimension];

        var newIndices = new (getIndicesCtor(this))(len);

        var offset = 0;
        for (var i = 0; i < len; i += frameSize) {
            // Last frame
            if (frameSize > len - i) {
                frameSize = len - i;
                frameValues.length = frameSize;
            }
            for (var k = 0; k < frameSize; k++) {
                var dataIdx = this.getRawIndex(i + k);
                var originalChunkIndex = Math.floor(dataIdx / chunkSize);
                var originalChunkOffset = dataIdx % chunkSize;
                frameValues[k] = dimStore[originalChunkIndex][originalChunkOffset];
            }
            var value = sampleValue(frameValues);
            var sampleFrameIdx = this.getRawIndex(
                Math.min(i + sampleIndex(frameValues, value) || 0, len - 1)
            );
            var sampleChunkIndex = Math.floor(sampleFrameIdx / chunkSize);
            var sampleChunkOffset = sampleFrameIdx % chunkSize;
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

        return list;
    }

    /**
     * Get model of one data item.
     */
    getItemModel(idx: number): Model {
        var hostModel = this.hostModel;
        var dataItem = this.getRawDataItem(idx) as ModelOption;
        return new Model(dataItem, hostModel, hostModel && hostModel.ecModel);
    }

    /**
     * Create a data differ
     */
    diff(otherList: List): DataDiffer {
        var thisList = this;

        return new DataDiffer(
            otherList ? otherList.getIndices() : [],
            this.getIndices(),
            function (idx) {
                return getId(otherList, idx);
            },
            function (idx) {
                return getId(thisList, idx);
            }
        );
    }

    /**
     * Get visual property.
     */
    getVisual(key: string): any {
        var visual = this._visual;
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
    setVisual(key: string, val: any): void;
    setVisual(kvObj: Dictionary<any>): void;
    setVisual(key: string | Dictionary<any>, val?: any): void {
        if (isObject<Dictionary<any>>(key)) {
            for (var name in key) {
                if (key.hasOwnProperty(name)) {
                    this.setVisual(name, key[name]);
                }
            }
            return;
        }
        this._visual = this._visual || {};
        this._visual[key] = val;
    }

    /**
     * Set layout property.
     */
    setLayout(key: string, val: any): void;
    setLayout(kvObj: Dictionary<any>): void;
    setLayout(key: string | Dictionary<any>, val?: any): void {
        if (isObject<Dictionary<any>>(key)) {
            for (var name in key) {
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
    getItemLayout(idx: number): Dictionary<any> {
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
     * Get visual property of single data item
     */
    getItemVisual(idx: number, key: string, ignoreParent?: boolean): any {
        var itemVisual = this._itemVisuals[idx];
        var val = itemVisual && itemVisual[key];
        if (val == null && !ignoreParent) {
            // Use global visual property
            return this.getVisual(key);
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
    setItemVisual(idx: number, key: string, value: any): void;
    setItemVisual(idx: number, kvObject: Dictionary<any>): void;
    setItemVisual(idx: number, key: string | Dictionary<any>, value?: any): void {
        var itemVisual = this._itemVisuals[idx] || {};
        var hasItemVisual = this.hasItemVisual;
        this._itemVisuals[idx] = itemVisual;

        if (isObject<Dictionary<any>>(key)) {
            for (var name in key) {
                if (key.hasOwnProperty(name)) {
                    itemVisual[name] = key[name];
                    hasItemVisual[name] = true;
                }
            }
            return;
        }
        itemVisual[key] = value;
        hasItemVisual[key] = true;
    }

    /**
     * Clear itemVisuals and list visual.
     */
    clearAllVisual(): void {
        this._visual = {};
        this._itemVisuals = [];
        this.hasItemVisual = {};
    }

    /**
     * Set graphic element relative to data. It can be set as null
     */
    setItemGraphicEl(idx: number, el: Element): void {
        var hostModel = this.hostModel;

        if (el) {
            // Add data index and series index for indexing the data by element
            // Useful in tooltip
            (el as ECElement).dataIndex = idx;
            (el as ECElement).dataType = this.dataType;
            (el as ECElement).seriesIndex = hostModel && (hostModel as any).seriesIndex;
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
            var dimensionInfoList = zrUtil.map(this.dimensions, this.getDimensionInfo, this);
            list = new List(dimensionInfoList, this.hostModel);
        }

        // FIXME
        list._storage = this._storage;

        transferProperties(list, this);

        // Clone will not change the data extent and indices
        if (this._indices) {
            var Ctor = this._indices.constructor as DataArrayLikeConstructor;
            if (Ctor === Array) {
                var thisCount = this._indices.length;
                list._indices = new Ctor(thisCount);
                for (var i = 0; i < thisCount; i++) {
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
        var originalMethod = this[methodName];
        if (typeof originalMethod !== 'function') {
            return;
        }
        this.__wrappedMethods = this.__wrappedMethods || [];
        this.__wrappedMethods.push(methodName);
        this[methodName] = function () {
            var res = (originalMethod as any).apply(this, arguments);
            return injectFunction.apply(this, [res].concat(zrUtil.slice(arguments)));
        };
    }


    // ----------------------------------------------------------
    // A work around for internal method visiting private member.
    // ----------------------------------------------------------
    static internalField = (function () {

        defaultDimValueGetters = {

            arrayRows: getDimValueSimply,

            objectRows: function (
                this: List, dataItem: Dictionary<any>, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedDataValue {
                return convertDataValue(dataItem[dimName], this._dimensionInfos[dimName]);
            },

            keyedColumns: getDimValueSimply,

            original: function (
                this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedDataValue {
                // Performance sensitive, do not use modelUtil.getDataItemValue.
                // If dataItem is an plain object with no value field, the var `value`
                // will be assigned with the object, but it will be tread correctly
                // in the `convertDataValue`.
                var value = dataItem && (dataItem.value == null ? dataItem : dataItem.value);

                // If any dataItem is like { value: 10 }
                if (!this._rawData.pure && isDataItemOption(dataItem)) {
                    this.hasItemOption = true;
                }
                return convertDataValue(
                    (value instanceof Array)
                        ? value[dimIndex]
                        // If value is a single number or something else not array.
                        : value,
                    this._dimensionInfos[dimName]
                );
            },

            typedArray: function (
                this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
            ): ParsedDataValue {
                return dataItem[dimIndex];
            }

        };

        function getDimValueSimply(
            this: List, dataItem: any, dimName: string, dataIndex: number, dimIndex: number
        ): ParsedDataValue {
            return convertDataValue(dataItem[dimIndex], this._dimensionInfos[dimName]);
        }

        /**
         * Convert raw the value in to inner value in List.
         * [Caution]: this is the key logic of user value parser.
         * For backward compatibiliy, do not modify it until have to.
         */
        function convertDataValue(value: any, dimInfo: DataDimensionInfo): ParsedDataValue {
            // Performance sensitive.
            var dimType = dimInfo && dimInfo.type;
            if (dimType === 'ordinal') {
                // If given value is a category string
                var ordinalMeta = dimInfo && dimInfo.ordinalMeta;
                return ordinalMeta
                    ? ordinalMeta.parseAndCollect(value)
                    : value;
            }

            if (dimType === 'time'
                // spead up when using timestamp
                && typeof value !== 'number'
                && value != null
                && value !== '-'
            ) {
                value = +parseDate(value);
            }

            // dimType defaults 'number'.
            // If dimType is not ordinal and value is null or undefined or NaN or '-',
            // parse to NaN.
            return (value == null || value === '')
                ? NaN
                // If string (like '-'), using '+' parse to NaN
                // If object, also parse to NaN
                : +value;
        };

        prepareInvertedIndex = function (list: List): void {
            var invertedIndicesMap = list._invertedIndicesMap;
            zrUtil.each(invertedIndicesMap, function (invertedIndices, dim) {
                var dimInfo = list._dimensionInfos[dim];

                // Currently, only dimensions that has ordinalMeta can create inverted indices.
                var ordinalMeta = dimInfo.ordinalMeta;
                if (ordinalMeta) {
                    invertedIndices = invertedIndicesMap[dim] = new CtorInt32Array(
                        ordinalMeta.categories.length
                    );
                    // The default value of TypedArray is 0. To avoid miss
                    // mapping to 0, we should set it as INDEX_NOT_FOUND.
                    for (var i = 0; i < invertedIndices.length; i++) {
                        invertedIndices[i] = INDEX_NOT_FOUND;
                    }
                    for (var i = 0; i < list._count; i++) {
                        // Only support the case that all values are distinct.
                        invertedIndices[list.get(dim, i) as number] = i;
                    }
                }
            });
        };

        getRawValueFromStore = function (list: List, dimIndex: number, rawIndex: number): any {
            var val;
            if (dimIndex != null) {
                var chunkSize = list._chunkSize;
                var chunkIndex = Math.floor(rawIndex / chunkSize);
                var chunkOffset = rawIndex % chunkSize;
                var dim = list.dimensions[dimIndex];
                var chunk = list._storage[dim][chunkIndex];
                if (chunk) {
                    val = chunk[chunkOffset];
                    var ordinalMeta = list._dimensionInfos[dim].ordinalMeta;
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
            var DataCtor = dataCtors[dimInfo.type];
            var lastChunkIndex = chunkCount - 1;
            var dim = dimInfo.name;
            var resizeChunkArray = storage[dim][lastChunkIndex];
            if (resizeChunkArray && resizeChunkArray.length < chunkSize) {
                var newStore = new DataCtor(Math.min(end - lastChunkIndex * chunkSize, chunkSize));
                // The cost of the copy is probably inconsiderable
                // within the initial chunkSize.
                for (var j = 0; j < resizeChunkArray.length; j++) {
                    newStore[j] = resizeChunkArray[j];
                }
                storage[dim][lastChunkIndex] = newStore;
            }

            // Create new chunks.
            for (var k = chunkCount * chunkSize; k < end; k += chunkSize) {
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

        getId = function (list: List, rawIndex: number): string {
            var id = list._idList[rawIndex];
            if (id == null) {
                id = getRawValueFromStore(list, list._idDimIdx, rawIndex);
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
            for (var i = 0; i < dims.length; i++) {
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
            var allDimensions = original.dimensions;
            var list = new List(
                zrUtil.map(allDimensions, original.getDimensionInfo, original),
                original.hostModel
            );
            // FIXME If needs stackedOn, value may already been stacked
            transferProperties(list, original);

            var storage = list._storage = {} as DataStorage;
            var originalStorage = original._storage;

            // Init storage
            for (var i = 0; i < allDimensions.length; i++) {
                var dim = allDimensions[i];
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
                }
            }
            return list;
        };

        cloneDimStore = function (originalDimStore: DataValueChunk[]): DataValueChunk[] {
            var newDimStore = new Array(originalDimStore.length);
            for (var j = 0; j < originalDimStore.length; j++) {
                newDimStore[j] = cloneChunk(originalDimStore[j]);
            }
            return newDimStore;
        };

        function cloneChunk(originalChunk: DataValueChunk): DataValueChunk {
            var Ctor = originalChunk.constructor;
            // Only shallow clone is enough when Array.
            return Ctor === Array
                ? (originalChunk as Array<ParsedDataValue>).slice()
                : new (Ctor as DataTypedArrayConstructor)(originalChunk as DataTypedArray);
        }

        getInitialExtent = function (): [number, number] {
            return [Infinity, -Infinity];
        };

        setItemDataAndSeriesIndex = function (this: Element, child: Element): void {
            (child as ECElement).seriesIndex = (this as ECElement).seriesIndex;
            (child as ECElement).dataIndex = (this as ECElement).dataIndex;
            (child as ECElement).dataType = (this as ECElement).dataType;
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

// -----------------------------
// Internal method declarations:
// -----------------------------
var defaultDimValueGetters: {[sourceFormat: string]: DimValueGetter};
var prepareInvertedIndex: (list: List) => void;
var getRawValueFromStore: (list: List, dimIndex: number, rawIndex: number) => any;
var getIndicesCtor: (list: List) => DataArrayLikeConstructor;
var prepareChunks: (
    storage: DataStorage, dimInfo: DataDimensionInfo, chunkSize: number, chunkCount: number, end: number
) => void;
var getRawIndexWithoutIndices: (this: List, idx: number) => number;
var getRawIndexWithIndices: (this: List, idx: number) => number;
var getId: (list: List, rawIndex: number) => string;
var normalizeDimensions: (dimensions: ItrParamDims) => Array<DimensionLoose>;
var validateDimensions: (list: List, dims: DimensionName[]) => void;
var cloneListForMapAndSample: (original: List, excludeDimensions: DimensionName[]) => List;
var cloneDimStore: (originalDimStore: DataValueChunk[]) => DataValueChunk[];
var getInitialExtent: () => [number, number];
var setItemDataAndSeriesIndex: (this: Element, child: Element) => void;
var transferProperties: (target: List, source: List) => void;


export default List;
