/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');

    echarts.registerVisualCoding('component', function (ecModel) {
        ecModel.eachComponent('visualMap', function (visualMapModel) {
            processSingleVisualMap(visualMapModel, ecModel);
        });
    });

    function processSingleVisualMap(visualMapModel, ecModel) {
        var visualMappings = visualMapModel.targetVisuals;
        var visualTypesMap = {};
        zrUtil.each(['inRange', 'outOfRange'], function (state) {
            var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
            visualTypesMap[state] = visualTypes;
        });

        visualMapModel.eachTargetSeries(function (seriesModel) {
            var data = seriesModel.getData();
            var dimension = visualMapModel.getDataDimension(data);
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
                var valueState = visualMapModel.getValueState(value);
                var mappings = visualMappings[valueState];
                var visualTypes = visualTypesMap[valueState];
                for (var i = 0, len = visualTypes.length; i < len; i++) {
                    var type = visualTypes[i];
                    mappings[type] && mappings[type].applyVisual(value, getVisual, setVisual);
                }
            });
        });
    }

});
