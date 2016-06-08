/**
 * Legend component entry file8
 */
define(function (require) {

    require('./legend/LegendModel');
    require('./legend/legendAction');
    require('./legend/LegendView');

    var echarts = require('../echarts');
    // Series Filter
    echarts.registerProcessor(require('./legend/legendFilter'));
});