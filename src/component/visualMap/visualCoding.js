/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var zrUtil = require('zrender/core/util');

    echarts.registerVisualCoding('component', function (ecModel) {
        ecModel.eachComponent('visualMap', function (visualMapModel) {
            processSingleVisualMap(visualMapModel, ecModel);
        });
    });

    function processSingleVisualMap(visualMapModel, ecModel) {
        visualMapModel.eachTargetSeries(function (seriesModel) {
            var data = seriesModel.getData();

            visualSolution.applyVisual(
                ['inRange', 'outOfRange'],
                visualMapModel.targetVisuals,
                data,
                zrUtil.bind(visualMapModel.getValueState, visualMapModel),
                visualMapModel.getDataDimension(data)
            );
        });
    }

});
