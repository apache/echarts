define(function (require) {

    // Do not contain scrollable legend, for sake of file size.

    require('./legend/LegendModel');
    require('./legend/legendAction');
    require('./legend/LegendView');

    var echarts = require('../echarts');
    // Series Filter
    echarts.registerProcessor(require('./legend/legendFilter'));

    require('../model/Component').registerSubTypeDefaulter('legend', function () {
        // Default 'plain' when no type specified.
        return 'plain';
    });

});