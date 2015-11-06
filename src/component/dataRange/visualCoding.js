/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var VisualMapping = require('../../visual/VisualMapping');

    echarts.registerVisualCoding('component', function (ecModel) {
        ecModel.eachComponent('dataRange', function (dataRangeModel) {
            processSingleDataRange(dataRangeModel, ecModel);
        });
    });

    function processSingleDataRange(dataRangeModel, ecModel) {
        dataRangeModel.eachTargetSeries(function (seriesModel) {
            var visualMappings = dataRangeModel.targetVisuals;
            var data = seriesModel.getData();
            var dimension = dataRangeModel.getDataDimension(data);
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
                var visualTypes = VisualMapping.prepareVisualTypes(mappings);
                for (var i = 0, len = visualTypes.length; i < len; i++) {
                    var type = visualTypes[i];
                    mappings[type] && mappings[type].applyVisual(value, getVisual, setVisual);
                }
            });
        });
    }

});
