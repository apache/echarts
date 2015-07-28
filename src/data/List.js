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

        // Depth and properties is useful in nested Array.
        // For example in eventRiver, data structure is a nested 2d array as following
        // [{evolution: []}, {evolution: []}]
        // In this situation. depth should be 2 and properties should be ['evolution']
        this.depth = 1;

        this.properties = [];
    }

    List.prototype = {

        constructor: List,

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

/*
PENDING
        flatten: function () {

        },

        group: function () {

        },
*/

        /**
         * Get x of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getX: function (idx) {

        },

        /**
         * Get y of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getY: function (idx) {

        },

        /**
         * Get z of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getZ: function (idx) {

        },

        /**
         * Get value of single data item by a given data index.
         * can be overwritten
         * @param {number} idx
         * @return {number}
         */
        getValue: function (idx) {

        },

        clone: function () {
            // Clone with depth
        }
    };

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