/**
 * List for data storage
 * @module echarts/data/List
 */

import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import DataDiffer from './DataDiffer';
import * as modelUtil from '../util/model';

var isObject = zrUtil.isObject;

var UNDEFINED = 'undefined';
var globalObj = typeof window === UNDEFINED ? global : window;

var dataCtors = {
    'float': typeof globalObj.Float64Array === UNDEFINED
        ? Array : globalObj.Float64Array,
    'int': typeof globalObj.Int32Array === UNDEFINED
        ? Array : globalObj.Int32Array,
    // Ordinal data type can be string or int
    'ordinal': Array,
    'number': Array,
    'time': Array
};

var CtorUint32Array = typeof globalObj.Uint32Array === UNDEFINED ? Array : globalObj.Uint32Array;

function cloneChunk(originalChunk) {
    var Ctor = originalChunk.constructor;
    // Only shallow clone is enough when Array.
    return Ctor === Array ? originalChunk.slice() : new Ctor(originalChunk);
}

var TRANSFERABLE_PROPERTIES = [
    'stackedOn', 'hasItemOption', '_nameList', '_idList', '_rawData'
];

function transferProperties(a, b) {
    zrUtil.each(TRANSFERABLE_PROPERTIES.concat(b.__wrappedMethods || []), function (propName) {
        if (b.hasOwnProperty(propName)) {
            a[propName] = b[propName];
        }
    });

    a.__wrappedMethods = b.__wrappedMethods;
}

/**
 * If normal array used, mutable chunk size is supported.
 * If typed array used, chunk size must be fixed.
 */
function DefaultDataProvider(dataArray, dimSize) {
    var methods;

    // Typed array.
    if (dataArray && zrUtil.isTypedArray(dataArray)) {
        if (__DEV__) {
            if (dimSize == null) {
                throw new Error('Typed array data must specify dimension size');
            }
        }
        this._dimSize = dimSize;
        this._array = dataArray;
        methods = typedArrayProviderMethods;
        this.pure = true;
    }
    // Normal array.
    else {
        this._array = dataArray || [];
        methods = normalProviderMethods;
    }

    zrUtil.extend(this, methods);
}

DefaultDataProvider.prototype.pure = false;

var normalProviderMethods = {
    count: function () {
        return this._array.length;
    },
    getItem: function (idx) {
        return this._array[idx];
    }
};
var typedArrayProviderMethods = {
    count: function () {
        return this._array.length / this._dimSize;
    },
    getItem: function (idx) {
        var item = [];
        var offset = this._dimSize * idx;
        for (var i = 0; i < this._dimSize; i++) {
            item[i] = this._array[offset + i];
        }
        return item;
    }
};

DefaultDataProvider.prototype.addData = function (newData) {
    if (newData == null || !newData.length) {
        return;
    }

    var chunkSize = this._chunkSize;

    if (__DEV__) {
        // If using typed array, should always use typed array with the same size.
        var isArrayData = zrUtil.isArrayLike(newData);
        zrUtil.assert(
            (isArrayData && chunkSize == null)
            || (!isArrayData && chunkSize === newData.length),
            'Should always use normal array or typed array with the same size.'
        );
    }

    var thisArray = this._array;
    if (chunkSize == null) {
        // ??? performance
        thisArray.push.apply(thisArray, newData);
    }
    else if (chunkSize === newData.length) {
        thisArray.push(newData);
    }
};

/**
 * @constructor
 * @alias module:echarts/data/List
 *
 * @param {Array.<string|Object>} dimensions
 *      For example, ['someDimName', {name: 'someDimName', type: 'someDimType'}, ...].
 *      Dimensions should be concrete names like x, y, z, lng, lat, angle, radius
 * @param {module:echarts/model/Model} hostModel
 */
var List = function (dimensions, hostModel) {

    dimensions = dimensions || ['x', 'y'];

    var dimensionInfos = {};
    var dimensionNames = [];
    for (var i = 0; i < dimensions.length; i++) {
        var dimensionName;
        var dimensionInfo = {};
        if (typeof dimensions[i] === 'string') {
            dimensionName = dimensions[i];
            dimensionInfo = {
                name: dimensionName,
                coordDim: dimensionName,
                coordDimIndex: 0,
                stackable: false,
                // Type can be 'float', 'int', 'number'
                // Default is number, Precision of float may not enough
                type: 'number'
            };
        }
        else {
            dimensionInfo = dimensions[i];
            dimensionName = dimensionInfo.name;
            dimensionInfo.type = dimensionInfo.type || 'number';
            if (!dimensionInfo.coordDim) {
                dimensionInfo.coordDim = dimensionName;
                dimensionInfo.coordDimIndex = 0;
            }
        }
        dimensionInfo.otherDims = dimensionInfo.otherDims || {};
        dimensionNames.push(dimensionName);
        dimensionInfos[dimensionName] = dimensionInfo;
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
    this.indices = [];

    /**
     * @type {number}
     * @private
     */
    this._chunkSize;

    /**
     * @type {number}
     * @private
     */
    this._chunkCount = 0;

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
     * @param {module:echarts/data/List}
     */
    this.stackedOn = null;

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
     * @type {Array.<Array|Object>}
     * @private
     */
    this._rawData;

    /**
     * @type {Object}
     * @private
     */
    this._extent;
};

var listProto = List.prototype;

listProto.type = 'list';

/**
 * If each data item has it's own option
 * @type {boolean}
 */
listProto.hasItemOption = true;

/**
 * Get dimension name
 * @param {string|number} dim
 *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
 *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
 * @return {string} Concrete dim name.
 */
listProto.getDimension = function (dim) {
    if (!isNaN(dim)) {
        dim = this.dimensions[dim] || dim;
    }
    return dim;
};

/**
 * @param {Array.<string|number>} dims
 * @return {Array.<string>}
 */
listProto.parseDimensions = function (dims) {
    return zrUtil.map(normalizeDimensions(dims), this.getDimension, this);
};

/**
 * Get type and stackable info of particular dimension
 * @param {string|number} dim
 *        Dimension can be concrete names like x, y, z, lng, lat, angle, radius
 *        Or a ordinal number. For example getDimensionInfo(0) will return 'x' or 'lng' or 'radius'
 */
listProto.getDimensionInfo = function (dim) {
    return zrUtil.clone(this._dimensionInfos[this.getDimension(dim)]);
};

/**
 * Initialize from data
 * @param {Array.<Object|number|Array>} data
 * @param {Array.<string>} [nameList]
 * @param {Function} [dimValueGetter] (dataItem, dimName, dataIndex, dimIndex) => number
 */
listProto.initData = function (data, nameList, dimValueGetter) {
    data = data || [];

    var isDataArray = zrUtil.isArrayLike(data);
    if (isDataArray) {
        data = new DefaultDataProvider(data, this.dimensions.length);
    }
    if (__DEV__) {
        if (!isDataArray && (typeof data.getItem != 'function' || typeof data.count != 'function')) {
            throw new Error('Inavlid data provider.');
        }
    }

    this._rawData = data;

    // Clear
    this._storage = {};
    this.indices = new CtorUint32Array(data.count());

    var dimensionInfoMap = this._dimensionInfos;

    var size = this._chunkSize = data.count();

    this._nameList = nameList = nameList || [];
    this._idList = [];

    this._nameRepeatCount = {};

    // Init storage
    // for (var i = 0; i < dimensions.length; i++) {
    //     var dimInfo = dimensionInfoMap[dimensions[i]];
    //     dimInfo.otherDims.itemName === 0 && (nameDimIdx = i);
    //     var DataCtor = dataCtors[dimInfo.type];
    //     storage[dimensions[i]] = [new DataCtor(size)];
    // }

    var self = this;
    if (!dimValueGetter) {
        this.hasItemOption = false;
    }
    // Default dim value getter
    this._dimValueGetter = dimValueGetter = dimValueGetter || function (dataItem, dimName, dataIndex, dimIndex) {
        var value = modelUtil.getDataItemValue(dataItem);
        // If any dataItem is like { value: 10 }
        if (!data.pure && modelUtil.isDataItemOption(dataItem)) {
            self.hasItemOption = true;
        }
        return modelUtil.converDataValue(
            (value instanceof Array)
                ? value[dimIndex]
                // If value is a single number or something else not array.
                : value,
            dimensionInfoMap[dimName]
        );
    };

    this.initFromRawData(0, size);

    // If data has no item option.
    if (data.pure) {
        this.hasItemOption = false;
    }
};

listProto.getProvider = function () {
    return this._rawData;
};

listProto.initFromRawData = function (start, end) {
    // Optimize.
    if (start >= end) {
        return;
    }

    if (end > this.indices.length) {
        // Expand indices
        var oldIndices = this.indices;
        this.indices = new CtorUint32Array(end);
        // Copy value to new array
        for (var i = 0; i < oldIndices.length; i++) {
            this.indices[i] = oldIndices[i];
        }
    }

    var data = this._rawData;
    var storage = this._storage;
    var indices = this.indices;
    var dimensions = this.dimensions;
    var dimensionInfoMap = this._dimensionInfos;
    var nameList = this._nameList;
    var idList = this._idList;
    var chunkSize = this._chunkSize;
    var nameRepeatCount = this._nameRepeatCount = {};
    var nameDimIdx;

    // Reset cached extent
    this._extent = {};

    // Create more chunk storage.
    var newChunkCount = Math.ceil(end / chunkSize);
    for (var i = 0; i < dimensions.length; i++) {
        var dim = dimensions[i];

        var dimInfo = dimensionInfoMap[dim];
        if (dimInfo.otherDims.itemName === 0) {
            nameDimIdx = i;
        }
        if (!storage[dim]) {
            storage[dim] = [];
        }
        var DataCtor = dataCtors[dimInfo.type];
        for (var j = this._chunkCount; j < newChunkCount; j++) {
            storage[dim][j] = new DataCtor(chunkSize);
        }
    }
    this._chunkCount = newChunkCount;

    var chunkIndex = newChunkCount - 1;
    for (var idx = start; idx < end; idx++) {

        // NOTICE: Try not to write things into dataItem
        var dataItem = data.getItem(idx);
        // Each data item is value
        // [1, 2]
        // 2
        // Bar chart, line chart which uses category axis
        // only gives the 'y' value. 'x' value is the indices of cateogry
        // Use a tempValue to normalize the value to be a (x, y) value

        var chunkOffset = idx % chunkSize;

        // Store the data by dimensions
        for (var k = 0; k < dimensions.length; k++) {
            var dim = dimensions[k];
            var dimStorage = storage[dim][chunkIndex];
            // PENDING NULL is empty or zero
            dimStorage[chunkOffset] = this._dimValueGetter(dataItem, dim, idx, k);
        }

        indices[idx] = chunkIndex * chunkSize + chunkOffset;

        // Use the name in option and create id
        if (!data.pure) {
            if (!nameList[idx] && dataItem) {
                if (dataItem.name != null) {
                    nameList[idx] = dataItem.name;
                }
                else if (nameDimIdx != null) {
                    nameList[idx] = storage[dimensions[nameDimIdx]][chunkIndex][chunkOffset];
                }
            }
            var name = nameList[idx];
            // Try using the id in option
            var id = dataItem && dataItem.id;

            if (id == null && name) {
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
};

/**
 * @return {number}
 */
listProto.count = function () {
    return this.indices.length;
};

/**
 * Get value. Return NaN if idx is out of range.
 * @param {string} dim Dim must be concrete name.
 * @param {number} idx
 * @param {boolean} stack
 * @return {number}
 */
listProto.get = function (dim, idx, stack) {
    var storage = this._storage;
    var chunkIndex = Math.floor(idx / this._chunkSize);
    var chunkOffset = idx % this._chunkSize;

    var chunkStore = storage[dim][chunkIndex];
    var value = chunkStore ? chunkStore[chunkOffset] : NaN;
    // FIXME ordinal data type is not stackable
    if (stack) {
        var dimensionInfo = this._dimensionInfos[dim];
        if (dimensionInfo && dimensionInfo.stackable) {
            var stackedOn = this.stackedOn;
            while (stackedOn) {
                // Get no stacked data of stacked on
                var stackedValue = stackedOn.get(dim, idx);
                // Considering positive stack, negative stack and empty data
                if ((value >= 0 && stackedValue > 0)  // Positive stack
                    || (value <= 0 && stackedValue < 0) // Negative stack
                ) {
                    value += stackedValue;
                }
                stackedOn = stackedOn.stackedOn;
            }
        }
    }
    return value;
};

/**
 * Get value for multi dimensions.
 * @param {Array.<string>} [dimensions] If ignored, using all dimensions.
 * @param {number} idx
 * @param {boolean} stack
 * @return {number}
 */
listProto.getValues = function (dimensions, idx, stack) {
    var values = [];

    if (!zrUtil.isArray(dimensions)) {
        stack = idx;
        idx = dimensions;
        dimensions = this.dimensions;
    }

    for (var i = 0, len = dimensions.length; i < len; i++) {
        values.push(this.get(dimensions[i], idx, stack));
    }

    return values;
};

/**
 * If value is NaN. Inlcuding '-'
 * @param {string} dim
 * @param {number} idx
 * @return {number}
 */
listProto.hasValue = function (idx) {
    var dimensions = this.dimensions;
    var dimensionInfos = this._dimensionInfos;
    for (var i = 0, len = dimensions.length; i < len; i++) {
        if (
            // Ordinal type can be string or number
            dimensionInfos[dimensions[i]].type !== 'ordinal'
            && isNaN(this.get(dimensions[i], idx))
        ) {
            return false;
        }
    }
    return true;
};

/**
 * Get extent of data in one dimension
 * @param {string} dim
 * @param {boolean} stack
 * @param {Function} filter
 */
listProto.getDataExtent = function (dim, stack, filter) {
    dim = this.getDimension(dim);
    var dimData = this._storage[dim];
    var dimInfo = this.getDimensionInfo(dim);
    stack = (dimInfo && dimInfo.stackable) && stack;
    var dimExtent = (this._extent || (this._extent = {}))[dim + (!!stack)];
    var value;
    if (dimExtent) {
        return dimExtent;
    }

    if (!dimData) {
        return [Infinity, -Infinity];
    }

    var min = Infinity;
    var max = -Infinity;
    // var isOrdinal = dimInfo.type === 'ordinal';
    for (var i = 0, len = this.count(); i < len; i++) {
        value = this.get(dim, i, stack);
        // FIXME
        // if (isOrdinal && typeof value === 'string') {
        //     value = zrUtil.indexOf(dimData, value);
        // }
        if (!filter || filter(value, dim, i)) {
            value < min && (min = value);
            value > max && (max = value);
        }
    }
    return (this._extent[dim + !!stack] = [min, max]);
};

/**
 * Get sum of data in one dimension
 * @param {string} dim
 * @param {boolean} stack
 */
listProto.getSum = function (dim, stack) {
    var dimData = this._storage[dim];
    var sum = 0;
    if (dimData) {
        for (var i = 0, len = this.count(); i < len; i++) {
            var value = this.get(dim, i, stack);
            if (!isNaN(value)) {
                sum += value;
            }
        }
    }
    return sum;
};

/**
 * Retreive the index with given value
 * @param {number} idx
 * @param {number} value
 * @return {number}
 */
// FIXME Precision of float value
listProto.indexOf = function (dim, value) {
    var storage = this._storage;
    var dimData = storage[dim];
    var chunkSize = this._chunkSize;
    if (dimData) {
        for (var i = 0, len = this.count(); i < len; i++) {
            var chunkIndex = Math.floor(i / chunkSize);
            var chunkOffset = i % chunkSize;
            if (dimData[chunkIndex][chunkOffset] === value) {
                return i;
            }
        }
    }
    return -1;
};

/**
 * Retreive the index with given name
 * @param {number} idx
 * @param {number} name
 * @return {number}
 */
listProto.indexOfName = function (name) {
    var indices = this.indices;
    var nameList = this._nameList;

    for (var i = 0, len = indices.length; i < len; i++) {
        if (nameList[indices[i]] === name) {
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
    // Indices are ascending
    var indices = this.indices;

    // If rawIndex === dataIndex
    var rawDataIndex = indices[rawIndex];
    if (rawDataIndex != null && rawDataIndex === rawIndex) {
        return rawIndex;
    }

    var left = 0;
    var right = indices.length - 1;
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
 * @param {boolean} stack If given value is after stacked
 * @param {number} [maxDistance=Infinity]
 * @return {Array.<number>} Considere multiple points has the same value.
 */
listProto.indicesOfNearest = function (dim, value, stack, maxDistance) {
    var storage = this._storage;
    var dimData = storage[dim];
    var nearestIndices = [];

    if (!dimData) {
        return nearestIndices;
    }

    if (maxDistance == null) {
        maxDistance = Infinity;
    }

    var minDist = Number.MAX_VALUE;
    var minDiff = -1;
    for (var i = 0, len = this.count(); i < len; i++) {
        var diff = value - this.get(dim, i, stack);
        var dist = Math.abs(diff);
        if (diff <= maxDistance && dist <= minDist) {
            // For the case of two data are same on xAxis, which has sequence data.
            // Show the nearest index
            // https://github.com/ecomfe/echarts/issues/2869
            if (dist < minDist || (diff >= 0 && minDiff < 0)) {
                minDist = dist;
                minDiff = diff;
                nearestIndices.length = 0;
            }
            nearestIndices.push(i);
        }
    }
    return nearestIndices;
};

/**
 * Get raw data index
 * @param {number} idx
 * @return {number}
 */
listProto.getRawIndex = function (idx) {
    var rawIdx = this.indices[idx];
    return rawIdx == null ? -1 : rawIdx;
};

/**
 * Get raw data item
 * @param {number} idx
 * @return {number}
 */
listProto.getRawDataItem = function (idx) {
    return this._rawData.getItem(this.getRawIndex(idx));
};

/**
 * @param {number} idx
 * @param {boolean} [notDefaultIdx=false]
 * @return {string}
 */
listProto.getName = function (idx) {
    return this._nameList[this.indices[idx]] || '';
};

/**
 * @param {number} idx
 * @param {boolean} [notDefaultIdx=false]
 * @return {string}
 */
listProto.getId = function (idx) {
    return this._idList[this.indices[idx]] || (this.getRawIndex(idx) + '');
};


function normalizeDimensions(dimensions) {
    if (!zrUtil.isArray(dimensions)) {
        dimensions = [dimensions];
    }
    return dimensions;
}

/**
 * Data iteration
 * @param {string|Array.<string>}
 * @param {Function} cb
 * @param {boolean} [stack=false]
 * @param {*} [context=this]
 *
 * @example
 *  list.each('x', function (x, idx) {});
 *  list.each(['x', 'y'], function (x, y, idx) {});
 *  list.each(function (idx) {})
 */
listProto.each = function (dims, cb, stack, context) {
    if (typeof dims === 'function') {
        context = stack;
        stack = cb;
        cb = dims;
        dims = [];
    }

    dims = zrUtil.map(normalizeDimensions(dims), this.getDimension, this);

    var dimSize = dims.length;
    var indices = this.indices;

    context = context || this;

    for (var i = 0; i < indices.length; i++) {
        // Simple optimization
        switch (dimSize) {
            case 0:
                cb.call(context, i);
                break;
            case 1:
                cb.call(context, this.get(dims[0], i, stack), i);
                break;
            case 2:
                cb.call(context, this.get(dims[0], i, stack), this.get(dims[1], i, stack), i);
                break;
            default:
                var k = 0;
                var value = [];
                for (; k < dimSize; k++) {
                    value[k] = this.get(dims[k], i, stack);
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
 * @param {boolean} [stack=false]
 * @param {*} [context=this]
 */
listProto.filterSelf = function (dimensions, cb, stack, context) {
    if (typeof dimensions === 'function') {
        context = stack;
        stack = cb;
        cb = dimensions;
        dimensions = [];
    }

    dimensions = zrUtil.map(
        normalizeDimensions(dimensions), this.getDimension, this
    );

    var newIndices = [];
    var value = [];
    var dimSize = dimensions.length;
    var indices = this.indices;

    context = context || this;

    for (var i = 0; i < indices.length; i++) {
        var keep;
        // Simple optimization
        if (!dimSize) {
            keep = cb.call(context, i);
        }
        else if (dimSize === 1) {
            keep = cb.call(
                context, this.get(dimensions[0], i, stack), i
            );
        }
        else {
            for (var k = 0; k < dimSize; k++) {
                value[k] = this.get(dimensions[k], i, stack);
            }
            value[k] = i;
            keep = cb.apply(context, value);
        }
        if (keep) {
            newIndices.push(indices[i]);
        }
    }

    this.indices = newIndices;

    // Reset data extent
    this._extent = {};

    return this;
};

/**
 * Data mapping to a plain array
 * @param {string|Array.<string>} [dimensions]
 * @param {Function} cb
 * @param {boolean} [stack=false]
 * @param {*} [context=this]
 * @return {Array}
 */
listProto.mapArray = function (dimensions, cb, stack, context) {
    if (typeof dimensions === 'function') {
        context = stack;
        stack = cb;
        cb = dimensions;
        dimensions = [];
    }

    var result = [];
    this.each(dimensions, function () {
        result.push(cb && cb.apply(this, arguments));
    }, stack, context);
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
        storage[dim] = zrUtil.indexOf(excludeDimensions, dim) >= 0
            ? cloneDimStore(originalStorage[dim])
            // Direct reference for other dimensions
            : originalStorage[dim];
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

/**
 * Data mapping to a new List with given dimensions
 * @param {string|Array.<string>} dimensions
 * @param {Function} cb
 * @param {boolean} [stack=false]
 * @param {*} [context=this]
 * @return {Array}
 */
listProto.map = function (dimensions, cb, stack, context) {
    dimensions = zrUtil.map(
        normalizeDimensions(dimensions), this.getDimension, this
    );

    var list = cloneListForMapAndSample(this, dimensions);

    // Following properties are all immutable.
    // So we can reference to the same value
    list.indices = this.indices;

    var storage = list._storage;

    var tmpRetValue = [];
    var chunkSize = this._chunkSize;
    this.each(dimensions, function () {
        var idx = arguments[arguments.length - 1];
        var retValue = cb && cb.apply(this, arguments);
        if (retValue != null) {
            // a number
            if (typeof retValue === 'number') {
                tmpRetValue[0] = retValue;
                retValue = tmpRetValue;
            }
            var chunkIndex = Math.floor(idx / chunkSize);
            var chunkOffset = idx % chunkSize;
            for (var i = 0; i < retValue.length; i++) {
                var dim = dimensions[i];
                var dimStore = storage[dim];
                if (dimStore) {
                    dimStore[chunkIndex][chunkOffset] = retValue[i];
                }
            }
        }
    }, stack, context);

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

    var indices = list.indices = [];

    var frameValues = [];
    var frameSize = Math.floor(1 / rate);

    var dimStore = targetStorage[dimension];
    var len = this.count();
    var chunkSize = this._chunkSize;

    for (var i = 0; i < len; i += frameSize) {
        // Last frame
        if (frameSize > len - i) {
            frameSize = len - i;
            frameValues.length = frameSize;
        }
        for (var k = 0; k < frameSize; k++) {
            var dataIdx = i + k;
            var originalChunkIndex = Math.floor(dataIdx / chunkSize);
            var originalChunkOffset = dataIdx % chunkSize;
            frameValues[k] = dimStore[originalChunkIndex][originalChunkOffset];
        }
        var value = sampleValue(frameValues);
        var sampleFrameIdx = sampleIndex(frameValues, value) || 0;
        var sampleChunkIndex = Math.floor(sampleFrameIdx / chunkSize);
        var sampleChunkOffset = sampleFrameIdx % chunkSize;
        // Only write value on the filtered data
        dimStore[sampleChunkIndex][sampleChunkOffset] = value;
        indices.push(sampleFrameIdx);
    }

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
    idx = this.indices[idx];
    return new Model(this._rawData.getItem(idx), hostModel, hostModel && hostModel.ecModel);
};

/**
 * Create a data differ
 * @param {module:echarts/data/List} otherList
 * @return {module:echarts/data/DataDiffer}
 */
listProto.diff = function (otherList) {
    var idList = this._idList;
    var otherIdList = otherList && otherList._idList;
    var val;
    // Use prefix to avoid index to be the same as otherIdList[idx],
    // which will cause weird udpate animation.
    var prefix = 'e\0\0';

    return new DataDiffer(
        otherList ? otherList.indices : [],
        this.indices,
        function (idx) {
            return (val = otherIdList[idx]) != null ? val : prefix + idx;
        },
        function (idx) {
            return (val = idList[idx]) != null ? val : prefix + idx;
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
    this._itemVisuals[idx] = itemVisual;

    if (isObject(key)) {
        for (var name in key) {
            if (key.hasOwnProperty(name)) {
                itemVisual[name] = key[name];
            }
        }
        return;
    }
    itemVisual[key] = value;
};

/**
 * Clear itemVisuals and list visual.
 */
listProto.clearAllVisual = function () {
    this._visual = {};
    this._itemVisuals = [];
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
listProto.cloneShallow = function () {
    var dimensionInfoList = zrUtil.map(this.dimensions, this.getDimensionInfo, this);
    var list = new List(dimensionInfoList, this.hostModel);

    // FIXME
    list._storage = this._storage;

    transferProperties(list, this);

    // Clone will not change the data extent and indices
    list.indices = new CtorUint32Array(this.indices);

    if (this._extent) {
        list._extent = zrUtil.extend({}, this._extent);
    }

    list._frameSize = this._frameSize;

    return list;
};

// ??? temporarily
listProto.$releaseItemMemory = function (idx) {
    if (this._itemLayouts) {
        this._itemLayouts[idx] = null;
    }
    if (this._itemVisuals) {
        this._itemVisuals[idx] = null;
    }
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
// listProto.CHANGABLE_METHODS = ['filterSelf'];

export default List;
