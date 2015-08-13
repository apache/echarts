define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');

    function createArrayIterWithDepth(maxDepth, properties, cb, context, iterType) {
        // Simple optimization to avoid read the undefined value in properties array
        var nestedProperties = properties.length > 0;
        return function eachAxis(array, depth) {
            if (depth === maxDepth) {
                return zrUtil[iterType](array, cb, context);
            }
            else {
                if (array) {
                    var property = properties[i];
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
    }

    function List() {

        this.elements = this.elements || [];

        this.dataDimension = 2;

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
        mapInPlace: function (cb, context) {
            context = context || this;
            if (this.depth > 1) {
                createArrayIterWithDepth(
                    this.depth, this.properties, cb, context, 'map'
                )(this.elements, 0);
            }
            else {
                this.elements = zrUtil.map(this.elements, cb, context);
            }
        },

        getItemByName: function (name) {
            var elements = this.elements;
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].name === name) {
                    return elements[i];
                }
            }
        },
        /**
         * Get x of single data item.
         * can be overwritten
         * @param {*} item
         * @param {number} idx
         * @return {number}
         */
        getX: function (item, idx) {
            // Use idx as x if data is 1d
            // Usually when xAxis is category axis
            return this.dataDimension === 1 ? idx : item.value[0];
        },

        setX: function (item, x) {
            if (this.dataDimension > 1) {
                item.value[0] = x;
            }
        },

        /**
         * Get y of single data item.
         * can be overwritten
         * @param {*} item
         * @return {number}
         */
        getY: function (item) {
            if (this.dataDimension > 1) {
                return item.value[1];
            }
            else {
                // Value is a single number if data is 1d
                return item.value;
            }
        },

        setY: function (item, y) {
            if (this.dataDimension > 1) {
                item.value[1] = y;
            }
            else {
                item.value = y;
            }
        },

        /**
         * Get z of single data item.
         * can be overwritten
         * @param {*} item
         * @return {number}
         */
        getZ: function (item) {
            if (this.dataDimension > 2) {
                return item.value[2];
            }
        },

        setZ: function (item, z) {
            if (this.dataDimension > 2) {
                item.value[2] = z;
            }
        },

        /**
         * Get value of single data item.
         * can be overwritten
         * @param {*} item
         * @return {number}
         */
        getValue: function (item) {
            // PENDING
            return item.value[this.dataDimension];
        },

        setValue: function (item, z) {
            item.value[this.dataDimension] = z;
        },

        clone: function () {
            // Clone
        }
    };

    zrUtil.each(['X', 'Y', 'Z', 'Value'], function (name) {
        zrUtil.each(['each', 'map', 'filter'], function (iterType) {
            List.prototype[iterType + name] = function (cb, context) {
                this[iterType](function (item, idx) {
                    return cb && cb.call(context || this, this['get' + name](item, idx));
                }, context);
            };
        });
    });

    List.fromArray = function (data) {
        var list = new List();
        // Normalize data
        list.elements = zrUtil.map(data, function (dataItem) {
            if (dataItem !== Object(dataItem)) {
                return {
                    value: dataItem
                };
            }
            return dataItem;
        });
        return list;
    }

    return List;
});