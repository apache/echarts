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
            var visualMappings = dataRangeModel.targetVisuals;
            var data = seriesModel.getData();
            var dataIndex;

            function getVisual(key) {
                return data.getItemVisual(dataIndex, key);
            }

            function setVisual(key, value) {
                data.setItemVisual(dataIndex, key, value);
            }

            data.each([dimension], function (value, index) {
                // For performance consideration, do not use curry.
                dataIndex = index;
                var mappings = visualMappings[dataRangeModel.getValueState(value)];
                for (var key in mappings) {
                    if (mappings.hasOwnProperty(key)) {
                        mappings[key] && mappings[key].applyVisual(value, getVisual, setVisual);
                    }
                }
            });
        });
    }

});
