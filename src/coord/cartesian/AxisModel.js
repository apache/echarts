define(function(require) {

    'use strict';

    var AxisModel = require('../model/Component').extend({
        type: 'axis'
    });

    AxisModel.AxisX = AxisModel.extend({

        type: 'axisX',

        init: function (option) {
            option.type = option.type || 'category';
        }
    });

    AxisModel.AxisY = AxisModel.extend({

        type: 'axisY',

        init: function (option) {
            option.type = option.type || 'value';
        }
    });

    return AxisModel;
});