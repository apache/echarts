define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var SeriesModel = require('../../model/Series');

    return SeriesModel.extend({

        type: 'pie',

        getInitialData: function (option) {
            return List.fromArray(option.data, this, 1);
        }
    });
});