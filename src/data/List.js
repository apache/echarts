/**
 * List for data storage
 * @module echarts/data/List
 */
define(function (require) {

    var UNDEFINED = 'undefined';
    var global = window;
    var Float32Array = typeof global.Float32Array === UNDEFINED
        ? Array : global.Float32Array;
    var Int32Array = typeof global.Int32Array === UNDEFINED
        ? Array : global.Int32Array;

    var dataCtors = {
        float: Float32Array,
        int: Int32Array,
        // Ordinal data type can be string or int
        ordinal: Array,
        'number': Array
    };

    var Model = require('../model/Model');
    var DataDiffer = require('./DataDiffer');

    var zrUtil = require('zrender/core/util');
    var isObject = zrUtil.isObject;

    var IMMUTABLE_PROPERTIES = [
        'stackedOn', '_nameList', '_rawData', '_optionModels'
    ];

    var transferImmuProperties = function (a, b) {
        zrUtil.each(IMMUTABLE_PROPERTIES, function (propName) {
            a[propName] = b[propName];
        })
    }

    /**
     * @constructor
     * @alias module:echarts/data/List
     *
     * @param {Array.<string>} dimensions
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
                    stackable: false,
                    // Type can be 'float', 'int', 'number'
                    // Default is number, Precision of float may not enough
                    type: 'number'
                };
            }
            else {
                dimensionInfo = dimensions[i];
                dimensionName = dimensionInfo.name;
                dimensionInfo.type = dimensionInfo.type || 'number'
            }
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
         * Indices stores the indices of data subset after filtered.
         * This data subset will be used in chart.
         * @type {Array.<number>}
         * @readOnly
         */
        this.indices = [];

        /**
         * Data storage
         * @type {Object.<key, TypedArray|Array>}
         * @private
         */
        this._storage = {};

        /**
         * @type {Array.<string>}
         */
        this._nameList = [];
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
         * Raw data
         */
        this._rawData = [];
    }

    var listProto = List.prototype;

    listProto.type = 'list';

    /**
     * Get type and stackable info of particular dimension
     */
    listProto.getDimensionInfo = function (dim) {
        return this._dimensionInfos[dim];
    };

    /**
     * Initialize from data
     * @param {Array.<Object|number|Array>} data
     * @param {Array.<string>} [nameList]
     */
    listProto.initData = function (data, nameList) {

        this._rawData = data;

        // Clear
        var optionModels = this._optionModels = [];
        var storage = this._storage = {};
        var indices = this.indices = [];

        var dimensions = this.dimensions;
        var size = data.length;
        var dimensionInfoMap = this._dimensionInfos;

        nameList = nameList || [];

        // Init storage
        for (var i = 0; i < dimensions.length; i++) {
            var dimInfo = dimensionInfoMap[dimensions[i]];
            var DataCtor = dataCtors[dimInfo.type];
            storage[dimensions[i]] = new DataCtor(size);
        }

        // Special storage of indices of option model
        // It is used for indexing the model in List#_optionModels
        var optionModelIndices = storage.$optionModelIndices = new Int32Array(size);

        var tempValue = [];
        var rawValueTo1D = false;
        var value1D = dimensions.length === 1;

        // Use the first data to indicate data type;
        var isValueArray = data[0] != null && zrUtil.isArray(
            data[0].value == null ? data[0] : data[0].value
        );
        for (var idx = 0; idx < data.length; idx++) {
            var value = data[idx];
            // Each data item contains value and other option
            // {
            //  value: []
            // }
            if (data[idx] != null && data[idx].hasOwnProperty('value')) {
                value = data[idx].value;
                var model = new Model(data[idx], this.hostModel);
                var modelIdx = optionModels.length;
                optionModelIndices[idx] = modelIdx;
                optionModels.push(model);
            }
            else {
                // Reference to the undefined
                optionModelIndices[idx] = -1;
            }
            // Bar chart, line chart which uses category axis
            // only gives the 'y' value. 'x' value is the indices of cateogry
            // Use a tempValue to normalize the value to be a (x, y) value
            if (!isValueArray) {
                if (!value1D) {
                    tempValue[0] = idx;
                    tempValue[1] = value;
                    value = tempValue;
                    rawValueTo1D = true;
                }
                // Pie chart is 1D
                else {
                    tempValue[0] = value;
                    value = tempValue;
                }
            }

            // Store the data by dimensions
            for (var k = 0; k < dimensions.length; k++) {
                var dim = dimensions[k];
                var dimInfo = dimensionInfoMap[dim];
                var dimStorage = storage[dim];
                var dimValue = value[k];
                // PENDING NULL is empty or zero
                switch (dimInfo.type) {
                    case 'float':
                    case 'number':
                        dimValue = +dimValue;
                        break;
                    case 'int':
                        dimValue = dimValue | 0;
                        break;
                }
                dimStorage[idx] = dimValue;
            }

            indices.push(idx);
        }

        // Use the name in option as data id in two value axis case
        for (var i = 0; i < optionModelIndices.length; i++) {
            if (!nameList[i]) {
                var modelIdx = optionModelIndices[i];
                var model = optionModels[modelIdx];
                if (model && model.option) {
                    nameList[i] = model.option.name || ('' + i);
                }
            }
        }

        this._nameList = nameList;
    };

    /**
     * @return {number}
     */
    listProto.count = function () {
        return this.indices.length;
    };

    /**
     * Get value
     * @param {string} dim
     * @param {number} idx
     * @param {boolean} stack
     * @return {number}
     */
    listProto.get = function (dim, idx, stack) {
        var storage = this._storage;
        var dataIndex = this.indices[idx];

        var value = storage[dim] && storage[dim][dataIndex];
        var dimensionInfo = this._dimensionInfos[dim];
        // FIXME ordinal data type is not stackable
        if (
            stack && this.stackedOn
            && dimensionInfo && dimensionInfo.stackable
        ) {
            var stackedValue = this.stackedOn.get(dim, idx, stack);
            // Considering positive stack, negative stack and empty data
            if ((value >= 0 && stackedValue > 0)  // Positive stack
                || (value <= 0 && stackedValue < 0) // Negative stack
            ) {
                value += stackedValue;
            }
        }
        return value;
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
    }

    /**
     * Get extent of data in one dimension
     * @param {string} dim
     * @param {boolean} stack
     */
    listProto.getDataExtent = function (dim, stack) {
        var dimData = this._storage[dim];
        var min = Infinity;
        var max = -Infinity;
        var value;
        // var dimInfo = this._dimensionInfos[dim];
        if (dimData) {
            // var isOrdinal = dimInfo.type === 'ordinal';
            for (var i = 0, len = this.count(); i < len; i++) {
                value = this.get(dim, i, stack);
                // FIXME
                // if (isOrdinal && typeof value === 'string') {
                //     value = zrUtil.indexOf(dimData, value);
                //     console.log(value);
                // }
                value < min && (min = value);
                value > max && (max = value);
            }
        }
        return [min, max];
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
     * Get raw value
     * @param {number} idx
     * @return {number}
     */
    listProto.getRawValue = function (idx) {
        var itemOpt = this._rawData[idx];
        if (itemOpt && itemOpt.hasOwnProperty('value')) {
            return itemOpt.value;
        }
        return itemOpt;
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
        var indices = this.indices;

        if (dimData) {
            for (var i = 0, len = indices.length; i < len; i++) {
                var rawIndex = indices[i];
                if (dimData[rawIndex] === value) {
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
            var rawIndex = indices[i];
            if (nameList[rawIndex] === name) {
                return i;
            }
        }

        return -1;
    };

    /**
     * Retreive the index of nearest value
     * @param {number} idx
     * @param {number} value
     * @param {boolean} stack If given value is after stacked
     * @return {number}
     */
    listProto.indexOfNearest = function (dim, value, stack) {
        var storage = this._storage;
        var dimData = storage[dim];

        if (dimData) {
            var minDist = Number.MAX_VALUE;
            var nearestIdx = -1;
            for (var i = 0, len = this.count(); i < len; i++) {
                var dist = Math.abs(this.get(dim, i, stack) - value);
                if (dist <= minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
            return nearestIdx;
        }
        return -1;
    }

    /**
     * Get raw data index
     * @param {number} idx
     * @return {number}
     */
    listProto.getRawIndex = function (idx) {
        return this.indices[idx];
    };

    /**
     * @param {number} idx
     * @param {boolean} [notDefaultIdx=false]
     * @return {string}
     */
    listProto.getName = function (idx, notDefaultIdx) {
        var nameList = this._nameList;
        var rawIndex = this.indices[idx];
        return nameList[rawIndex]
            || (notDefaultIdx ? '' : (rawIndex + ''));
    };


    function normalizeDimensions(dimensions) {
        if (typeof (dimensions) === 'string') {
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
    listProto.each = function (dimensions, cb, stack, context) {
        if (typeof dimensions === 'function') {
            context = stack;
            stack = cb;
            cb = dimensions;
            dimensions = [];
        }

        dimensions = normalizeDimensions(dimensions);

        var value = [];
        var dimSize = dimensions.length;
        var indices = this.indices;

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            if (dimSize === 0) {
                // FIXME Pass value as parameter ?
                cb.call(context, i);
            }
            // Simple optimization
            else if (dimSize === 1) {
                cb.call(context, this.get(dimensions[0], i, stack), i);
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this.get(dimensions[k], i, stack);
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

        dimensions = normalizeDimensions(dimensions);

        var newIndices = [];
        var value = [];
        var dimSize = dimensions.length;
        var indices = this.indices;

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            var keep;
            // Simple optimization
            if (dimSize === 1) {
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

    /**
     * Data mapping to a new List with given dimensions
     * @param {string|Array.<string>} dimensions
     * @param {Function} cb
     * @param {boolean} [stack=false]
     * @param {*} [context=this]
     * @return {Array}
     */
    listProto.map = function (dimensions, cb, stack, context) {
        var list = new List(
            zrUtil.map(dimensions, this.getDimensionInfo, this),
            this.hostModel
        );

        // Following properties are all immutable.
        // So we can reference to the same value
        var indices = list.indices = this.indices;

        // FIXME If needs stackedOn, value may already been stacked
        transferImmuProperties(list, this);

        var storage = list._storage = {};
        var thisStorage = this._storage;

        // Init storage
        for (var i = 0; i < dimensions.length; i++) {
            var dim = dimensions[i];
            var dimStore = thisStorage[dim];
            if (dimStore) {
                storage[dim] = new dimStore.constructor(
                    thisStorage[dim].length
                );
            }
        }

        storage.$optionModelIndices = thisStorage.$optionModelIndices;

        var tmpRetValue = [];
        this.each(dimensions, function () {
            var idx = arguments[arguments.length - 1];
            var retValue = cb && cb.apply(this, arguments);
            if (retValue != null) {
                // a number
                if (typeof retValue === 'number') {
                    tmpRetValue[0] = retValue;
                    retValue = tmpRetValue;
                }
                for (var i = 0; i < retValue.length; i++) {
                    var dim = dimensions[i];
                    var dimStore = storage[dim];
                    var rawIdx = indices[idx];
                    if (dimStore) {
                        dimStore[rawIdx] = retValue[i];
                    }
                }
            }
        });

        return list;
    };

    var temporaryModel = new Model(null);
    /**
     * Get model of one data item.
     * It will create a temporary model if value on idx is not an option.
     *
     * @param {number} idx
     * @param {boolean} [createNew=false]
     */
    // FIXME Model proxy ?
    listProto.getItemModel = function (idx, createNew) {
        var storage = this._storage;
        var optionModelIndices = storage.$optionModelIndices;
        var modelIndex = optionModelIndices && optionModelIndices[this.indices[idx]];

        var model = this._optionModels[modelIndex];

        var hostModel = this.hostModel;
        if (!model) {
            // Use a temporary model proxy if value on idx is not an option.
            // FIXME Create a new one may cause memory leak
            if (createNew) {
                model = new Model(null, hostModel);
            }
            else {
                model = temporaryModel;
                model.parentModel = hostModel;
            }
        }
        return model;
    };

    /**
     * Create a data differ
     * @param {module:echarts/data/List} oldList
     * @return {module:echarts/data/DataDiffer}
     */
    listProto.diff = function (oldList) {
        var nameList = this._nameList;
        return new DataDiffer(
            oldList ? oldList.indices : [], this.indices, function (idx) {
                return nameList && nameList[idx] || idx;
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
     * Get layout of single data item
     * @param {number} idx
     */
    listProto.getItemLayout = function (idx) {
        return this._itemLayouts[idx];
    },

    /**
     * Set layout of single data item
     * @param {number} idx
     * @param {Object} layout
     * @param {boolean=} merge
     */
    listProto.setItemLayout = function (idx, layout, merge) {
        this._itemLayouts[idx] = merge
            ? zrUtil.extend(this._itemLayouts[idx] || {}, layout)
            : layout;
    },

    /**
     * Get visual property of single data item
     * @param {number} idx
     * @param {string} key
     * @param {boolean} ignoreParent
     */
    listProto.getItemVisual = function (idx, key, ignoreParent) {
        var itemVisual = this._itemVisuals[idx];
        var val = itemVisual && itemVisual[key];
        if (val == null && !ignoreParent) {
            // Use global visual property
            return this.getVisual(key);
        }
        return val;
    },

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

    var setItemDataAndSeriesIndex = function (child) {
        child.seriesIndex = this.seriesIndex;
        child.dataIndex = this.dataIndex;
    }
    /**
     * @param {number} idx
     * @param {module:zrender/Element} el
     */
    listProto.setItemGraphicEl = function (idx, el) {
        var hostModel = this.hostModel;
        // Add data index and series index for indexing the data by element
        // Useful in tooltip
        el.dataIndex = idx;
        el.seriesIndex = hostModel && hostModel.seriesIndex;;
        if (el.type === 'group') {
            el.traverse(setItemDataAndSeriesIndex, this)
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
        var dimensionInfoList = zrUtil.map(this.dimensions, function (dim) {
            return this._dimensionInfos[dim];
        }, this);
        var list = new List(dimensionInfoList, this.hostModel);

        // FIXME
        list._storage = this._storage;

        transferImmuProperties(list, this);

        list.indices = this.indices.slice();

        return list;
    };

    return List;
});