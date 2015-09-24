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
        'number': Array
    };

    var Model = require('../model/Model');
    var DataDiffer = require('./DataDiffer');

    var zrUtil = require('zrender/core/util');
    var isObject = zrUtil.isObject;

    /**
     * @constructor
     * @alias module:echarts/data/List
     */
    var List = function (dimensions, seriesModel) {

        dimensions = dimensions || ['x', 'y'];

        var dimensionInfos = [];
        var dimensionNames = [];
        for (var i = 0; i < dimensions.length; i++) {
            var dimensionName;
            var dimensionInfo = {};
            if (typeof dimensions[i] === 'string') {
                dimensionName = dimensions[i];
                dimensionInfo = {
                    name: dimensionName,
                    // Type can be 'float', 'int', 'number'
                    // Default is number, Precision of float may not enough
                    type: 'number'
                };
            }
            else {
                dimensionInfo = dimensions[i];
                dimensionName = dimensionInfo.name;
                dimensionInfo.type = dimensionInfo.type || 'float'
            }
            dimensionNames.push(dimensionName);
            dimensionInfos.push(dimensionInfo);
        }
        /**
         * @readOnly
         * @type {Array.<string>}
         */
        this.dimensions = dimensionNames;

        /**
         * Infomation of each data dimension, like data type.
         */
        this._dimensionInfos = dimensionInfos;

        /**
         * @type {module:echarts/model/Model}
         */
        this.seriesModel = seriesModel;

        /**
         * Indices stores the indices of data subset after filtered.
         * This data subset will be used in chart.
         * @type {Array.<number>}
         * @readOnly
         */
        this.indices = [];

        /**
         * Dimensions hint for regenerating the raw value
         * @type {Array.<string>}
         */
        this._rawValueDims = ['x'];

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
    }

    var listProto = List.prototype;

    listProto.type = 'list';

    /**
     * Initialize from data
     * @param {Array.<Object|number|Array>} data
     * @param {Array.<string>} [nameList]
     */
    listProto.initData = function (data, nameList) {
        // Clear
        var optionModels = this._optionModels = [];
        var storage = this._storage = {};
        var indices = this.indices = [];

        var dimensions = this.dimensions;
        var size = data.length;

        nameList = nameList || [];

        // Init storage
        for (var i = 0; i < dimensions.length; i++) {
            var dimInfo = this._dimensionInfos[i];
            var DataCtor = dataCtors[dimInfo.type];
            storage[dimensions[i]] = new DataCtor(size);
        }

        // Special storage of indices of option model
        // It is used for indexing the model in List#_optionModels
        var optionModelIndices = storage.$optionModelIndices = new Int32Array(size);

        var tempValue = [];
        var rawValue1D = false;
        for (var idx = 0; idx < data.length; idx++) {
            var value = data[idx];
            // Each data item contains value and option
            if (data[idx] != null && data[idx].hasOwnProperty('value')) {
                value = data[idx].value;
                var model = new Model(data[idx], this.seriesModel);
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
            if (!isNaN(value)) {
                // Use a tempValue to normalize the value to be a (x, y) value
                tempValue[0] = idx;
                tempValue[1] = value;
                value = tempValue;
                rawValue1D = true;
            }

            // Store the data by dimensions
            for (var k = 0; k < dimensions.length; k++) {
                var dim = dimensions[k];
                var dimInfo = this._dimensionInfos[k];
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

        this._rawValueDims = rawValue1D ? dimensions.slice(1, 2) : dimensions.slice();

        // Use the name in option as data id in two value axis case
        for (var i = 0; i < optionModelIndices.length; i++) {
            if (!nameList[i]) {
                var modelIdx = optionModelIndices[i];
                var model = optionModels[modelIdx];
                if (model && model.option) {
                    nameList[i] = model.option.name || '';
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
        if (stack && this.stackedOn) {
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
        for (var i = 0, len = dimensions.length; i < len; i++) {
            if (isNaN(this.get(dimensions[i], idx))) {
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
        if (dimData) {
            for (var i = 0, len = this.count(); i < len; i++) {
                value = this.get(dim, i, stack);
                value < min && (min = value);
                value > max && (max = value);
            }
        }
        return [min, max];
    };

    /**
     * Get raw value
     * @param {number} idx
     * @return {number}
     */
    listProto.getRawValue = function (idx) {
        var rawValueDims = this._rawValueDims;
        var storage = this._storage;
        if (rawValueDims.length === 1) {
            var dimData = storage[rawValueDims[0]];
            return dimData && dimData[idx];
        }
        else {
            var value = [];
            for (var i = 0; i < rawValueDims.length; i++) {
                value[i] = this.get(rawValueDims[i], idx);
            }
            return value;
        }
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

        if (dimData) {
            for (var i = 0, len = dimData.length; i < len; i++) {
                if (dimData[i] === value) {
                    return i;
                }
            }
        }
        return -1;
    };

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
     * @return {string}
     */
    listProto.getName = function (idx) {
        var nameList = this._nameList;
        return (nameList && nameList[this.indices[idx]]) || '';
    };


    function normalizeDimensions(dimensions) {
        if (typeof (dimensions) === 'string') {
            dimensions = [dimensions];
        }
        return dimensions;
    }

    function getStackDimMap(stackDim, dimensions) {
        if (! stackDim) {
            return {};
        }
        if (typeof stackDim === 'string') {
            stackDim = [stackDim];
        }
        var stackDimMap = {};
        // Avoid get the undefined value
        for (var i = 0; i < dimensions.length; i++) {
            stackDimMap[dimensions[i]] = false;
        }
        for (var i = 0; i < stackDim.length; i++) {
            stackDimMap[stackDim[i]] = true;
        }
        return stackDimMap;
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

        // Only stacked on the value axis
        var stackDimMap = getStackDimMap(this._rawValueDims, dimensions);
        // Optimizing for 1 dim case
        var firstDimStack = stack && stackDimMap[dimensions[0]];

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            if (dimSize === 0) {
                // FIXME Pass value as parameter ?
                cb.call(context, i);
            }
            // Simple optimization
            else if (dimSize === 1) {
                cb.call(context, this.get(dimensions[0], i, firstDimStack), i);
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this.get(dimensions[k], i, stack && stackDimMap[dimensions[k]]);
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
        dimensions = normalizeDimensions(dimensions);

        var newIndices = [];
        var value = [];
        var dimSize = dimensions.length;
        var indices = this.indices;

        // Only stacked on the value axis
        var stackDimMap = getStackDimMap(this._rawValueDims, dimensions);
        // Optimizing for 1 dim case
        var firstDimStack = stack && stackDimMap[dimensions[0]];

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            var keep;
            // Simple optimization
            if (dimSize === 1) {
                keep = cb.call(
                    context, this.get(dimensions[0], i, firstDimStack), i
                );
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this.get(dimensions[k], i, stack && stackDimMap[dimensions[k]]);
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
     * Data mapping
     * @param {string|Array.<string>}
     * @param {Function} cb
     * @param {boolean} [stack=false]
     * @param {*} [context=this]
     */
    listProto.map = function (dimensions, cb, stack, context) {
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

    var temporaryModel = new Model(null);
    /**
     * Get model of one data item.
     * It will create a temporary model if value on idx is not an option.
     *
     * @param {number} idx
     */
    listProto.getItemModel = function (idx) {
        var storage = this._storage;
        var optionModelIndices = storage.$optionModelIndices;
        var modelIndex = optionModelIndices && optionModelIndices[this.indices[idx]];

        var model = this._optionModels[modelIndex];

        if (! model) {
            // Use a temporary model proxy if value on idx is not an option.
            // FIXME Create a new one may cause memory leak
            model = temporaryModel;
            model.parentModel = this.seriesModel;
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
     */
    listProto.setItemLayout = function (idx, layout) {
        this._itemLayouts[idx] = layout;
    },

    /**
     * Get visual property of single data item
     * @param {number} idx
     * @param {string} key
     */
    listProto.getItemVisual = function (idx, key) {
        var itemVisual = this._itemVisuals[idx];
        var val = itemVisual && itemVisual[key];
        if (val == null) {
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

    /**
     * @param {number} idx
     * @param {module:zrender/Element} el
     */
    listProto.setItemGraphicEl = function (idx, el) {
        // Add data index and series index for indexing the data by element
        // Useful in tooltip
        el.dataIndex = idx;
        el.seriesIndex = this.seriesModel.seriesIndex;

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
        zrUtil.each(this._graphicEls, cb, context);
    };

    /**
     * Shallow clone a new list except visual and layout properties, and graph elements.
     * New list only change the indices.
     */
    listProto.cloneShallow = function () {
        var list = new List(this._dimensionInfos, this.seriesModel);
        list.stackedOn = this.stackedOn;

        // FIXME
        list._storage = this._storage;
        list._optionModels = this._optionModels;
        list._rawValueDims = this._rawValueDims;
        list._nameList = this._nameList;

        list.indices = this.indices.slice();

        return list;
    };

    /**
     * Helper function to create a list from option data
     */
    List.fromArray = function (data, seriesModel, ecModel) {
        var coordinateSystem = seriesModel.get('coordinateSystem');
        var dimensions;

        var categoryAxisModel;
        var nameList = [];
        // FIXME
        // 这里 List 跟几个坐标系和坐标系 Model 耦合了
        if (coordinateSystem === 'cartesian2d') {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
            if (xAxisModel.get('type') === 'category') {
                dimensions = ['x', 'y'];

                categoryAxisModel = xAxisModel;
            }
            else if (yAxisModel.get('type') === 'category') {
                dimensions = ['y', 'x'];

                categoryAxisModel = yAxisModel;
            }
            else {
                // PENDING
                var dimSize = data[0] && data[0].length;
                // FIXME
                var dimensionNames = ['x', 'y', 'z', 'a', 'b', 'c', 'd', 'e'];
                if (dimSize >= 2) {
                    dimensions = dimensionNames.slice(0, dimSize);
                }
            }
        }
        else if (coordinateSystem === 'polar') {
            var axisFinder = function (axisModel) {
                return axisModel.get('polarIndex') === polarIndex;
            }
            var polarIndex = seriesModel.get('polarIndex') || 0;
            var angleAxisModel = ecModel.findComponent('angleAxis', axisFinder);
            var radiusAxisModel = ecModel.findComponent('radiusAxis', axisFinder);

            if (angleAxisModel.get('type') === 'category') {
                dimensions = ['angle', 'radius'];

                categoryAxisModel = angleAxisModel;
            }
            else if (radiusAxisModel.get('type') === 'category') {
                dimensions = ['radius', 'angle'];

                categoryAxisModel = radiusAxisModel;
            }
            else {
                // PENDING
                var dimSize = data[0] && data[0].length;
                if (dimSize === 2) {
                    dimensions = ['radius', 'angle'];
                }
                else if (dimSize === 3) {
                    dimensions = ['radius', 'angle', 'value'];
                }
            }
        }

        if (categoryAxisModel) {
            nameList = categoryAxisModel.get('data');
        }

        var list = new List(dimensions, seriesModel);

        list.initData(data, nameList);

        return list;
    };

    return List;
});