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

/* global Int32Array */


import * as zrUtil from 'zrender/src/core/util';
import {PathStyleProps} from 'zrender/src/graphic/Path';
import Model from '../model/Model';
import DataDiffer from './DataDiffer';
import {DataProvider, DefaultDataProvider} from './helper/dataProvider';
import {summarizeDimensions, DimensionSummary} from './helper/dimensionHelper';
import SeriesDimensionDefine from './SeriesDimensionDefine';
import {ArrayLike, Dictionary, FunctionPropertyNames} from 'zrender/src/core/types';
import Element from 'zrender/src/Element';
import {
    DimensionIndex, DimensionName, DimensionLoose, OptionDataItem,
    ParsedValue, ParsedValueNumeric,
    ModelOption, SeriesDataType, OptionSourceData, SOURCE_FORMAT_TYPED_ARRAY, SOURCE_FORMAT_ORIGINAL,
    DecalObject,
    OrdinalNumber,
    OrdinalRawValue
} from '../util/types';
import {convertOptionIdName, isDataItemOption} from '../util/model';
import { setCommonECData } from '../util/innerStore';
import type Graph from './Graph';
import type Tree from './Tree';
import type { VisualMeta } from '../component/visualMap/VisualMapModel';
import {isSourceInstance, Source} from './Source';
import { LineStyleProps } from '../model/mixin/lineStyle';
import DataStore, { DataStoreDimensionDefine, DimValueGetter } from './DataStore';
import { isSeriesDataSchema, SeriesDataSchema } from './helper/SeriesDataSchema';

const isObject = zrUtil.isObject;
const map = zrUtil.map;

const CtorInt32Array = typeof Int32Array === 'undefined' ? Array : Int32Array;

// Use prefix to avoid index to be the same as otherIdList[idx],
// which will cause weird update animation.
const ID_PREFIX = 'e\0\0';

const INDEX_NOT_FOUND = -1;

type NameRepeatCount = {[name: string]: number};
type ItrParamDims = DimensionLoose | Array<DimensionLoose>;
// If Ctx not specified, use List as Ctx
type CtxOrList<Ctx> = unknown extends Ctx ? SeriesData : Ctx;
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

type SeriesDimensionDefineLoose = string | object | SeriesDimensionDefine;

// `SeriesDimensionLoose` and `SeriesDimensionName` is the dimension that is used by coordinate
// system or declared in `series.encode`, which will be saved in `SeriesData`. Other dimension
// might not be saved in `SeriesData` for performance consideration. See `createDimension` for
// more details.
type SeriesDimensionLoose = DimensionLoose;
type SeriesDimensionName = DimensionName;
// type SeriesDimensionIndex = DimensionIndex;


const TRANSFERABLE_PROPERTIES = [
    'hasItemOption', '_nameList', '_idList', '_invertedIndicesMap',
    '_dimSummary', 'userOutput',
    '_rawData', '_dimValueGetter',
    '_nameDimIdx', '_idDimIdx', '_nameRepeatCount'
];

const CLONE_PROPERTIES = [
    '_approximateExtent'
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
    symbolOffset?: string | number | (string | number)[]

    liftZ?: number
    // For legend.
    legendIcon?: string
    legendLineStyle?: LineStyleProps

    // visualMap will inject visualMeta data
    visualMeta?: VisualMeta[]

    // If color is encoded from palette
    colorFromPalette?: boolean

    decal?: DecalObject
}

export interface DataCalculationInfo<SERIES_MODEL> {
    stackedDimension: DimensionName;
    stackedByDimension: DimensionName;
    isStackedByIndex: boolean;
    stackedOverDimension: DimensionName;
    stackResultDimension: DimensionName;
    stackedOnSeries?: SERIES_MODEL;
}

// -----------------------------
// Internal method declarations:
// -----------------------------
let prepareInvertedIndex: (data: SeriesData) => void;
let getId: (data: SeriesData, rawIndex: number) => string;
let getIdNameFromStore: (data: SeriesData, dimIdx: number, dataIdx: number) => string;
let normalizeDimensions: (dimensions: ItrParamDims) => Array<DimensionLoose>;
let transferProperties: (target: SeriesData, source: SeriesData) => void;
let cloneListForMapAndSample: (original: SeriesData) => SeriesData;
let makeIdFromName: (data: SeriesData, idx: number) => void;

class SeriesData<
    HostModel extends Model = Model,
    Visual extends DefaultDataVisual = DefaultDataVisual
> {

    readonly type = 'list';

    /**
     * Name of dimensions list of SeriesData.
     *
     * @caution Carefully use the index of this array.
     * Because when DataStore is an extra high dimension(>30) dataset. We will only pick
     * the used dimensions from DataStore to avoid performance issue.
     */
    readonly dimensions: SeriesDimensionName[];

    // Information of each data dimension, like data type.
    private _dimInfos: Record<SeriesDimensionName, SeriesDimensionDefine>;

    private _dimOmitted = false;
    private _schema?: SeriesDataSchema;
    /**
     * @pending
     * Actually we do not really need to convert dimensionIndex to dimensionName
     * and do not need `_dimIdxToName` if we do everything internally based on dimension
     * index rather than dimension name.
     */
    private _dimIdxToName?: zrUtil.HashMap<DimensionName, DimensionIndex>;

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
     * Host tree if List is used to store tree nodes.
     */
    tree?: Tree;

    private _store: DataStore;

    private _nameList: string[] = [];
    private _idList: string[] = [];

    // Models of data option is stored sparse for optimizing memory cost
    // Never used yet (not used yet).
    // private _optionModels: Model[] = [];

    // Global visual properties after visual coding
    private _visual: Dictionary<any> = {};

    // Global layout properties.
    private _layout: Dictionary<any> = {};

    // Item visual properties after visual coding
    private _itemVisuals: Dictionary<any>[] = [];

    // Item layout properties after layout
    private _itemLayouts: any[] = [];

    // Graphic elements
    private _graphicEls: Element[] = [];

    // key: dim, value: extent
    private _approximateExtent: Record<SeriesDimensionName, [number, number]> = {};

    private _dimSummary: DimensionSummary;

    private _invertedIndicesMap: Record<SeriesDimensionName, ArrayLike<number>>;

    private _calculationInfo: DataCalculationInfo<HostModel> = {} as DataCalculationInfo<HostModel>;

    // User output info of this data.
    // DO NOT use it in other places!
    // When preparing user params for user callbacks, we have
    // to clone these inner data structures to prevent users
    // from modifying them to effect built-in logic. And for
    // performance consideration we make this `userOutput` to
    // avoid clone them too many times.
    userOutput: DimensionSummary['userOutput'];

    // Having detected that there is data item is non primitive type
    // (in type `OptionDataItemObject`).
    // Like `data: [ { value: xx, itemStyle: {...} }, ...]`
    // At present it only happen in `SOURCE_FORMAT_ORIGINAL`.
    hasItemOption: boolean = false;

    // id or name is used on dynamic data, mapping old and new items.
    // When generating id from name, avoid repeat.
    private _nameRepeatCount: NameRepeatCount;
    private _nameDimIdx: number;
    private _idDimIdx: number;

    private __wrappedMethods: string[];

    // Methods that create a new list based on this list should be listed here.
    // Notice that those method should `RETURN` the new list.
    TRANSFERABLE_METHODS = ['cloneShallow', 'downSample', 'lttbDownSample', 'map'] as const;
    // Methods that change indices of this list should be listed here.
    CHANGABLE_METHODS = ['filterSelf', 'selectRange'] as const;
    DOWNSAMPLE_METHODS = ['downSample', 'lttbDownSample'] as const;

    /**
     * @param dimensionsInput.dimensions
     *        For example, ['someDimName', {name: 'someDimName', type: 'someDimType'}, ...].
     *        Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
     */
    constructor(
        dimensionsInput: SeriesDataSchema | SeriesDimensionDefineLoose[],
        hostModel: HostModel
    ) {
        let dimensions: SeriesDimensionDefineLoose[];
        let assignStoreDimIdx = false;
        if (isSeriesDataSchema(dimensionsInput)) {
            dimensions = dimensionsInput.dimensions;
            this._dimOmitted = dimensionsInput.isDimensionOmitted();
            this._schema = dimensionsInput;
        }
        else {
            assignStoreDimIdx = true;
            dimensions = dimensionsInput as SeriesDimensionDefineLoose[];
        }

        dimensions = dimensions || ['x', 'y'];

        const dimensionInfos: Dictionary<SeriesDimensionDefine> = {};
        const dimensionNames = [];
        const invertedIndicesMap: Dictionary<number[]> = {};
        let needsHasOwn = false;
        const emptyObj = {};

        for (let i = 0; i < dimensions.length; i++) {
            // Use the original dimensions[i], where other flag props may exists.
            const dimInfoInput = dimensions[i];

            const dimensionInfo: SeriesDimensionDefine =
                zrUtil.isString(dimInfoInput)
                ? new SeriesDimensionDefine({name: dimInfoInput})
                : !(dimInfoInput instanceof SeriesDimensionDefine)
                ? new SeriesDimensionDefine(dimInfoInput)
                : dimInfoInput;

            const dimensionName = dimensionInfo.name;
            dimensionInfo.type = dimensionInfo.type || 'float';
            if (!dimensionInfo.coordDim) {
                dimensionInfo.coordDim = dimensionName;
                dimensionInfo.coordDimIndex = 0;
            }

            const otherDims = dimensionInfo.otherDims = dimensionInfo.otherDims || {};
            dimensionNames.push(dimensionName);
            dimensionInfos[dimensionName] = dimensionInfo;
            if ((emptyObj as any)[dimensionName] != null) {
                needsHasOwn = true;
            }

            if (dimensionInfo.createInvertedIndices) {
                invertedIndicesMap[dimensionName] = [];
            }
            if (otherDims.itemName === 0) {
                this._nameDimIdx = i;
            }
            if (otherDims.itemId === 0) {
                this._idDimIdx = i;
            }

            if (__DEV__) {
                zrUtil.assert(assignStoreDimIdx || dimensionInfo.storeDimIndex >= 0);
            }
            if (assignStoreDimIdx) {
                dimensionInfo.storeDimIndex = i;
            }
        }

        this.dimensions = dimensionNames;
        this._dimInfos = dimensionInfos;
        this._initGetDimensionInfo(needsHasOwn);

        this.hostModel = hostModel;

        this._invertedIndicesMap = invertedIndicesMap;

        if (this._dimOmitted) {
            const dimIdxToName = this._dimIdxToName = zrUtil.createHashMap<DimensionName, DimensionIndex>();
            zrUtil.each(dimensionNames, dimName => {
                dimIdxToName.set(dimensionInfos[dimName].storeDimIndex, dimName);
            });
        }
    }

    /**
     *
     * Get concrete dimension name by dimension name or dimension index.
     * If input a dimension name, do not validate whether the dimension name exits.
     *
     * @caution
     * @param dim Must make sure the dimension is `SeriesDimensionLoose`.
     * Because only those dimensions will have auto-generated dimension names if not
     * have a user-specified name, and other dimensions will get a return of null/undefined.
     *
     * @notice Because of this reason, should better use `getDimensionIndex` instead, for examples:
     * ```js
     * const val = data.getStore().get(data.getDimensionIndex(dim), dataIdx);
     * ```
     *
     * @return Concrete dim name.
     */
    getDimension(dim: SeriesDimensionLoose): DimensionName {
        let dimIdx = this._recognizeDimIndex(dim);
        if (dimIdx == null) {
            return dim as DimensionName;
        }
        dimIdx = dim as DimensionIndex;

        if (!this._dimOmitted) {
            return this.dimensions[dimIdx];
        }

        // Retrieve from series dimension definition because it probably contains
        // generated dimension name (like 'x', 'y').
        const dimName = this._dimIdxToName.get(dimIdx);
        if (dimName != null) {
            return dimName;
        }

        const sourceDimDef = this._schema.getSourceDimension(dimIdx);
        if (sourceDimDef) {
            return sourceDimDef.name;
        }
    }

    /**
     * Get dimension index in data store. Return -1 if not found.
     * Can be used to index value from getRawValue.
     */
    getDimensionIndex(dim: DimensionLoose): DimensionIndex {
        const dimIdx = this._recognizeDimIndex(dim);
        if (dimIdx != null) {
            return dimIdx;
        }

        if (dim == null) {
            return -1;
        }

        const dimInfo = this._getDimInfo(dim as DimensionName);
        return dimInfo
            ? dimInfo.storeDimIndex
            : this._dimOmitted
            ? this._schema.getSourceDimensionIndex(dim as DimensionName)
            : -1;
    }

    /**
     * The meanings of the input parameter `dim`:
     *
     * + If dim is a number (e.g., `1`), it means the index of the dimension.
     *   For example, `getDimension(0)` will return 'x' or 'lng' or 'radius'.
     * + If dim is a number-like string (e.g., `"1"`):
     *     + If there is the same concrete dim name defined in `series.dimensions` or `dataset.dimensions`,
     *        it means that concrete name.
     *     + If not, it will be converted to a number, which means the index of the dimension.
     *        (why? because of the backward compatibility. We have been tolerating number-like string in
     *        dimension setting, although now it seems that it is not a good idea.)
     *     For example, `visualMap[i].dimension: "1"` is the same meaning as `visualMap[i].dimension: 1`,
     *     if no dimension name is defined as `"1"`.
     * + If dim is a not-number-like string, it means the concrete dim name.
     *   For example, it can be be default name `"x"`, `"y"`, `"z"`, `"lng"`, `"lat"`, `"angle"`, `"radius"`,
     *   or customized in `dimensions` property of option like `"age"`.
     *
     * @return recognized `DimensionIndex`. Otherwise return null/undefined (means that dim is `DimensionName`).
     */
    private _recognizeDimIndex(dim: DimensionLoose): DimensionIndex {
        if (zrUtil.isNumber(dim)
            // If being a number-like string but not being defined as a dimension name.
            || (
                dim != null
                && !isNaN(dim as any)
                && !this._getDimInfo(dim)
                && (!this._dimOmitted || this._schema.getSourceDimensionIndex(dim) < 0)
            )
        ) {
            return +dim;
        }
    }

    private _getStoreDimIndex(dim: DimensionLoose): DimensionIndex {
        const dimIdx = this.getDimensionIndex(dim);
        if (__DEV__) {
            if (dimIdx == null) {
                throw new Error('Unknown dimension ' + dim);
            }
        }
        return dimIdx;
    }

    /**
     * Get type and calculation info of particular dimension
     * @param dim
     *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
     *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
     */
    getDimensionInfo(dim: SeriesDimensionLoose): SeriesDimensionDefine {
        // Do not clone, because there may be categories in dimInfo.
        return this._getDimInfo(this.getDimension(dim));
    }

    /**
     * If `dimName` if from outside of `SeriesData`,
     * use this method other than visit `this._dimInfos` directly.
     */
    private _getDimInfo: (dimName: SeriesDimensionName) => SeriesDimensionDefine;

    private _initGetDimensionInfo(needsHasOwn: boolean): void {
        const dimensionInfos = this._dimInfos;
        this._getDimInfo = needsHasOwn
            ? dimName => (dimensionInfos.hasOwnProperty(dimName) ? dimensionInfos[dimName] : undefined)
            : dimName => dimensionInfos[dimName];
    }

    /**
     * concrete dimension name list on coord.
     */
    getDimensionsOnCoord(): SeriesDimensionName[] {
        return this._dimSummary.dataDimsOnCoord.slice();
    }

    /**
     * @param coordDim
     * @param idx A coordDim may map to more than one data dim.
     *        If not specified, return the first dim not extra.
     * @return concrete data dim. If not found, return null/undefined
     */
    mapDimension(coordDim: SeriesDimensionName): SeriesDimensionName;
    mapDimension(coordDim: SeriesDimensionName, idx: number): SeriesDimensionName;
    mapDimension(coordDim: SeriesDimensionName, idx?: number): SeriesDimensionName {
        const dimensionsSummary = this._dimSummary;

        if (idx == null) {
            return dimensionsSummary.encodeFirstDimNotExtra[coordDim] as any;
        }

        const dims = dimensionsSummary.encode[coordDim];
        return dims ? dims[idx as number] as any : null;
    }

    mapDimensionsAll(coordDim: SeriesDimensionName): SeriesDimensionName[] {
        const dimensionsSummary = this._dimSummary;
        const dims = dimensionsSummary.encode[coordDim];
        return (dims || []).slice();
    }

    getStore() {
        return this._store;
    }

    /**
     * Initialize from data
     * @param data source or data or data store.
     * @param nameList The name of a datum is used on data diff and
     *        default label/tooltip.
     *        A name can be specified in encode.itemName,
     *        or dataItem.name (only for series option data),
     *        or provided in nameList from outside.
     */
    initData(
        data: Source | OptionSourceData | DataStore | DataProvider,
        nameList?: string[],
        dimValueGetter?: DimValueGetter
    ): void {
        let store: DataStore;
        if (data instanceof DataStore) {
            store = data;
        }

        if (!store) {
            const dimensions = this.dimensions;
            const provider = (isSourceInstance(data) || zrUtil.isArrayLike(data))
                ? new DefaultDataProvider(data as Source | OptionSourceData, dimensions.length)
                : data as DataProvider;
            store = new DataStore();
            const dimensionInfos: DataStoreDimensionDefine[] = map(dimensions, dimName => ({
                type: this._dimInfos[dimName].type,
                property: dimName
            }));
            store.initData(provider, dimensionInfos, dimValueGetter);
        }

        this._store = store;

        // Reset
        this._nameList = (nameList || []).slice();
        this._idList = [];
        this._nameRepeatCount = {};

        this._doInit(0, store.count());

        // Cache summary info for fast visit. See "dimensionHelper".
        // Needs to be initialized after store is prepared.
        this._dimSummary = summarizeDimensions(this, this._schema);
        this.userOutput = this._dimSummary.userOutput;
    }

    /**
     * Caution: Can be only called on raw data (before `this._indices` created).
     */
    appendData(data: ArrayLike<any>): void {
        const range = this._store.appendData(data);
        this._doInit(range[0], range[1]);
    }
    /**
     * Caution: Can be only called on raw data (before `this._indices` created).
     * This method does not modify `rawData` (`dataProvider`), but only
     * add values to store.
     *
     * The final count will be increased by `Math.max(values.length, names.length)`.
     *
     * @param values That is the SourceType: 'arrayRows', like
     *        [
     *            [12, 33, 44],
     *            [NaN, 43, 1],
     *            ['-', 'asdf', 0]
     *        ]
     *        Each item is exactly corresponding to a dimension.
     */
    appendValues(values: any[][], names?: string[]): void {
        const {start, end} = this._store.appendValues(values, names.length);
        const shouldMakeIdFromName = this._shouldMakeIdFromName();

        this._updateOrdinalMeta();

        if (names) {
            for (let idx = start; idx < end; idx++) {
                const sourceIdx = idx - start;
                this._nameList[idx] = names[sourceIdx];
                if (shouldMakeIdFromName) {
                    makeIdFromName(this, idx);
                }
            }
        }
    }

    private _updateOrdinalMeta(): void {
        const store = this._store;
        const dimensions = this.dimensions;
        for (let i = 0; i < dimensions.length; i++) {
            const dimInfo = this._dimInfos[dimensions[i]];
            if (dimInfo.ordinalMeta) {
                store.collectOrdinalMeta(dimInfo.storeDimIndex, dimInfo.ordinalMeta);
            }
        }
    }

    private _shouldMakeIdFromName(): boolean {
        const provider = this._store.getProvider();
        return this._idDimIdx == null
            && provider.getSource().sourceFormat !== SOURCE_FORMAT_TYPED_ARRAY
            && !provider.fillStorage;
    }

    private _doInit(start: number, end: number): void {
        if (start >= end) {
            return;
        }

        const store = this._store;
        const provider = store.getProvider();

        this._updateOrdinalMeta();

        const nameList = this._nameList;
        const idList = this._idList;
        const sourceFormat = provider.getSource().sourceFormat;
        const isFormatOriginal = sourceFormat === SOURCE_FORMAT_ORIGINAL;

        // Each data item is value
        // [1, 2]
        // 2
        // Bar chart, line chart which uses category axis
        // only gives the 'y' value. 'x' value is the indices of category
        // Use a tempValue to normalize the value to be a (x, y) value
        // If dataItem is {name: ...} or {id: ...}, it has highest priority.
        // This kind of ids and names are always stored `_nameList` and `_idList`.
        if (isFormatOriginal && !provider.pure) {
            const sharedDataItem = [] as OptionDataItem;
            for (let idx = start; idx < end; idx++) {
                // NOTICE: Try not to write things into dataItem
                const dataItem = provider.getItem(idx, sharedDataItem);
                if (!this.hasItemOption && isDataItemOption(dataItem)) {
                    this.hasItemOption = true;
                }
                if (dataItem) {
                    const itemName = (dataItem as any).name;
                    if (nameList[idx] == null && itemName != null) {
                        nameList[idx] = convertOptionIdName(itemName, null);
                    }
                    const itemId = (dataItem as any).id;
                    if (idList[idx] == null && itemId != null) {
                        idList[idx] = convertOptionIdName(itemId, null);
                    }
                }
            }
        }

        if (this._shouldMakeIdFromName()) {
            for (let idx = start; idx < end; idx++) {
                makeIdFromName(this, idx);
            }
        }

        prepareInvertedIndex(this);
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
    getApproximateExtent(dim: SeriesDimensionLoose): [number, number] {
        return this._approximateExtent[dim] || this._store.getDataExtent(this._getStoreDimIndex(dim));
    }

    /**
     * Calculate extent on a filtered data might be time consuming.
     * Approximate extent is only used for: calculate extent of filtered data outside.
     */
    setApproximateExtent(extent: [number, number], dim: SeriesDimensionLoose): void {
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
     * @return Never be null/undefined. `number` will be converted to string. Because:
     * In most cases, name is used in display, where returning a string is more convenient.
     * In other cases, name is used in query (see `indexOfName`), where we can keep the
     * rule that name `2` equals to name `'2'`.
     */
    getName(idx: number): string {
        const rawIndex = this.getRawIndex(idx);
        let name = this._nameList[rawIndex];
        if (name == null && this._nameDimIdx != null) {
            name = getIdNameFromStore(this, this._nameDimIdx, rawIndex);
        }
        if (name == null) {
            name = '';
        }
        return name;
    }

    private _getCategory(dimIdx: number, idx: number): OrdinalRawValue {
        const ordinal = this._store.get(dimIdx, idx);
        const ordinalMeta = this._store.getOrdinalMeta(dimIdx);
        if (ordinalMeta) {
            return ordinalMeta.categories[ordinal as OrdinalNumber];
        }
        return ordinal;
    }

    /**
     * @return Never null/undefined. `number` will be converted to string. Because:
     * In all cases having encountered at present, id is used in making diff comparison, which
     * are usually based on hash map. We can keep the rule that the internal id are always string
     * (treat `2` is the same as `'2'`) to make the related logic simple.
     */
    getId(idx: number): string {
        return getId(this, this.getRawIndex(idx));
    }

    count(): number {
        return this._store.count();
    }

    /**
     * Get value. Return NaN if idx is out of range.
     *
     * @notice Should better to use `data.getStore().get(dimIndex, dataIdx)` instead.
     */
    get(dim: SeriesDimensionName, idx: number): ParsedValue {
        const store = this._store;
        const dimInfo = this._dimInfos[dim];
        if (dimInfo) {
            return store.get(dimInfo.storeDimIndex, idx);
        }
    }

    /**
     * @notice Should better to use `data.getStore().getByRawIndex(dimIndex, dataIdx)` instead.
     */
    getByRawIndex(dim: SeriesDimensionName, rawIdx: number): ParsedValue {
        const store = this._store;
        const dimInfo = this._dimInfos[dim];
        if (dimInfo) {
            return store.getByRawIndex(dimInfo.storeDimIndex, rawIdx);
        }
    }

    getIndices() {
        return this._store.getIndices();
    }

    getDataExtent(dim: DimensionLoose): [number, number] {
        return this._store.getDataExtent(this._getStoreDimIndex(dim));
    }

    getSum(dim: DimensionLoose): number {
        return this._store.getSum(this._getStoreDimIndex(dim));
    }

    getMedian(dim: DimensionLoose): number {
        return this._store.getMedian(this._getStoreDimIndex(dim));
    }
    /**
     * Get value for multi dimensions.
     * @param dimensions If ignored, using all dimensions.
     */
    getValues(idx: number): ParsedValue[];
    getValues(dimensions: readonly DimensionName[], idx: number): ParsedValue[];
    getValues(dimensions: readonly DimensionName[] | number, idx?: number): ParsedValue[] {
        const store = this._store;
        return zrUtil.isArray(dimensions)
            ? store.getValues(map(dimensions, dim => this._getStoreDimIndex(dim)), idx)
            : store.getValues(dimensions as number);
    }

    /**
     * If value is NaN. Including '-'
     * Only check the coord dimensions.
     */
    hasValue(idx: number): boolean {
        const dataDimIndicesOnCoord = this._dimSummary.dataDimIndicesOnCoord;
        for (let i = 0, len = dataDimIndicesOnCoord.length; i < len; i++) {
            // Ordinal type originally can be string or number.
            // But when an ordinal type is used on coord, it can
            // not be string but only number. So we can also use isNaN.
            if (isNaN(this._store.get(dataDimIndicesOnCoord[i], idx) as any)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Retrieve the index with given name
     */
    indexOfName(name: string): number {
        for (let i = 0, len = this._store.count(); i < len; i++) {
            if (this.getName(i) === name) {
                return i;
            }
        }
        return -1;
    }

    getRawIndex(idx: number): number {
        return this._store.getRawIndex(idx);
    }

    indexOfRawIndex(rawIndex: number): number {
        return this._store.indexOfRawIndex(rawIndex);
    }

    /**
     * Only support the dimension which inverted index created.
     * Do not support other cases until required.
     * @param dim concrete dim
     * @param value ordinal index
     * @return rawIndex
     */
    rawIndexOf(dim: SeriesDimensionName, value: OrdinalNumber): number {
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
     * Retrieve the index of nearest value
     * @param dim
     * @param value
     * @param [maxDistance=Infinity]
     * @return If and only if multiple indices has
     *         the same value, they are put to the result.
     */
    indicesOfNearest(dim: DimensionLoose, value: number, maxDistance?: number): number[] {
        return this._store.indicesOfNearest(
            this._getStoreDimIndex(dim),
            value, maxDistance
        );
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
    each<Ctx>(dims: DimensionLoose, cb: EachCb1<Ctx>, ctx?: Ctx): void;
    each<Ctx>(dims: [DimensionLoose], cb: EachCb1<Ctx>, ctx?: Ctx): void;
    each<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: EachCb2<Ctx>, ctx?: Ctx): void;
    each<Ctx>(dims: ItrParamDims, cb: EachCb<Ctx>, ctx?: Ctx): void;
    each<Ctx>(
        dims: ItrParamDims | EachCb<Ctx>,
        cb: EachCb<Ctx> | Ctx,
        ctx?: Ctx
    ): void {
        'use strict';

        if (zrUtil.isFunction(dims)) {
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || this) as CtxOrList<Ctx>;

        const dimIndices = map(normalizeDimensions(dims), this._getStoreDimIndex, this);

        this._store.each(dimIndices, (fCtx
            ? zrUtil.bind(cb as any, fCtx as any)
            : cb) as any
        );
    }
    /**
     * Data filter
     */
    filterSelf<Ctx>(cb: FilterCb0<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): this;
    filterSelf<Ctx>(dims: DimensionLoose, cb: FilterCb1<Ctx>, ctx?: Ctx): this;
    filterSelf<Ctx>(dims: [DimensionLoose], cb: FilterCb1<Ctx>, ctx?: Ctx): this;
    filterSelf<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: FilterCb2<Ctx>, ctx?: Ctx): this;
    filterSelf<Ctx>(dims: ItrParamDims, cb: FilterCb<Ctx>, ctx?: Ctx): this;
    filterSelf<Ctx>(
        dims: ItrParamDims | FilterCb<Ctx>,
        cb: FilterCb<Ctx> | Ctx,
        ctx?: Ctx
    ): SeriesData {
        'use strict';

        if (zrUtil.isFunction(dims)) {
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || this) as CtxOrList<Ctx>;

        const dimIndices = map(normalizeDimensions(dims), this._getStoreDimIndex, this);

        this._store = this._store.filter(dimIndices, (fCtx
            ? zrUtil.bind(cb as any, fCtx as any)
            : cb) as any
        );

        return this;
    }

    /**
     * Select data in range. (For optimization of filter)
     * (Manually inline code, support 5 million data filtering in data zoom.)
     */
    selectRange(range: Record<string, [number, number]>): SeriesData {
        'use strict';

        const innerRange: Record<number, [number, number]> = {};
        const dims = zrUtil.keys(range);
        const dimIndices: number[] = [];
        zrUtil.each(dims, (dim) => {
            const dimIdx = this._getStoreDimIndex(dim);
            innerRange[dimIdx] = range[dim];
            dimIndices.push(dimIdx);
        });

        this._store = this._store.selectRange(innerRange);
        return this;
    }

    /**
     * Data mapping to a plain array
     */
    mapArray<Ctx, Cb extends MapArrayCb0<Ctx>>(cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    /* eslint-disable max-len */
    mapArray<Ctx, Cb extends MapArrayCb1<Ctx>>(dims: DimensionLoose, cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb1<Ctx>>(dims: [DimensionLoose], cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb2<Ctx>>(dims: [DimensionLoose, DimensionLoose], cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    mapArray<Ctx, Cb extends MapArrayCb<Ctx>>(dims: ItrParamDims, cb: Cb, ctx?: Ctx, ctxCompat?: Ctx): ReturnType<Cb>[];
    /* eslint-enable max-len */
    mapArray<Ctx>(
        dims: ItrParamDims | MapArrayCb<Ctx>,
        cb: MapArrayCb<Ctx> | Ctx,
        ctx?: Ctx
    ): unknown[] {
        'use strict';

        if (zrUtil.isFunction(dims)) {
            ctx = cb as Ctx;
            cb = dims;
            dims = [];
        }

        // ctxCompat just for compat echarts3
        ctx = (ctx || this) as Ctx;

        const result: unknown[] = [];
        this.each(dims, function () {
            result.push(cb && (cb as MapArrayCb<Ctx>).apply(this, arguments));
        }, ctx);
        return result;
    }

    /**
     * Data mapping to a new List with given dimensions
     */
    map<Ctx>(dims: DimensionLoose, cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): SeriesData<HostModel>;
    map<Ctx>(dims: [DimensionLoose], cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): SeriesData<HostModel>;
    // eslint-disable-next-line max-len
    map<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: MapCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): SeriesData<HostModel>;
    map<Ctx>(
        dims: ItrParamDims,
        cb: MapCb<Ctx>,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): SeriesData {
        'use strict';

        // ctxCompat just for compat echarts3
        const fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        const dimIndices = map(
            normalizeDimensions(dims), this._getStoreDimIndex, this
        );

        const list = cloneListForMapAndSample(this);
        list._store = this._store.map(
            dimIndices,
            fCtx ? zrUtil.bind(cb, fCtx) : cb
        );
        return list;
    }

    /**
     * !!Danger: used on stack dimension only.
     */
    modify<Ctx>(dims: DimensionLoose, cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    modify<Ctx>(dims: [DimensionLoose], cb: MapCb1<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    modify<Ctx>(dims: [DimensionLoose, DimensionLoose], cb: MapCb2<Ctx>, ctx?: Ctx, ctxCompat?: Ctx): void;
    modify<Ctx>(
        dims: ItrParamDims,
        cb: MapCb<Ctx>,
        ctx?: Ctx,
        ctxCompat?: Ctx
    ): void {
        // ctxCompat just for compat echarts3
        const fCtx = (ctx || ctxCompat || this) as CtxOrList<Ctx>;

        if (__DEV__) {
            zrUtil.each(normalizeDimensions(dims), dim => {
                const dimInfo = this.getDimensionInfo(dim);
                if (!dimInfo.isCalculationCoord) {
                    console.error('Danger: only stack dimension can be modified');
                }
            });
        }

        const dimIndices = map(
            normalizeDimensions(dims), this._getStoreDimIndex, this
        );

        // If do shallow clone here, if there are too many stacked series,
        // it still cost lots of memory, because `_store.dimensions` are not shared.
        // We should consider there probably be shallow clone happen in each series
        // in consequent filter/map.
        this._store.modify(
            dimIndices,
            fCtx ? zrUtil.bind(cb, fCtx) : cb
        );
    }

    /**
     * Large data down sampling on given dimension
     * @param sampleIndex Sample index for name and id
     */
    downSample(
        dimension: DimensionLoose,
        rate: number,
        sampleValue: (frameValues: ArrayLike<ParsedValue>) => ParsedValueNumeric,
        sampleIndex: (frameValues: ArrayLike<ParsedValue>, value: ParsedValueNumeric) => number
    ): SeriesData<HostModel> {
        const list = cloneListForMapAndSample(this);
        list._store = this._store.downSample(
            this._getStoreDimIndex(dimension),
            rate,
            sampleValue,
            sampleIndex
        );
        return list as SeriesData<HostModel>;
    }

    /**
     * Large data down sampling using largest-triangle-three-buckets
     * @param {string} valueDimension
     * @param {number} targetCount
     */
    lttbDownSample(
        valueDimension: DimensionLoose,
        rate: number
    ): SeriesData<HostModel> {
        const list = cloneListForMapAndSample(this);
        list._store = this._store.lttbDownSample(
            this._getStoreDimIndex(valueDimension),
            rate
        );
        return list as SeriesData<HostModel>;
    }

    getRawDataItem(idx: number) {
        return this._store.getRawDataItem(idx);
    }

    /**
     * Get model of one data item.
     */
    // TODO: Type of data item
    getItemModel<ItemOpts extends unknown = unknown>(idx: number): Model<ItemOpts
        // Extract item option with value key. FIXME will cause incompatible issue
        // Extract<HostModel['option']['data'][number], { value?: any }>
    > {
        const hostModel = this.hostModel;
        const dataItem = this.getRawDataItem(idx) as ModelOption;
        return new Model(dataItem, hostModel, hostModel && hostModel.ecModel);
    }

    /**
     * Create a data differ
     */
    diff(otherList: SeriesData): DataDiffer {
        const thisList = this;

        return new DataDiffer(
            otherList ? otherList.getStore().getIndices() : [],
            this.getStore().getIndices(),
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
     * If exists visual property of single data item
     */
    hasItemVisual() {
        return this._itemVisuals.length > 0;
    }

    /**
     * Make sure itemVisual property is unique
     */
    // TODO: use key to save visual to reduce memory.
    ensureUniqueItemVisual<K extends keyof Visual>(idx: number, key: K): Visual[K] {
        const itemVisuals = this._itemVisuals;
        let itemVisual = itemVisuals[idx] as Visual;
        if (!itemVisual) {
            itemVisual = itemVisuals[idx] = {} as Visual;
        }
        let val = itemVisual[key];
        if (val == null) {
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
        isObject(key)
            ? zrUtil.extend(this._layout, key)
            : (this._layout[key] = val);
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
        const seriesIndex = this.hostModel && (this.hostModel as any).seriesIndex;

        setCommonECData(seriesIndex, this.dataType, idx, el);

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
    cloneShallow(list?: SeriesData<HostModel>): SeriesData<HostModel> {
        if (!list) {
            list = new SeriesData(
                this._schema
                    ? this._schema
                    : map(this.dimensions, this._getDimInfo, this),
                this.hostModel
            );
        }

        transferProperties(list, this);
        list._store = this._store;

        return list;
    }

    /**
     * Wrap some method to add more feature
     */
    wrapMethod(
        methodName: FunctionPropertyNames<SeriesData>,
        injectFunction: (...args: any) => any
    ): void {
        const originalMethod = this[methodName];
        if (!zrUtil.isFunction(originalMethod)) {
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

        prepareInvertedIndex = function (data: SeriesData): void {
            const invertedIndicesMap = data._invertedIndicesMap;
            zrUtil.each(invertedIndicesMap, function (invertedIndices, dim) {
                const dimInfo = data._dimInfos[dim];
                // Currently, only dimensions that has ordinalMeta can create inverted indices.
                const ordinalMeta = dimInfo.ordinalMeta;
                const store = data._store;
                if (ordinalMeta) {
                    invertedIndices = invertedIndicesMap[dim] = new CtorInt32Array(
                        ordinalMeta.categories.length
                    );
                    // The default value of TypedArray is 0. To avoid miss
                    // mapping to 0, we should set it as INDEX_NOT_FOUND.
                    for (let i = 0; i < invertedIndices.length; i++) {
                        invertedIndices[i] = INDEX_NOT_FOUND;
                    }
                    for (let i = 0; i < store.count(); i++) {
                        // Only support the case that all values are distinct.
                        invertedIndices[store.get(dimInfo.storeDimIndex, i) as number] = i;
                    }
                }
            });
        };

        getIdNameFromStore = function (
            data: SeriesData, dimIdx: number, idx: number
        ): string {
            return convertOptionIdName(data._getCategory(dimIdx, idx), null);
        };

        /**
         * @see the comment of `List['getId']`.
         */
        getId = function (data: SeriesData, rawIndex: number): string {
            let id = data._idList[rawIndex];
            if (id == null && data._idDimIdx != null) {
                id = getIdNameFromStore(data, data._idDimIdx, rawIndex);
            }
            if (id == null) {
                id = ID_PREFIX + rawIndex;
            }
            return id;
        };

        normalizeDimensions = function (
            dimensions: ItrParamDims
        ): Array<DimensionLoose> {
            if (!zrUtil.isArray(dimensions)) {
                dimensions = dimensions != null ? [dimensions] : [];
            }
            return dimensions;
        };

        /**
         * Data in excludeDimensions is copied, otherwise transferred.
         */
        cloneListForMapAndSample = function (original: SeriesData): SeriesData {
            const list = new SeriesData(
                original._schema
                    ? original._schema
                    : map(original.dimensions, original._getDimInfo, original),
                original.hostModel
            );
            // FIXME If needs stackedOn, value may already been stacked
            transferProperties(list, original);
            return list;
        };

        transferProperties = function (target: SeriesData, source: SeriesData): void {
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
        makeIdFromName = function (data: SeriesData, idx: number): void {
            const nameList = data._nameList;
            const idList = data._idList;
            const nameDimIdx = data._nameDimIdx;
            const idDimIdx = data._idDimIdx;

            let name = nameList[idx];
            let id = idList[idx];

            if (name == null && nameDimIdx != null) {
                nameList[idx] = name = getIdNameFromStore(data, nameDimIdx, idx);
            }
            if (id == null && idDimIdx != null) {
                idList[idx] = id = getIdNameFromStore(data, idDimIdx, idx);
            }
            if (id == null && name != null) {
                const nameRepeatCount = data._nameRepeatCount;
                const nmCnt = nameRepeatCount[name] = (nameRepeatCount[name] || 0) + 1;
                id = name;
                if (nmCnt > 1) {
                    id += '__ec__' + nmCnt;
                }
                idList[idx] = id;
            }
        };
    })();

}

interface SeriesData {
    getLinkedData(dataType?: SeriesDataType): SeriesData;
    getLinkedDataAll(): { data: SeriesData, type?: SeriesDataType }[];
}

export default SeriesData;
