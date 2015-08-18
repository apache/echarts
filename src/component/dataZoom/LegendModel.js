define(function(require) {

    'use strict';

    return require('../model/Model').extend({

        type: 'legend',

        init: function (option) {
            option.selected = option.selected || {};
        },

        select: function (name) {
            this.option.selected[name] = true;
        },

        unSelect: function (name) {
            this.option.selected[name] = false;
        },

        isSelected: function (name) {
            var selected = this.option.selected;
            return !((name in selected) && selected[name]);
        }
    });
});