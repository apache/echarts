define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');

    return function (name) {
        return function (state, globalState) {
            // Sync with processor option
            var path = 'legend.selected';
            var selected = globalState.get(path);
            if (! selected) {
                selected = globalState.set(path, [])
            }
            var state = zrUtil.filter(selected, function (item) {
                return item.name === name
            })[0];
            if (state) {
                this.state.all = state.all;
                this.state.selected = state.selected;
            }
            else {
                selected.push({
                    name: name,
                    all: state.all,
                    selected: state.selected
                });
            }
        }
    };
});