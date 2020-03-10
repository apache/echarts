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
import Source from './Source';
import {defaultDimValueGetters, DefaultDataProvider} from './helper/dataProvider';
import {summarizeDimensions} from './helper/dimensionHelper';
import DataDimensionInfo from './DataDimensionInfo';

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

// Caution: MUST not use `new CtorUint32Array(arr, 0, len)`, because the Ctor of array is
// different from the Ctor of typed array.
var CtorUint32Array = typeof Uint32Array === UNDEFINED ? Array : Uint32Array;
var CtorInt32Array = typeof Int32Array === UNDEFINED ? Array : Int32Array;
var CtorUint16Array = typeof Uint16Array === UNDEFINED ? Array : Uint16Array;

function getIndicesCtor(list) {
    // The possible max value in this._indicies is always this._rawCount despite of filtering.
    return list._rawCount > 65535 ? CtorUint32Array : CtorUint16Array;
}

function cloneChunk(originalChunk) {
    var Ctor = originalChunk.constructor;
    // Only shallow clone is enough when Array.
    return Ctor === Array ? originalChunk.slice() : new Ctor(originalChunk);
}

var TRANSFERABLE_PROPERTIES = [
    'hasItemOption', '_nameList', '_idList', '_invertedIndicesMap',
    '_rawData', '_chunkSize', '_chunkCount', '_dimValueGetter',
    '_count', '_rawCount', '_nameDimIdx', '_idDimIdx'
];
var CLONE_PROPERTIES = [
    '_extent', '_approximateExtent', '_rawExtent'
];

function transferProperties(target, source) {
    zrUtil.each(TRANSFERABLE_PROPERTIES.concat(source.__wrappedMethods || []), function (propName) {
        if (source.hasOwnProperty(propName)) {
            target[propName] = source[propName];
        }
    });

    target.__wrappedMethods = source.__wrappedMethods;

    zrUtil.each(CLONE_PROPERTIES, function (propName) {
        target[propName] = zrUtil.clone(source[propName]);
    });

    target._calculationInfo = zrUtil.extend(source._calculationInfo);
}





/**
 * @constructor
 * @alias module:echarts/data/List
 *
 * @param {Array.<string|Object|module:data/DataDimensionInfo>} dimensions
 *      For example, ['someDimName', {name: 'someDimName', type: 'someDimType'}, ...].
 *      Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
 * @param {module:echarts/model/Model} hostModel
 */
var List = function (dimensions, hostModel) {

    dimensions = dimensions || ['x', 'y'];

    var dimensionInfos = {};
    var dimensionNames = [];
    var invertedIndicesMap = {};

    for (var i = 0; i < dimensions.length; i++) {
        // Use the original dimensions[i], where other flag props may exists.
        var dimensionInfo = dimensions[i];

        if (zrUtil.isString(dimensionInfo)) {
            dimensionInfo = new DataDimensionInfo({name: dimensionInfo});
        }
        else if (!(dimensionInfo instanceof DataDimensionInfo)) {
            dimensionInfo = new DataDimensionInfo(dimensionInfo);
        }

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

    /**
     * @readOnly
     * @type {Array.<string>}
     */
    this.dimensions = dimensionNames;

    /**
     * Infomation of each data dimension, like data type.
     * @type {Object}
     */
    this._dimensionInfos = dimensionInfos;

    /**
     * @type {module:echarts/model/Model}
     */
    this.hostModel = hostModel;

    /**
     * @type {module:echarts/model/Model}
     */
    this.dataType;

    /**
     * Indices stores the indices of data subset after filtered.
     * This data subset will be used in chart.
     * @type {Array.<number>}
     * @readOnly
     */
    this._indices = null;

    this._count = 0;
    this._rawCount = 0;

    /**
     * Data storage
     * @type {Object.<key, Array.<TypedArray|Array>>}
     * @private
     */
    this._storage = {};

    /**
     * @type {Array.<string>}
     */
    this._nameList = [];
    /**
     * @type {Array.<string>}
     */
    this._idList = [];

    /**
     * Models of data option is stored sparse for optimizing memory cost
     * @type {Array.<module:echarts/model/Model>}
     * @private
     */
    this._optionModels = [];

    /**
     * Global visual properties after visual coding
     * @type {Object}
     * @private
     */
    this._visual = {};

    /**
     * Globel layout properties.
     * @type {Object}
     * @private
     */
    this._layout = {};

    /**
     * Item visual properties after visual coding
     * @type {Array.<Object>}
     * @private
     */
    this._itemVisuals = [];

    /**
     * Key: visual type, Value: boolean
     * @type {Object}
     * @readOnly
     */
    this.hasItemVisual = {};

    /**
     * Item layout properties after layout
     * @type {Array.<Object>}
     * @private
     */
    this._itemLayouts = [];

    /**
     * Graphic elemnents
     * @type {Array.<module:zrender/Element>}
     * @private
     */
    this._graphicEls = [];

    /**
     * Max size of each chunk.
     * @type {number}
     * @private
     */
    this._chunkSize = 1e5;

    /**
     * @type {number}
     * @private
     */
    this._chunkCount = 0;

    /**
     * @type {Array.<Array|Object>}
     * @private
     */
    this._rawData;

    /**
     * Raw extent will not be cloned, but only transfered.
     * It will not be calculated util needed.
     * key: dim,
     * value: {end: number, extent: Array.<number>}
     * @type {Object}
     * @private
     */
    this._rawExtent = {};

    /**
     * @type {Object}
     * @private
     */
    this._extent = {};

    /**
     * key: dim
     * value: extent
     * @type {Object}
     * @private
     */
    this._approximateExtent = {};

    /**
     * Cache summary info for fast visit. See "dimensionHelper".
     * @type {Object}
     * @private
     */
    this._dimensionsSummary = summarizeDimensions(this);

    /**
     * @type {Object.<Array|TypedArray>}
     * @private
     */
    this._invertedIndicesMap = invertedIndicesMap;

    /**
     * @type {Object}
     * @private
     */
    this._calculationInfo = {};

    /**
     * User output info of this data.
     * DO NOT use it in other places!
     *
     * When preparing user params for user callbacks, we have
     * to clone these inner data structures to prevent users
     * from modifying them to effect built-in logic. And for
     * performance consideration we make this `userOutput` to
     * avoid clone them too many times.
     *
     * @type {Object}
     * @readOnly
     */
    this.userOutput = this._dimensionsSummary.userOutput;
};

var listProto = List.prototype;

listProto.type = 'list';

/**
 * If each data item has it's own option
 * @type {boolean}
 */
listProto.hasItemOption = true;

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
 * @param {string|number} dim See above.
 * @return {string} Concrete dim name.
 */
listProto.getDimension = function (dim) {
    if (typeof dim === 'number'
        // If being a number-like string but not being defined a dimension name.
        || (!isNaN(dim) && !this._dimensionInfos.hasOwnProperty(dim))
    ) {
        dim = this.dimensions[dim];
    }
    return dim;
};

/**
 * Get type and calculation info of particular dimension
 * @param {string|number} dim
 *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
 *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
 */
listProto.getDimensionInfo = function (dim) {
    // Do not clone, because there may be categories in dimInfo.
    return this._dimensionInfos[this.getDimension(dim)];
};

/**
 * @return {Array.<string>} concrete dimension name list on coord.
 */
listProto.getDimensionsOnCoord = function () {
    return this._dimensionsSummary.dataDimsOnCoord.slice();
};

/**
 * @param {string} coordDim
 * @param {number} [idx] A coordDim may map to more than one data dim.
 *        If idx is `true`, return a array of all mapped dims.
 *        If idx is not specified, return the first dim not extra.
 * @return {string|Array.<string>} concrete data dim.
 *        If idx is number, and not found, return null/undefined.
 *        If idx is `true`, and not found, return empty array (always return array).
 */
listProto.mapDimension = function (coordDim, idx) {
    var dimensionsSummary = this._dimensionsSummary;

    if (idx == null) {
        return dimensionsSummary.encodeFirstDimNotExtra[coordDim];
    }

    var dims = dimensionsSummary.encode[coordDim];
    return idx === true
        // always return array if idx is `true`
        ? (dims || []).slice()
        : (dims && dims[idx]);
};

/**
 * Initialize from data
 * @param {Array.<Object|number|Array>} data source or data or data provider.
 * @param {Array.<string>} [nameLIst] The name of a datum is used on data diff and
 *        defualt label/tooltip.
 *        A name can be specified in encode.itemName,
 *        or dataItem.name (only for series option data),
 *        or provided in nameList from outside.
 * @param {Function} [dimValueGetter] (dataItem, dimName, dataIndex, dimIndex) => number
 */
listProto.initData = function (data, nameList, dimValueGetter) {

    var notProvider = Source.isInstance(data) || zrUtil.isArrayLike(data);
    if (notProvider) {
        data = new DefaultDataProvider(data, this.dimensions.length);
    }

    if (__DEV__) {
        if (!notProvider && (typeof data.getItem !== 'function' || typeof data.count !== 'function')) {
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

    /**
     * @readOnly
     */
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
};

listProto.getProvider = function () {
    return this._rawData;
};

/**
 * Caution: Can be only called on raw data (before `this._indices` created).
 */
listProto.appendData = function (data) {
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
};

/**
 * Caution: Can be only called on raw data (before `this._indices` created).
 * This method does not modify `rawData` (`dataProvider`), but only
 * add values to storage.
 *
 * The final count will be increased by `Math.max(values.length, names.length)`.
 *
 * @param {Array.<Array.<*>>} values That is the SourceType: 'arrayRows', like
 *        [
 *            [12, 33, 44],
 *            [NaN, 43, 1],
 *            ['-', 'asdf', 0]
 *        ]
 *        Each item is exaclty cooresponding to a dimension.
 * @param {Array.<string>} [names]
 */
listProto.appendValues = function (values, names) {
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
            );
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
};

listProto._initDataFromProvider = function (start, end) {
    // Optimize.
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
    var nameRepeatCount = this._nameRepeatCount = {};
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

    var dataItem = new Array(dimLen);
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
            var val = this._dimValueGetter(dataItem, dim, idx, k);
            dimStorage[chunkOffset] = val;

            var dimRawExtent = rawExtent[dim];
            val < dimRawExtent[0] && (dimRawExtent[0] = val);
            val > dimRawExtent[1] && (dimRawExtent[1] = val);
        }

        // ??? FIXME not check by pure but sourceFormat?
        // TODO refactor these logic.
        if (!rawData.pure) {
            var name = nameList[idx];

            if (dataItem && name == null) {
                // If dataItem is {name: ...}, it has highest priority.
                // That is appropriate for many common cases.
                if (dataItem.name != null) {
                    // There is no other place to persistent dataItem.name,
                    // so save it to nameList.
                    nameList[idx] = name = dataItem.name;
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
            var id = dataItem == null ? null : dataItem.id;

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
};

function prepareChunks(storage, dimInfo, chunkSize, chunkCount, end) {
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
}

function prepareInvertedIndex(list) {
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
                invertedIndices[list.get(dim, i)] = i;
            }
        }
    });
}

function getRawValueFromStore(list, dimIndex, rawIndex) {
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
                val = ordinalMeta.categories[val];
            }
        }
    }
    return val;
}

/**
 * @return {number}
 */
listProto.count = function () {
    return this._count;
};

listProto.getIndices = function () {
    var newIndices;

    var indices = this._indices;
    if (indices) {
        var Ctor = indices.constructor;
        var thisCount = this._count;
        // `new Array(a, b, c)` is different from `new Uint32Array(a, b, c)`.
        if (Ctor === Array) {
            newIndices = new Ctor(thisCount);
            for (var i = 0; i < thisCount; i++) {
                newIndices[i] = indices[i];
            }
        }
        else {
            newIndices = new Ctor(indices.buffer, 0, thisCount);
        }
    }
    else {
        var Ctor = getIndicesCtor(this);
        var newIndices = new Ctor(this.count());
        for (var i = 0; i < newIndices.length; i++) {
            newIndices[i] = i;
        }
    }

    return newIndices;
};

/**
 * Get value. Return NaN if idx is out of range.
 * @param {string} dim Dim must be concrete name.
 * @param {number} idx
 * @param {boolean} stack
 * @return {number}
 */
listProto.get = function (dim, idx /*, stack */) {
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
};

/**
 * @param {string} dim concrete dim
 * @param {number} rawIndex
 * @return {number|string}
 */
listProto.getByRawIndex = function (dim, rawIdx) {
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
};

/**
 * FIXME Use `get` on chrome maybe slow(in filterSelf and selectRange).
 * Hack a much simpler _getFast
 * @private
 */
listProto._getFast = function (dim, rawIdx) {
    var chunkIndex = Math.floor(rawIdx / this._chunkSize);
    var chunkOffset = rawIdx % this._chunkSize;
    var chunkStore = this._storage[dim][chunkIndex];
    return chunkStore[chunkOffset];
};

/**
 * Get value for multi dimensions.
 * @param {Array.<string>} [dimensions] If ignored, using all dimensions.
 * @param {number} idx
 * @return {number}
 */
listProto.getValues = function (dimensions, idx /*, stack */) {
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
};

/**
 * If value is NaN. Inlcuding '-'
 * Only check the coord dimensions.
 * @param {string} dim
 * @param {number} idx
 * @return {number}
 */
listProto.hasValue = function (idx) {
    var dataDimsOnCoord = this._dimensionsSummary.dataDimsOnCoord;
    for (var i = 0, len = dataDimsOnCoord.length; i < len; i++) {
        // Ordinal type originally can be string or number.
        // But when an ordinal type is used on coord, it can
        // not be string but only number. So we can also use isNaN.
        if (isNaN(this.get(dataDimsOnCoord[i], idx))) {
            return false;
        }
    }
    return true;
};

/**
 * Get extent of data in one dimension
 * @param {string} dim
 * @param {boolean} stack
 */
listProto.getDataExtent = function (dim /*, stack */) {
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
    var dimExtent;

    if (useRaw) {
        return this._rawExtent[dim].slice();
    }
    dimExtent = this._extent[dim];
    if (dimExtent) {
        return dimExtent.slice();
    }
    dimExtent = initialExtent;

    var min = dimExtent[0];
    var max = dimExtent[1];

    for (var i = 0; i < currEnd; i++) {
        // var value = stack ? this.get(dim, i, true) : this._getFast(dim, this.getRawIndex(i));
        var value = this._getFast(dim, this.getRawIndex(i));
        value < min && (min = value);
        value > max && (max = value);
    }

    dimExtent = [min, max];

    this._extent[dim] = dimExtent;

    return dimExtent;
};

/**
 * Optimize for the scenario that data is filtered by a given extent.
 * Consider that if data amount is more than hundreds of thousand,
 * extent calculation will cost more than 10ms and the cache will
 * be erased because of the filtering.
 */
listProto.getApproximateExtent = function (dim /*, stack */) {
    dim = this.getDimension(dim);
    return this._approximateExtent[dim] || this.getDataExtent(dim /*, stack */);
};

listProto.setApproximateExtent = function (extent, dim /*, stack */) {
    dim = this.getDimension(dim);
    this._approximateExtent[dim] = extent.slice();
};

/**
 * @param {string} key
 * @return {*}
 */
listProto.getCalculationInfo = function (key) {
    return this._calculationInfo[key];
};

/**
 * @param {string|Object} key or k-v object
 * @param {*} [value]
 */
listProto.setCalculationInfo = function (key, value) {
    isObject(key)
        ? zrUtil.extend(this._calculationInfo, key)
        : (this._calculationInfo[key] = value);
};

/**
 * Get sum of data in one dimension
 * @param {string} dim
 */
listProto.getSum = function (dim /*, stack */) {
    var dimData = this._storage[dim];
    var sum = 0;
    if (dimData) {
        for (var i = 0, len = this.count(); i < len; i++) {
            var value = this.get(dim, i /*, stack */);
            if (!isNaN(value)) {
                sum += value;
            }
        }
    }
    return sum;
};

/**
 * Get median of data in one dimension
 * @param {string} dim
 */
listProto.getMedian = function (dim /*, stack */) {
    var dimDataArray = [];
    // map all data of one dimension
    this.each(dim, function (val, idx) {
        if (!isNaN(val)) {
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
};

// /**
//  * Retreive the index with given value
//  * @param {string} dim Concrete dimension.
//  * @param {number} value
//  * @return {number}
//  */
// Currently incorrect: should return dataIndex but not rawIndex.
// Do not fix it until this method is to be used somewhere.
// FIXME Precision of float value
// listProto.indexOf = function (dim, value) {
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
// };

/**
 * Only support the dimension which inverted index created.
 * Do not support other cases until required.
 * @param {string} concrete dim
 * @param {number|string} value
 * @return {number} rawIndex
 */
listProto.rawIndexOf = function (dim, value) {
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
};

/**
 * Retreive the index with given name
 * @param {number} idx
 * @param {number} name
 * @return {number}
 */
listProto.indexOfName = function (name) {
    for (var i = 0, len = this.count(); i < len; i++) {
        if (this.getName(i) === name) {
            return i;
        }
    }

    return -1;
};

/**
 * Retreive the index with given raw data index
 * @param {number} idx
 * @param {number} name
 * @return {number}
 */
listProto.indexOfRawIndex = function (rawIndex) {
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
};

/**
 * Retreive the index of nearest value
 * @param {string} dim
 * @param {number} value
 * @param {number} [maxDistance=Infinity]
 * @return {Array.<number>} If and only if multiple indices has
 *        the same value, they are put to the result.
 */
listProto.indicesOfNearest = function (dim, value, maxDistance) {
    var storage = this._storage;
    var dimData = storage[dim];
    var nearestIndices = [];

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
        var diff = value - this.get(dim, i);
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
};

/**
 * Get raw data index
 * @param {number} idx
 * @return {number}
 */
listProto.getRawIndex = getRawIndexWithoutIndices;

function getRawIndexWithoutIndices(idx) {
    return idx;
}

function getRawIndexWithIndices(idx) {
    if (idx < this._count && idx >= 0) {
        return this._indices[idx];
    }
    return -1;
}

/**
 * Get raw data item
 * @param {number} idx
 * @return {number}
 */
listProto.getRawDataItem = function (idx) {
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
};

/**
 * @param {number} idx
 * @param {boolean} [notDefaultIdx=false]
 * @return {string}
 */
listProto.getName = function (idx) {
    var rawIndex = this.getRawIndex(idx);
    return this._nameList[rawIndex]
        || getRawValueFromStore(this, this._nameDimIdx, rawIndex)
        || '';
};

/**
 * @param {number} idx
 * @param {boolean} [notDefaultIdx=false]
 * @return {string}
 */
listProto.getId = function (idx) {
    return getId(this, this.getRawIndex(idx));
};

function getId(list, rawIndex) {
    var id = list._idList[rawIndex];
    if (id == null) {
        id = getRawValueFromStore(list, list._idDimIdx, rawIndex);
    }
    if (id == null) {
        // FIXME Check the usage in graph, should not use prefix.
        id = ID_PREFIX + rawIndex;
    }
    return id;
}

function normalizeDimensions(dimensions) {
    if (!zrUtil.isArray(dimensions)) {
        dimensions = [dimensions];
    }
    return dimensions;
}

function validateDimensions(list, dims) {
    for (var i = 0; i < dims.length; i++) {
        // stroage may be empty when no data, so use
        // dimensionInfos to check.
        if (!list._dimensionInfos[dims[i]]) {
            console.error('Unkown dimension ' + dims[i]);
        }
    }
}

/**
 * Data iteration
 * @param {string|Array.<string>}
 * @param {Function} cb
 * @param {*} [context=this]
 *
 * @example
 *  list.each('x', function (x, idx) {});
 *  list.each(['x', 'y'], function (x, y, idx) {});
 *  list.each(function (idx) {})
 */
listProto.each = function (dims, cb, context, contextCompat) {
    'use strict';

    if (!this._count) {
        return;
    }

    if (typeof dims === 'function') {
        contextCompat = context;
        context = cb;
        cb = dims;
        dims = [];
    }

    // contextCompat just for compat echarts3
    context = context || contextCompat || this;

    dims = zrUtil.map(normalizeDimensions(dims), this.getDimension, this);

    if (__DEV__) {
        validateDimensions(this, dims);
    }

    var dimSize = dims.length;

    for (var i = 0; i < this.count(); i++) {
        // Simple optimization
        switch (dimSize) {
            case 0:
                cb.call(context, i);
                break;
            case 1:
                cb.call(context, this.get(dims[0], i), i);
                break;
            case 2:
                cb.call(context, this.get(dims[0], i), this.get(dims[1], i), i);
                break;
            default:
                var k = 0;
                var value = [];
                for (; k < dimSize; k++) {
                    value[k] = this.get(dims[k], i);
                }
                // Index
                value[k] = i;
                cb.apply(context, value);
        }
    }
};

/**
 * Data filter
 * @param {string|Array.<string>}
 * @param {Function} cb
 * @param {*} [context=this]
 */
listProto.filterSelf = function (dimensions, cb, context, contextCompat) {
    'use strict';

    if (!this._count) {
        return;
    }

    if (typeof dimensions === 'function') {
        contextCompat = context;
        context = cb;
        cb = dimensions;
        dimensions = [];
    }

    // contextCompat just for compat echarts3
    context = context || contextCompat || this;

    dimensions = zrUtil.map(
        normalizeDimensions(dimensions), this.getDimension, this
    );

    if (__DEV__) {
        validateDimensions(this, dimensions);
    }


    var count = this.count();
    var Ctor = getIndicesCtor(this);
    var newIndices = new Ctor(count);
    var value = [];
    var dimSize = dimensions.length;

    var offset = 0;
    var dim0 = dimensions[0];

    for (var i = 0; i < count; i++) {
        var keep;
        var rawIdx = this.getRawIndex(i);
        // Simple optimization
        if (dimSize === 0) {
            keep = cb.call(context, i);
        }
        else if (dimSize === 1) {
            var val = this._getFast(dim0, rawIdx);
            keep = cb.call(context, val, i);
        }
        else {
            for (var k = 0; k < dimSize; k++) {
                value[k] = this._getFast(dim0, rawIdx);
            }
            value[k] = i;
            keep = cb.apply(context, value);
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
};

/**
 * Select data in range. (For optimization of filter)
 * (Manually inline code, support 5 million data filtering in data zoom.)
 */
listProto.selectRange = function (range) {
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
                        (val >= min && val <= max) || isNaN(val)
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
                            (val >= min && val <= max) || isNaN(val)
                        )
                        && (
                            (val2 >= min2 && val2 <= max2) || isNaN(val2)
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
                    (val >= min && val <= max) || isNaN(val)
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
};

/**
 * Data mapping to a plain array
 * @param {string|Array.<string>} [dimensions]
 * @param {Function} cb
 * @param {*} [context=this]
 * @return {Array}
 */
listProto.mapArray = function (dimensions, cb, context, contextCompat) {
    'use strict';

    if (typeof dimensions === 'function') {
        contextCompat = context;
        context = cb;
        cb = dimensions;
        dimensions = [];
    }

    // contextCompat just for compat echarts3
    context = context || contextCompat || this;

    var result = [];
    this.each(dimensions, function () {
        result.push(cb && cb.apply(this, arguments));
    }, context);
    return result;
};

// Data in excludeDimensions is copied, otherwise transfered.
function cloneListForMapAndSample(original, excludeDimensions) {
    var allDimensions = original.dimensions;
    var list = new List(
        zrUtil.map(allDimensions, original.getDimensionInfo, original),
        original.hostModel
    );
    // FIXME If needs stackedOn, value may already been stacked
    transferProperties(list, original);

    var storage = list._storage = {};
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
}

function cloneDimStore(originalDimStore) {
    var newDimStore = new Array(originalDimStore.length);
    for (var j = 0; j < originalDimStore.length; j++) {
        newDimStore[j] = cloneChunk(originalDimStore[j]);
    }
    return newDimStore;
}

function getInitialExtent() {
    return [Infinity, -Infinity];
}

/**
 * Data mapping to a new List with given dimensions
 * @param {string|Array.<string>} dimensions
 * @param {Function} cb
 * @param {*} [context=this]
 * @return {Array}
 */
listProto.map = function (dimensions, cb, context, contextCompat) {
    'use strict';

    // contextCompat just for compat echarts3
    context = context || contextCompat || this;

    dimensions = zrUtil.map(
        normalizeDimensions(dimensions), this.getDimension, this
    );

    if (__DEV__) {
        validateDimensions(this, dimensions);
    }

    var list = cloneListForMapAndSample(this, dimensions);

    // Following properties are all immutable.
    // So we can reference to the same value
    list._indices = this._indices;
    list.getRawIndex = list._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

    var storage = list._storage;

    var tmpRetValue = [];
    var chunkSize = this._chunkSize;
    var dimSize = dimensions.length;
    var dataCount = this.count();
    var values = [];
    var rawExtent = list._rawExtent;

    for (var dataIndex = 0; dataIndex < dataCount; dataIndex++) {
        for (var dimIndex = 0; dimIndex < dimSize; dimIndex++) {
            values[dimIndex] = this.get(dimensions[dimIndex], dataIndex /*, stack */);
        }
        values[dimSize] = dataIndex;

        var retValue = cb && cb.apply(context, values);
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
                var dim = dimensions[i];
                var val = retValue[i];
                var rawExtentOnDim = rawExtent[dim];

                var dimStore = storage[dim];
                if (dimStore) {
                    dimStore[chunkIndex][chunkOffset] = val;
                }

                if (val < rawExtentOnDim[0]) {
                    rawExtentOnDim[0] = val;
                }
                if (val > rawExtentOnDim[1]) {
                    rawExtentOnDim[1] = val;
                }
            }
        }
    }

    return list;
};

/**
 * Large data down sampling on given dimension
 * @param {string} dimension
 * @param {number} rate
 * @param {Function} sampleValue
 * @param {Function} sampleIndex Sample index for name and id
 */
listProto.downSample = function (dimension, rate, sampleValue, sampleIndex) {
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
};

/**
 * Get model of one data item.
 *
 * @param {number} idx
 */
// FIXME Model proxy ?
listProto.getItemModel = function (idx) {
    var hostModel = this.hostModel;
    return new Model(this.getRawDataItem(idx), hostModel, hostModel && hostModel.ecModel);
};

/**
 * Create a data differ
 * @param {module:echarts/data/List} otherList
 * @return {module:echarts/data/DataDiffer}
 */
listProto.diff = function (otherList) {
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
};
/**
 * Get visual property.
 * @param {string} key
 */
listProto.getVisual = function (key) {
    var visual = this._visual;
    return visual && visual[key];
};

/**
 * Set visual property
 * @param {string|Object} key
 * @param {*} [value]
 *
 * @example
 *  setVisual('color', color);
 *  setVisual({
 *      'color': color
 *  });
 */
listProto.setVisual = function (key, val) {
    if (isObject(key)) {
        for (var name in key) {
            if (key.hasOwnProperty(name)) {
                this.setVisual(name, key[name]);
            }
        }
        return;
    }
    this._visual = this._visual || {};
    this._visual[key] = val;
};

/**
 * Set layout property.
 * @param {string|Object} key
 * @param {*} [val]
 */
listProto.setLayout = function (key, val) {
    if (isObject(key)) {
        for (var name in key) {
            if (key.hasOwnProperty(name)) {
                this.setLayout(name, key[name]);
            }
        }
        return;
    }
    this._layout[key] = val;
};

/**
 * Get layout property.
 * @param  {string} key.
 * @return {*}
 */
listProto.getLayout = function (key) {
    return this._layout[key];
};

/**
 * Get layout of single data item
 * @param {number} idx
 */
listProto.getItemLayout = function (idx) {
    return this._itemLayouts[idx];
};

/**
 * Set layout of single data item
 * @param {number} idx
 * @param {Object} layout
 * @param {boolean=} [merge=false]
 */
listProto.setItemLayout = function (idx, layout, merge) {
    this._itemLayouts[idx] = merge
        ? zrUtil.extend(this._itemLayouts[idx] || {}, layout)
        : layout;
};

/**
 * Clear all layout of single data item
 */
listProto.clearItemLayouts = function () {
    this._itemLayouts.length = 0;
};

/**
 * Get visual property of single data item
 * @param {number} idx
 * @param {string} key
 * @param {boolean} [ignoreParent=false]
 */
listProto.getItemVisual = function (idx, key, ignoreParent) {
    var itemVisual = this._itemVisuals[idx];
    var val = itemVisual && itemVisual[key];
    if (val == null && !ignoreParent) {
        // Use global visual property
        return this.getVisual(key);
    }
    return val;
};

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
listProto.setItemVisual = function (idx, key, value) {
    var itemVisual = this._itemVisuals[idx] || {};
    var hasItemVisual = this.hasItemVisual;
    this._itemVisuals[idx] = itemVisual;

    if (isObject(key)) {
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
};

/**
 * Clear itemVisuals and list visual.
 */
listProto.clearAllVisual = function () {
    this._visual = {};
    this._itemVisuals = [];
    this.hasItemVisual = {};
};

var setItemDataAndSeriesIndex = function (child) {
    child.seriesIndex = this.seriesIndex;
    child.dataIndex = this.dataIndex;
    child.dataType = this.dataType;
};
/**
 * Set graphic element relative to data. It can be set as null
 * @param {number} idx
 * @param {module:zrender/Element} [el]
 */
listProto.setItemGraphicEl = function (idx, el) {
    var hostModel = this.hostModel;

    if (el) {
        // Add data index and series index for indexing the data by element
        // Useful in tooltip
        el.dataIndex = idx;
        el.dataType = this.dataType;
        el.seriesIndex = hostModel && hostModel.seriesIndex;
        if (el.type === 'group') {
            el.traverse(setItemDataAndSeriesIndex, el);
        }
    }

    this._graphicEls[idx] = el;
};

/**
 * @param {number} idx
 * @return {module:zrender/Element}
 */
listProto.getItemGraphicEl = function (idx) {
    return this._graphicEls[idx];
};

/**
 * @param {Function} cb
 * @param {*} context
 */
listProto.eachItemGraphicEl = function (cb, context) {
    zrUtil.each(this._graphicEls, function (el, idx) {
        if (el) {
            cb && cb.call(context, el, idx);
        }
    });
};

/**
 * Shallow clone a new list except visual and layout properties, and graph elements.
 * New list only change the indices.
 */
listProto.cloneShallow = function (list) {
    if (!list) {
        var dimensionInfoList = zrUtil.map(this.dimensions, this.getDimensionInfo, this);
        list = new List(dimensionInfoList, this.hostModel);
    }

    // FIXME
    list._storage = this._storage;

    transferProperties(list, this);

    // Clone will not change the data extent and indices
    if (this._indices) {
        var Ctor = this._indices.constructor;
        list._indices = new Ctor(this._indices);
    }
    else {
        list._indices = null;
    }
    list.getRawIndex = list._indices ? getRawIndexWithIndices : getRawIndexWithoutIndices;

    return list;
};

/**
 * Wrap some method to add more feature
 * @param {string} methodName
 * @param {Function} injectFunction
 */
listProto.wrapMethod = function (methodName, injectFunction) {
    var originalMethod = this[methodName];
    if (typeof originalMethod !== 'function') {
        return;
    }
    this.__wrappedMethods = this.__wrappedMethods || [];
    this.__wrappedMethods.push(methodName);
    this[methodName] = function () {
        var res = originalMethod.apply(this, arguments);
        return injectFunction.apply(this, [res].concat(zrUtil.slice(arguments)));
    };
};

// Methods that create a new list based on this list should be listed here.
// Notice that those method should `RETURN` the new list.
listProto.TRANSFERABLE_METHODS = ['cloneShallow', 'downSample', 'map'];
// Methods that change indices of this list should be listed here.
listProto.CHANGABLE_METHODS = ['filterSelf', 'selectRange'];

export default List;
