define(function(require) {
    'use strict';

    function DataDiffer(oldArr, newArr) {
        this._old = oldArr;
        this._new = newArr;
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

            var oldDataMap = {};
            var newDataMap = {};
            var i;
            for (i = 0; i < oldArr.length; i++) {
                oldDataMap[oldArr[i].name] = oldArr[i];
            }
            for (i = 0; i < newArr.length; i++) {
                newDataMap[newArr[i].name] = newArr[i];
            }

            for (i = 0; i < oldArr.length; i++) {
                var oldData = oldArr[i];
                var newData = newDataMap[oldData.name];
                if (newData) {
                    this._update && this._update(newData, oldData);
                }
                else {
                    this._remove && this._remove(oldData);
                }
            }

            for (i = 0; i < newArr.length; i++) {
                var newData = newArr[i];
                if (! oldDataMap[newData.name]) {
                    this._add && this._add(newData);
                }
            }
        }
    };

    return DataDiffer;
});