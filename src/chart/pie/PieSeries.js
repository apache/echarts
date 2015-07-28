define(function(require) {

    'use strict';

    var List = require('../../data/List');

    return require('../../data/Series').extend({

        type: 'pie',

        getInitialData: function (option) {
            return List.fromArray(option.data);
        }
    });
});