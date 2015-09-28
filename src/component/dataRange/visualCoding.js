/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerVisualCoding('component', function (ecModel) {
        ecModel.eachComponent('dataRange', function (dataRangeModel) {
            processSingleDataRange(dataRangeModel, ecModel);
        });
    });

    // TODO
    // undo redo

    // function processSingleDataRange(dataRangeModel, ecModel) {
    //     dataRangeModel.eachTargetSeries(function (seriesModel) {
    //         dataRangeModel.visualMapping.applyVisual(
    //             seriesModel.getData(), dataRangeModel.get('dimension')
    //         );
    //     });
    // }

    function processSingleDataRange(dataRangeModel, ecModel) {
        dataRangeModel.eachTargetSeries(function (seriesModel) {
            var dimension = dataRangeModel.get('dimension');
            var visualMappings = dataRangeModel.visualMappings;
            var data = seriesModel.getData();

            data.each([dimension], function (value, index) {
                visualMappings[dataRangeModel.getValueState(value)]
                    .applyVisual(value, data, index);
            });
        });
    }

});
