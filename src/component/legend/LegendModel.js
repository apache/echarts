define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    return require('../model/Model').extend({

        type: 'legend',

        init: function (option) {
            this._selected = {};
            this._extendSelected(option.selected);
        },

        mergeOption: function (option) {
            zrUtil.merge(this._option, option);
            this._extendSelected(option.selected);
        },

        _extendSelected: function (newSelected) {
            if (newSelected) {
                for (var name in newSelected) {
                    this._selected[name] = !!newSelected[name];
                }
            }
        },

        select: function (name) {
            this._selected[name] = true;
        },

        unSelect: function (name) {
            this._selected[name] = false;
        },

        isSelected: function (name) {
            return this._selected[name] === true;
        }
    });
});