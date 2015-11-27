define(function (require) {

    var echarts = require('../../echarts');

    var actionInfo = {
        type: 'axisAreaSelect',
        event: 'axisAreaSelected',
        update: 'updateVisual'
    };

    /**
     * @payload
     * @property {string} parallelAxisId
     * @property {Array.<Array.<number>>|boolean} intervals
     */
    echarts.registerAction(actionInfo, function (payload, ecModel) {
        ecModel.eachComponent(
            {mainType: 'parallelAxis', query: payload},
            function (parallelAxisModel) {
                parallelAxisModel.axis.setActiveIntervals(payload.intervals);
            }
        );

    });
});