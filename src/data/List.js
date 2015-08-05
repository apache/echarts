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
        filter: function (cb, context) {
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
        map: function (cb, context) {
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
         * Get x of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getX: function (idx) {
            var item = this.elements[idx];
            // Use idx as x if data is 1d
            return this.dataDimension === 1 ? idx : item.value[0];
        },

        /**
         * Get y of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getY: function (idx) {
            var item = this.elements[idx];
            if (this.dataDimension > 1) {
                return item.value[1];
            }
        },

        /**
         * Get z of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getZ: function (idx) {
            var item = this.elements[idx];
            if (this.dataDimension > 2) {
                return item.value[2];
            }
        },

        /**
         * Get value of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getValue: function (idx) {
            var item = this.elements[idx];
            // PENDING
            return item.value[this.dataDimension];
        },

        clone: function () {
            // Clone with depth
        }
    };

    zrUtil.each(['X', 'Y', 'Z', 'Value'], function (name) {
        zrUtil.each(['each', 'map', 'filter'], function (iterType) {
            List.prototype[iterType + name] = function (cb, context) {
                this[iterType](function (item, idx) {
                    return cb && cb.call(context || this, this['get' + name], idx);
                }, context);
            };
        });
    });

    List.fromArray = function (data) {
        var list = new List();
        // Normalize data
        // 2D Array
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