define(function(require) {

    'use strict';

    var Series = require('../../data/Series');
    var List = require('../../data/List');

    var PieSeries = Series.extend({

        type: 'pie',

        getInitialData: function (option) {
            return List.fromArray(option.data);
        }
    });

    return PieSeries;
});