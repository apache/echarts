define(function(require) {

    'use strict';

    var List = require('../../data/List');

    return require('../../data/Series').extend({

        type: 'bar',

        getInitialData: function (option) {
            return List.fromArray(option.data);
        }
    });
});