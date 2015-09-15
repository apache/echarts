define(function(require) {
    'use strict';

    function defaultKeyGetter(item) {
        return item;
    }

    function DataDiffer(oldArr, newArr, keyGetter) {
        this._old = oldArr;
        this._new = newArr;

        this._keyGetter = keyGetter || defaultKeyGetter;
    };

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
            var keyGetter = this._keyGetter;

            var oldDataIndexMap = {};
            var newDataIndexMap = {};
            var i;
            for (i = 0; i < oldArr.length; i++) {
                oldDataIndexMap[keyGetter(oldArr[i])] = i;
            }
            for (i = 0; i < newArr.length; i++) {
                newDataIndexMap[keyGetter(newArr[i])] = i;
            }

            for (i = 0; i < oldArr.length; i++) {
                var newDataIndex = newDataIndexMap[keyGetter(oldArr[i])];
                if (newDataIndex != null) {
                    this._update && this._update(newDataIndex, i);
                }
                else {
                    this._remove && this._remove(i);
                }
            }

            for (i = 0; i < newArr.length; i++) {
                if (oldDataIndexMap[keyGetter(newArr[i])] == null) {
                    this._add && this._add(i);
                }
            }
        }
    };

    return DataDiffer;
});