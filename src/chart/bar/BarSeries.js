define(function(require) {

    'use strict';

    var Series = require('../../data/Series');
    var List = require('../../data/List');

    var BarSeries = Series.extend({

        type: 'bar',

        getInitialData: function (option) {
            return List.fromArray(option.data);
        }
    });

    return BarSeries;
});