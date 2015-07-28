define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');

    return function (name) {
        return function (selfState, globalState) {
            // Sync with processor option
            var path = 'legend.selected';
            var selected = globalState.get(path);
            if (! selected) {
                selected = globalState.set(path, [])
            }
            var state = zrUtil.filter(selected, function (item) {
                return item.name === name;
            })[0];
            if (state) {
                selfState.all = state.all;
                selfState.selected = state.selected;
            }
            else {
                selected.push({
                    name: name,
                    all: selfState.all,
                    selected: selfState.selected
                });
            }
        }
    };
});