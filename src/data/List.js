// TODO entry.getLon(), entry.getLat()
// List supported for cartesian, polar coordinateSystem
define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var Model = require('../model/Model');
    var DataDiffer = require('./DataDiffer');

    var POSSIBLE_DIMENSIONS = ['x', 'y', 'z', 'value', 'radius', 'angle'];

    /**
     * Check if two entries has same xIndex, yIndex, zIndex, valueIndex, etc.
     * @param {module:echarts/data/List~Entry} entry1
     * @param {module:echarts/data/List~Entry} entry2
     * @inner
     */
    function isEntrySameShape(entry1, entry2) {
        for (var i = 0; i < POSSIBLE_DIMENSIONS.length; i++) {
            var key = POSSIBLE_DIMENSIONS[i] + 'Index';
            if (entry1[key] !== entry2[key]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @name echarts/data/List~Entry
     * @extends {module:echarts/model/Model}
     *
     * @param {Object} option
     * @param {module:echarts/model/Model} parentModel
     * @param {number} dataIndex
     * @param {Array.<string>} [independentVar=['x']]
     * @param {Array.<string>} [dependentVar='y']
     */
    var Entry = Model.extend({

        layout: null,

        /**
         * @type {number}
         * @protected
         */
        xIndex: 0,

        /**
         * @type {number}
         * @protected
         */
        yIndex: 1,

        /**
         * @type {number}
         * @protected
         */
        zIndex: -1,

        /**
         * @type {number}
         * @protected
         */
        radiusIndex: 0,

        /**
         * @type {number}
         * @protected
         */
        angleIndex: 1,

        /**
         * @type {number}
         * @protected
         */
        valueIndex: 1,

        /**
         * @type {module:echarts/data/List~Entry}
         */
        stackedOn: null,

        init: function (option, parentModel, rawDataIndex, independentVar, dependentVar) {

            // Normalize option to { value: [] }
            var value = option.value;
            // Pending
            if (value == null
                && (zrUtil.isArray(option)
                || typeof (option) === 'number')
            ) {
                value = option;
                option = {
                    value: option
                }
            }

            /**
             * @type {string}
             * @memeberOf module:echarts/data/List~Entry
             * @public
             */
            this.name = option.name || '';

            /**
             * this.option **MUST NOT** be modified in List!
             * Different lists might share this option instance.
             *
             * @readOnly
             * @type {*}
             */
            this.option = option;

            if (value === '-' || value == null) {
                value = [rawDataIndex, null];
            }
            else if (!isNaN(value)) {
                value = [rawDataIndex, +value];
                /**
                 * If dataIndex is persistent in entry, it should be udpated when modifying list.
                 * So use this.dataIndexIndex to mark that.
                 *
                 * @readOnly
                 * @type {number}
                 */
                this.dataIndexIndex = 0;
            }

            if (independentVar) {
                for (var i = 0; i < independentVar.length; i++) {
                    this[independentVar[i] + 'Index'] = i;
                }
                this.valueIndex = value.length - 1;

                this[dependentVar + 'Index'] = this.valueIndex;
            }

            /**
             * All of the content **MUST NOT** be modified,
             * (because they are the same instance with option.value)
             * except this._value[this.dataIndexIndex].
             *
             * @type {Array.<number>}
             * @memeberOf module:echarts/data/List~Entry
             * @private
             */
            this._value = value;

            /**
             * Data index before modifying list (filterSelf).
             *
             * @readOnly
             */
            this.rawDataIndex = rawDataIndex;
        },

        /**
         * Get raw value which is given by option
         */
        getRawValue: function () {
            return this.get('value') || this.get();
        },

        setDataIndex: function (index) {
            if (this.dataIndexIndex != null) {
                this._value[this.dataIndexIndex] = index;
            }
        },

        clone: function (dataIndex, independentVar, dependentVar) {
            var entry = new Entry(this.option, this.parentModel, dataIndex, independentVar, dependentVar);
            entry.name = this.name;
            entry.stackedOn = this.stackedOn;

            return entry;
        }
    });

    zrUtil.each(POSSIBLE_DIMENSIONS, function (dim) {
        var capitalized = dim[0].toUpperCase() + dim.substr(1);
        var indexKey = dim + 'Index';
        var getterName = 'get' + capitalized;

        Entry.prototype[getterName] = function (stack) {
            var index = this[indexKey];
            if (index >= 0) {
                var val = this._value[index];
                var stackedOn = this.stackedOn;

                // Normalize empty value
                if (val === '-' || val == null) {
                    val = null;
                }
                if (val != null
                    // Has stack
                    && stack && stackedOn
                    // Is getValue
                    && index === this.valueIndex
                    // Has same dimensions shape on stack
                    // PENDING If check the two stacking entries have same shape
                    && isEntrySameShape(this, stackedOn)
                ) {
                    var stackValue = stackedOn[getterName](stack);
                    if (
                        // Positive stack
                        val > 0 && stackValue > 0
                        // Negative stack
                        || (val < 0 && stackValue < 0)
                    ) {
                        val += stackValue;
                    }
                }
                return val;
            }
        };
    });

    function List(dimensions, value) {
        /**
         * @readOnly
         * @type {Array}
         */
        this.elements = [];

        /**
         * @readOnly
         * @type {Array.<string>}
         */
        this.dimensions = dimensions || ['x']

        /**
         * @readOnly
         * @type {string}
         */
        this.value = value || 'y';
    }

    List.prototype = {

        constructor: List,

        type: 'list',

        /**
         * @type {module:echarts/data/List~Entry}
         */
        at: function (idx) {
            return this.elements[idx];
        },

        /**
         * Create and add a new entry
         * @param {Object} option
         * @param {module:echarts/model/Model} parentModel
         * @return {module:echarts/data/List~Entry}
         */
        add: function (option, parentModel) {
            var elements = this.elements;
            var entry = new Entry(option, parentModel, elements.length, this.dimensions, this.value);
            elements.push(entry);
            return entry;
        },

        /**
         * Get elements count
         * @return {number}
         */
        count: function () {
            return this.elements.length;
        },

        /**
         * Iterate each element
         * @param {Function} cb
         * @param {*} context
         */
        each: function (cb, context) {
            zrUtil.each(this.elements, cb, context || this);
        },

        /**
         * Map elemements to a new created array
         * @param {Function} cb
         * @param {*} context
         */
        map: function (cb, context) {
            var ret = [];
            var elements = this.elements;
            context = context || this;
            for (var i = 0; i < elements.length; i++) {
                ret.push(cb && cb.call(context, elements[i], i));
            }
            return ret;
        },

        /**
         * Filter elements in place
         * @param {Function} cb
         * @param {*} context
         */
        filterSelf: function (cb, context) {
            this.elements = zrUtil.filter(this.elements, cb, context || this);
        },

        /**
         * @return {module:echarts/data/List~Entry}
         */
        getByName: function (name) {
            var elements = this.elements;
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].name === name) {
                    return elements[i];
                }
            }
        },

        /**
         * Get the diff result with the old list data
         * @param {module:echarts/data/List} oldList
         * @return {module:echarts/data/DataDiffer}
         * @example
         *  data.diff(this._data)
         *      .add(function (item) { // Add a new shape})
         *      .update(function (newItem, oldItem) { // Update the shape})
         *      .remove(function (item) { // Remove unused shape})
         *      .execute()
         */
        diff: function (oldList) {
            return new DataDiffer(oldList ? oldList.elements : [], this.elements);
        },

        /**
         * Clone a new list and all its' entries
         * @return {module:echarts/data/List}
         */
        clone: function () {
            var list = new List(this.dimensions, this.value);
            var elements = this.elements;
            for (var i = 0; i < elements.length; i++) {
                list.elements.push(elements[i].clone(i, this.dimensions, this.value));
            }
            return list;
        },

        /**
         * Clone a new list
         */
        cloneShallow: function () {
            var list = new List(this.dimensions, this.value);
            list.elements = this.elements.slice();
            // FIXME
            // All list have the same entries may have problem
            // When processor modify the data besides data index

            // Reset data index
            for (var i = 0; i < list.elements.length; i++) {
                var el = list.elements[i];
                // Reset
                el.setDataIndex(i);
                el.clearVisual();
                el.layout = null;
            }
            return list;
        }
    };

    zrUtil.each(POSSIBLE_DIMENSIONS, function (dim) {
        var capitalized = dim[0].toUpperCase() + dim.substr(1);

        List.prototype['each' + capitalized] = function (cb, stack, context) {
            this.each(function (item, idx) {
                cb && cb.call(context || this, item['get' + capitalized](stack));
            }, context);
        };

        List.prototype['map' + capitalized] = function (cb, stack, context) {
            var ret = [];
            this.each(function (item) {
                ret.push(cb && cb.call(context || this, item['get' + capitalized](stack)));
            }, context);
            return ret;
        };

        List.prototype['getExtent' + capitalized] = function () {
            var min = Number.MAX_VALUE;
            var max = Number.MIN_VALUE;
            this.each(function (item) {
                var value = item['get' + capitalized]();
                if (value != null) {
                    value > max && (max = value);
                    value < min && (min = value);
                }
            });
            return [min, max];
        };

    });

    List.fromArray = function (data, seriesModel, ecModel) {
        var coordinateSystem = seriesModel.get('coordinateSystem');
        var independentVar;
        var dependentVar;

        var categoryAxisModel;
        // FIXME
        // 这里 List 跟几个坐标系和坐标系 Model 耦合了
        if (coordinateSystem === 'cartesian2d') {
            var xAxisModel = ecModel.getComponent('xAxis', seriesModel.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', seriesModel.get('yAxisIndex'));
            if (xAxisModel.get('type') === 'category') {
                independentVar = ['x'];
                dependentVar = 'y';

                categoryAxisModel = xAxisModel;
            }
            else if (yAxisModel.get('type') === 'category') {
                independentVar = ['y'];
                dependentVar = 'x';

                categoryAxisModel = yAxisModel;
            }
            else {
                // PENDING
                var dim = data[0] && data[0].length;
                if (dim === 2) {
                    independentVar = ['x'];
                    dependentVar = 'y';
                }
                else if (dim === 3) {
                    independentVar = ['x', 'y'];
                    dependentVar = 'z';
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
                independentVar = ['angle'];
                dependentVar = 'radius';

                categoryAxisModel = angleAxisModel;
            }
            else if (radiusAxisModel.get('type') === 'category') {
                independentVar = ['radius'];
                dependentVar = 'angle';

                categoryAxisModel = radiusAxisModel;
            }
            else {
                // PENDING
                var dim = data[0] && data[0].length;
                if (dim === 2) {
                    independentVar = ['radius'];
                    dependentVar = 'angle';
                }
                else if (dim === 3) {
                    independentVar = ['radius', 'angle'];
                    dependentVar = 'value';
                }
            }
        }

        var list = new List(independentVar, dependentVar);

        var categoryAxisData = categoryAxisModel && categoryAxisModel.getData();
        // Normalize data
        zrUtil.each(data, function (dataItem, idx) {
            var entry = list.add(dataItem, seriesModel);
            if (!dataItem.name) {
                entry.name = categoryAxisData && categoryAxisData[idx] || idx;
            }
            return entry;
        });
        return list;
    };

    List.Entry = Entry;

    return List;
});