define(function (require) {

    var zrUtil = require('zrender/core/util');

    return require('../Component').extend({

        type: 'legend',

        render: function (option, state, api) {
            var selectedStateGroup = state.get('legend.selected');
            if (selectedStateGroup) {
                zrUtil.each(selectedStateGroup, function (selectedState) {

                    var selectedMap = {};
                    zrUtil.each(selectedState.selected, function (name) {
                        selectedMap[name] = true;
                    });

                    zrUtil.each(selectedState.all, function (name) {

                    });
                });
            }
        }
    });
});