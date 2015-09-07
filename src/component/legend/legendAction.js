/**
 * @file Legend action
 */
define(function(require) {

    var echarts = require('../../echarts');

    echarts.registerAction('legendSelected', function (event, ecModel) {
        event.legendModel.toggleSelected(event.seriesName);
    });

});