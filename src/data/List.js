define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var Model = require('../model/Model');
    var DataDiffer = require('./DataDiffer');

    function createArrayIterWithDepth(maxDepth, properties, cb, context, iterType) {
        // Simple optimization to avoid read the undefined value in properties array
        var nestedProperties = properties.length > 0;
        return function eachAxis(array, depth) {
            if (depth === maxDepth) {
                return zrUtil[iterType](array, cb, context);
            }
            else if (array) {
                var property = properties[depth];
                for (var i = 0; i < array.length; i++) {
                    var item = array[i];
                    // Access property of each item
                    if (nestedProperties && property && item) {
                        item = item[property];
                    }
                    array[i] = eachAxis(item, depth);
                }
            }
        }
    }

    /**
     * @name echarts/data/List~Entry
     * @extends {module:echarts/model/Model}
     */
    var Entry = Model.extend({

        layout: null,

        dimension: 1,

        init: function (option, parentModel, dataIndex) {

            /**
             * @type {string}
             * @memeberOf module:echarts/data/List~Entry
             * @public
             */
            this.name = option.name || '';

            this.option = option;

            /**
             * @type {number|Array}
             * @memeberOf module:echarts/data/List~Entry
             * @private
             */
            this._value = option.value == null ? option : option.value

            /**
             * @private
             * @readOnly
             */
            this.dataIndex = dataIndex || 0;
        },

        /**
         * @return {number}
         */
        getX: function () {
            // Use idx as x if data is 1d
            // Usually when xAxis is category axis
            return this.dimension === 1 ? this.dataIndex : this._value[0];
        },

        /**
         * @param {number} x
         */
        setX: function (x) {
            if (this.dimension > 1) {
                this._value[0] = x;
            }
        },

        /**
         * @return {number}
         */
        getY: function () {
            if (this.dimension > 1) {
                return this._value[1];
            }
            else {
                // Value is a single number if data is 1d
                return this._value;
            }
        },

        /**
         * @param {number} y
         */
        setY: function (y) {
            if (this.dimension > 1) {
                this._value[1] = y;
            }
            else {
                this._value = y;
            }
        },

        /**
         * @return {number}
         */
        getZ: function () {
            if (this.dimension > 2) {
                return this._value[2];
            }
        },

        /**
         * @param {number} z
         */
        setZ: function (z) {
            if (this.dimension > 2) {
                this._value[2] = z;
            }
        },

        /**
         * @return {number}
         */
        getValue: function () {
            return this._value[this.dimension];
        },

        /**
         * @param {number} value
         */
        setValue: function (value) {
            this._value[this.dimension] = value
        },

        clone: function () {
            var entry = new Entry(
                this.option, this.parentModel, this.dataIndex
            );
            entry.name = this.name;
            entry.dimension = this.dimension;
            return entry;
        }
    });

    function List() {

        this.elements = [];

        // Depth and properties is useful in nested Array.
        // For example in eventRiver, data structure is a nested 2d array as following
        // [{evolution: []}, {evolution: []}]
        // In this situation. depth should be 2 and properties should be ['evolution']
        this.depth = 1;

        this.properties = [];
    }

    List.prototype = {

        constructor: List,

        type: 'list',

        each: function (cb, context) {
            context = context || this;
            if (this.depth > 1) {
                createArrayIterWithDepth(
                    this.depth, this.properties, cb, context, 'each'
                )(this.elements, 0);
            }
            else {
                zrUtil.each(this.elements, cb, context);
            }
        },

        /**
         * Data mapping, returned array is flatten
         */
        map: function (cb, context) {
            var ret = [];
            this.each(function (item, idx) {
                ret.push(cb && cb.call(context || this, item));
            }, context);
            return ret;
        },

        /**
         * In-place filter
         */
        filterInPlace: function (cb, context) {
            context = context || this;
            if (this.depth > 1) {
                createArrayIterWithDepth(
                    this.depth, this.properties, cb, context, 'filter'
                )(this.elements, 0);
            }
            else {
                this.elements = zrUtil.filter(this.elements, cb, context);
            }
        },

        /**
         * In-place map
         */
        // mapInPlace: function (cb, context) {
        //     context = context || this;
        //     if (this.depth > 1) {
        //         createArrayIterWithDepth(
        //             this.depth, this.properties, cb, context, 'map'
        //         )(this.elements, 0);
        //     }
        //     else {
        //         this.elements = zrUtil.map(this.elements, cb, context);
        //     }
        // },

        /**
         * @return {module:echarts/data/List~Entry}
         */
        getByName: function (name) {
            // TODO deep hierarchy
            var elements = this.elements;
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].name === name) {
                    return elements[i];
                }
            }
        },

        /**
         * @param {string} name
         * @param {*} option
         */
        append: function (name, option) {
            var elements = this.elements;
            var el = new Entry(option, null, elements.length);
            el.name = name;
            elements.push(el);
            return el;
        },

        diff: function (oldList) {
            return new DataDiffer(oldList ? oldList.elements : [], this.elements);
        },

        clone: function () {
            var list = new List();
            var elements = this.elements;
            for (var i = 0; i < elements.length; i++) {
                list.elements.push(elements[i].clone());
            }
            list.depth = this.depth;
            list.properties = this.properties;
            return list;
        }
    };

    zrUtil.each(['X', 'Y', 'Z', 'Value'], function (name) {
        List.prototype['each' + name] = function (cb, context) {
            this.each(function (item, idx) {
                cb && cb.call(context || this, item['get' + name](idx));
            }, context);
        };

        List.prototype['map' + name] = function (cb, context) {
            var ret = [];
            this.each(function (item) {
                ret.push(cb && cb.call(context || this, item['get' + name]()));
            }, context);
            return ret;
        };
    });

    List.fromArray = function (data, dimension, parentModel) {
        var list = new List();
        // Normalize data
        list.elements = zrUtil.map(data, function (dataItem, index) {
            var entry = new Entry(dataItem, parentModel, index);
            // TODO
            if (! dataItem.name) {
                entry.name = index;
            }
            entry.dimension = dimension || 1;
            return entry;
        });
        return list;
    };

    List.Entry = Entry;

    return List;
});