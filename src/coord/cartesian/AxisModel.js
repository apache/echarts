define(function(require) {

    'use strict';

    var AxisModel = require('../model/Component').extend({

        type: 'axis',

        mergeOption: function (option) {
            
        },

        setRange: function (start, end) {
            this._range[0] = start;
            this._range[1] = end;
        }
    });

    AxisModel.AxisX = AxisModel.extend({
        type: 'axisX'
    });
    AxisModel.AxisY = AxisModel.extend({
        type: 'axisY'
    });

    return AxisModel;
});