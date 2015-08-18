define(function(require) {

    'use strict';

    return require('../../model/Model').extend({

        type: 'dataZoom',

        setStart: function (start) {
            this.option.start = start;
        },

        setEnd: function (end) {
            this.option.end = end;
        },

        setRange: function (start, end) {
            this.setStart(start);
            this.setEnd(end);
        }
    });
});