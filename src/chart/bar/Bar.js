define(function (require) {

    var Chart = require('../Chart');

    require('./BarSeries');

    var Bar = Chart.extend({

        type: 'bar',

        init: function () {

        },

        render: function () {

        }
    });

    return Bar;
});