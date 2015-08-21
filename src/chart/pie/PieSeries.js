define(function(require) {

    'use strict';

    var List = require('../../data/List');

    return require('../../echarts').extendSeriesModel({

        type: 'pie',

        getInitialData: function (option) {
            return List.fromArray(option.data, this, 1);
        }
    });
});