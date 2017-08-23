define(function(require) {
    'use strict';

    function defaultKeyGetter(item) {
        return item;
    }

    /**
     * @param {Array} oldArr
     * @param {Array} newArr
     * @param {Function} oldKeyGetter
     * @param {Function} newKeyGetter
     * @param {Object} [context] Can be visited by this.context in callback.
     */
    function DataDiffer(oldArr, newArr, oldKeyGetter, newKeyGetter, context) {
        this._old = oldArr;
        this._new = newArr;

        this._oldKeyGetter = oldKeyGetter || defaultKeyGetter;
        this._newKeyGetter = newKeyGetter || defaultKeyGetter;

        this.context = context;
    }

    DataDiffer.prototype = {

        constructor: DataDiffer,

        /**
         * Callback function when add a data
         */
        add: function (func) {
            this._add = func;
            return this;
        },

        /**
         * Callback function when update a data
         */
        update: function (func) {
            this._update = func;
            return this;
        },

        /**
         * Callback function when remove a data
         */
        remove: function (func) {
            this._remove = func;
            return this;
        },

        execute: function () {
            var oldArr = this._old;
            var newArr = this._new;

            var oldDataIndexMap = {};
            var newDataIndexMap = {};
            var oldDataKeyArr = [];
            var newDataKeyArr = [];
            var i;

            initIndexMap(oldArr, oldDataIndexMap, oldDataKeyArr, '_oldKeyGetter', this);
            initIndexMap(newArr, newDataIndexMap, newDataKeyArr, '_newKeyGetter', this);

            // Travel by inverted order to make sure order consistency
            // when duplicate keys exists (consider newDataIndex.pop() below).
            // For performance consideration, these code below do not look neat.
            for (i = 0; i < oldArr.length; i++) {
                var key = oldDataKeyArr[i];
                var idx = newDataIndexMap[key];

                // idx can never be empty array here. see 'set null' logic below.
                if (idx != null) {
                    // Consider there is duplicate key (for example, use dataItem.name as key).
                    // We should make sure every item in newArr and oldArr can be visited.
                    var len = idx.length;
                    if (len) {
                        len === 1 && (newDataIndexMap[key] = null);
                        idx = idx.unshift();
                    }
                    else {
                        newDataIndexMap[key] = null;
                    }
                    this._update && this._update(idx, i);
                }
                else {
                    this._remove && this._remove(i);
                }
            }

            for (var i = 0; i < newDataKeyArr.length; i++) {
                var key = newDataKeyArr[i];
                if (newDataIndexMap.hasOwnProperty(key)) {
                    var idx = newDataIndexMap[key];
                    if (idx == null) {
                        continue;
                    }
                    // idx can never be empty array here. see 'set null' logic above.
                    if (!idx.length) {
                        this._add && this._add(idx);
                    }
                    else {
                        for (var j = 0, len = idx.length; j < len; j++) {
                            this._add && this._add(idx[j]);
                        }
                    }
                }
            }
        }
    };

    function initIndexMap(arr, map, keyArr, keyGetterName, dataDiffer) {
        for (var i = 0; i < arr.length; i++) {
            // Add prefix to avoid conflict with Object.prototype.
            var key = '_ec_' + dataDiffer[keyGetterName](arr[i], i);
            var existence = map[key];
            if (existence == null) {
                keyArr.push(key);
                map[key] = i;
            }
            else {
                if (!existence.length) {
                    map[key] = existence = [existence];
                }
                existence.push(i);
            }
        }
    }

    return DataDiffer;
});