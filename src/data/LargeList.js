/**
 * List for data storage
 */
define(function (require) {

    var UNDEFINED = 'undefined';
    var global = window;
    var Float32Array = typeof global.Float32Array === UNDEFINED
        ? Array : global.Float32Array;
    var Int32Array = typeof global.Int32Array === UNDEFINED
        ? Array : global.Int32Array;

    var Model = require('../model/Model');

    var List = function (dimensions, seriesModel) {

        /**
         * @readOnly
         * @type {Array.<string>}
         */
        this.dimensions = dimensions || ['x', 'y'];

        /**
         * @type {module:echarts/model/Model}
         */
        this.seriesModel = seriesModel;

        /**
         * Data storage
         * @type {Object.<key, Array.<number>>}
         * @private
         */
        this._storage = {};

        /**
         * Indices stores the indices of data subset after filtered.
         * This data subset will be used by chart.
         * @type {Array.<number>}
         * @private
         */
        this._indices = [];

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
    }

    var listProto = List.prototype;

    /**
     * Initialize from data
     */
    listProto.initData = function (data) {
        // Clear
        var optionModels = this._optionModels = [];
        var storage = this._storage = {};
        var indices = this._indices = [];

        var dimensions = this.dimensions;
        var size = data.length;

        // Init storage
        for (var i = 0; i < dimensions.length; i++) {
            storage[dimensions[i]] = new Float32Array(size);
        }
        storage[this.value] = new Float32Array(size);

        // Special storage of indices of option model
        // It is used for indexing the model in List#_optionModels
        var optionModelIndices = storage.$optionModelIndices = new Int32Array(size);

        var tempValue = [];
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
            if (typeof (value) === 'number') {
                // Use a tempValue to normalize the value to be a (x, y) value
                tempValue[0] = idx;
                tempValue[1] = value;
                value = tempValue;
            }

            // Store the data by dimensions
            for (var k = 0; k < dimensions.length; k++) {
                var dim = dimensions[k];
                var dimStorage = storage[dim];
                var dimValue = value[k];
                // PENDING NULL is empty or zero
                if (dimValue == null || dimValue === '-') {
                    dimValue = NaN;
                }
                dimStorage[idx] = dimValue;
            }

            indices.push(idx);
        }
    };

    /**
     * @return {number}
     */
    listProto.count = function () {
        return this._indices.length;
    };

    /**
     * Get value
     */
    listProto.get = function (dim, idx, stack) {
        var storage = this._storage;
        var dataIndex = this._indices[idx];

        var value = storage[dim] && storage[dim][dataIndex];
        if (stack && this.stackedOn) {
            var stackedValue = this.stackedOn.get(dim, idx, stack);
            // Ignore the empty data
            if (!isNaN(stackedValue)) {
                if (value >= 0 && stackedValue > 0 // Positive stack
                   || (value <= 0 && stackedValue < 0) // Negative stack
                ) {
                    value += stackedValue;
                }
            }
        }
        return value;
    };

    /**
     * Get raw data index
     */
    listProto.getDataIndex = function (idx) {
        return this._indices[idx];
    };

    function normalizeDimensions(dimensions) {
        if (typeof (dimensions) === 'number') {
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
     *  list.each('x', function (x) {});
     *  list.each(['x', 'y'], function (x, y) {});
     */
    listProto.each = function (dimensions, cb, stack, context) {
        dimensions = normalizeDimensions(dimensions);

        var value = [];
        var dimSize = dimensions.length;
        var indices = this._indices;

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            // Simple optimization
            if (dimSize === 1) {
                cb && cb.call(context, this.get(dimensions[0], i, stack));
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this.get(dimensions[k], i, stack);
                }
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
        var indices = this._indices;

        context = context || this;

        for (var i = 0; i < indices.length; i++) {
            var keep;
            // Simple optimization
            if (dimSize === 1) {
                keep = cb && cb.call(context, this.get(dimensions[0], i, stack));
            }
            else {
                for (var k = 0; k < dimSize; k++) {
                    value[k] = this.get(dimensions[k], i, stack);
                }
                keep = cb.apply(context, value);
            }
            if (keep) {
                newIndices.push(indices[i]);
            }
        }

        this._indices = newIndices;

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
        var result = [];
        this.each(dimensions, function () {
            result.push(cb && cb.apply(this, arguments));
        }, stack, context);
        return result;
    };

    /**
     * Get model of one data item.
     * It will create a temporary model if value on idx is not an option.
     */
    listProto.getDataModel = function (idx) {
        var storage = this._storage;
        var optionModelIndices = storage.$optionModelIndices;
        var modelIndex = optionModelIndices && optionModelIndices[idx];

        var model = this._optionModels[modelIndex];

        if (! model) {
            // Create a temporary model if value on idx is not an option.
            model = new Model(null, this.seriesModel);
        }
        return model;
    };

    /**
     * Shallow clone a new list.
     * New list only change the _indices.
     */
    listProto.cloneShallow = function () {
        var list = new List(this.dimensions, this.seriesModel);
        list.stackedOn = this.stackedOn;

        list._storage = this._storage;
        list._indices = this._indices.slice();
        list._optionModels = this._optionModels;

        return list;
    };


    /**
     * Helper function to create a list from option data
     */
    List.fromArray = function (data, seriesModel, ecModel) {
        var coordinateSystem = seriesModel.get('coordinateSystem');
        var dimensions;

        var categoryAxisModel;
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
                if (dimSize === 2) {
                    dimensions = ['x', 'y'];
                }
                else if (dimSize === 3) {
                    dimensions = ['x', 'y', 'z'];
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

        var list = new List(dimensions, seriesModel);

        list.initData(data);
    };

    return List;
});