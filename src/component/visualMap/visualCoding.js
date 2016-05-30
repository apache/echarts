/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');

    echarts.registerVisualCoding('component', function (ecModel) {
        travelVisualMaps(ecModel);
    });

    echarts.registerVisualCodingProgressive(
        'chart', 'series.parallel', function (seriesModel, ecModel) {
            travelVisualMaps(ecModel, seriesModel);
        }
    );

    function travelVisualMaps(ecModel, targetSeriesModel) {
        ecModel.eachComponent('visualMap', function (visualMapModel) {
            processSingleVisualMap(visualMapModel, ecModel);
        });
    }

    function processSingleVisualMap(visualMapModel, ecModel, targetSeriesModel) {
        var visualMappings = visualMapModel.targetVisuals;
        var visualTypesMap = {};
        zrUtil.each(['inRange', 'outOfRange'], function (state) {
            var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
            visualTypesMap[state] = visualTypes;
        });

        visualMapModel.eachTargetSeries(function (seriesModel) {
            if (targetSeriesModel && seriesModel !== targetSeriesModel) {
                return;
            }

            var data = seriesModel.getData();
            var dimension = data.getDimension(visualMapModel.getDataDimension(data));
            var dataIndex;

            function getVisual(key) {
                return data.getItemVisual(dataIndex, key);
            }

            function setVisual(key, value) {
                data.setItemVisual(dataIndex, key, value);
            }

            var thisProgressive = seriesModel.getProgressive();
            var seg = thisProgressive
                ? [thisProgressive.thisDataIndex, thisProgressive.nextDataIndex]
                : [0, data.count()];

            for (dataIndex = seg[0]; dataIndex < seg[1]; dataIndex++) {
                // For performance consideration, do not use curry.
                var value = data.get(dimension, dataIndex);
                var valueState = visualMapModel.getValueState(value);
                var mappings = visualMappings[valueState];
                var visualTypes = visualTypesMap[valueState];
                for (var i = 0, len = visualTypes.length; i < len; i++) {
                    var type = visualTypes[i];
                    mappings[type] && mappings[type].applyVisual(value, getVisual, setVisual);
                }
            }
        });
    }

});
