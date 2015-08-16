define(function (require) {

    var zrUtil = require('zrender/core/util');

    return require('../Component').extend({

        type: 'legend',

        render: function (ecModel, api) {
            var legendModel = ecModel.getComponent('legend');
        }
    });
});