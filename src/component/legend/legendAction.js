/**
 * @file Legend action
 */
define(function(require) {

    var echarts = require('../../echarts');

    /**
     * @event legendToggleSelect
     * @type {Object}
     * @property {string} type 'legendToggleSelect'
     * @property {string} [from]
     * @property {string} seriesName
     */
    echarts.registerAction('legendToggleSelect', 'legendSelected', function (event, ecModel) {
        // Update all legend components
        ecModel.eachComponent('legend', function (legendModel) {
            legendModel && legendModel.toggleSelected(event.seriesName);
        });
    });
});