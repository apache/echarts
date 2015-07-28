define(function (require) {

    var Chart = require('../Chart');

    require('./BarSeries');

    var Bar = Chart.extend({

        type: 'bar',

        init: function () {},

        render: function (option, api) {
            
        }
    });

    return Bar;
});