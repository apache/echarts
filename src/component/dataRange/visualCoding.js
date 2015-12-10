/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');

    echarts.registerVisualCoding('component', function (ecModel) {
        ecModel.eachComponent('dataRange', function (dataRangeModel) {
            processSingleDataRange(dataRangeModel, ecModel);
        });
    });

    function processSingleDataRange(dataRangeModel, ecModel) {
        var visualMappings = dataRangeModel.targetVisuals;
        var visualTypesMap = {};
        var colorFuncsMap = {};
        zrUtil.each(['inRange', 'outOfRange'], function (state) {
            var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
            var colorFunc = zrUtil.filter(zrUtil.map(visualTypes, function (visualType) {
                return visualMappings[state][visualType].getColorMapper;
            }), function (func) {
                return !!func;
            })[0];
            visualTypesMap[state] = visualTypes;
            colorFuncsMap[state] = colorFunc;
        });

        // Cache color func
        function colorFunc(value, out) {
            var valueState = dataRangeModel.getValueState(value);
            var colorFunc = colorFuncsMap[valueState];
            // PENDING
            return colorFunc && colorFunc(value, out);
        }

        dataRangeModel.eachTargetSeries(function (seriesModel) {
            var data = seriesModel.getData();
            var dimension = dataRangeModel.getDataDimension(data);
            var dataIndex;

            function getVisual(key) {
                return data.getItemVisual(dataIndex, key);
            }

            function setVisual(key, value) {
                data.setItemVisual(dataIndex, key, value);
            }

            data.setVisual('colorFunc', colorFunc);

            data.each([dimension], function (value, index) {
                // For performance consideration, do not use curry.
                dataIndex = index;
                var valueState = dataRangeModel.getValueState(value);
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
