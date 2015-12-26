define(function(require) {
    'use strict';

    function defaultKeyGetter(item) {
        return item;
    }

    function DataDiffer(oldArr, newArr, oldKeyGetter, newKeyGetter) {
        this._old = oldArr;
        this._new = newArr;

        this._oldKeyGetter = oldKeyGetter || defaultKeyGetter;
        this._newKeyGetter = newKeyGetter || defaultKeyGetter;
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
            var oldKeyGetter = this._oldKeyGetter;
            var newKeyGetter = this._newKeyGetter;

            var oldDataIndexMap = {};
            var newDataIndexMap = {};
            var i;

            initIndexMap(oldArr, oldDataIndexMap, oldKeyGetter);
            initIndexMap(newArr, newDataIndexMap, newKeyGetter);

            // Travel by inverted order to make sure order consistency
            // when duplicate keys exists (consider newDataIndex.pop() below).
            // For performance consideration, these code below do not look neat.
            for (i = 0; i < oldArr.length; i++) {
                var key = oldKeyGetter(oldArr[i]);
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

            for (var key in newDataIndexMap) {
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
                        for (var i = 0, len = idx.length; i < len; i++) {
                            this._add && this._add(idx[i]);
                        }
                    }
                }
            }
        }
    };

    function initIndexMap(arr, map, keyGetter) {
        for (var i = 0; i < arr.length; i++) {
            var key = keyGetter(arr[i]);
            var existence = map[key];
            if (existence == null) {
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