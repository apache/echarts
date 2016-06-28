/**
 * @file Data range visual coding.
 */
define(function (require) {

    var echarts = require('../../echarts');
    var visualSolution = require('../../visual/visualSolution');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');

    echarts.registerVisual(echarts.PRIORITY.VISUAL.COMPONENT, function (ecModel) {
        ecModel.eachComponent('visualMap', function (visualMapModel) {
            processSingleVisualMap(visualMapModel, ecModel);
        });

        prepareVisualMeta(ecModel);
    });

    function processSingleVisualMap(visualMapModel, ecModel) {
        visualMapModel.eachTargetSeries(function (seriesModel) {
            var data = seriesModel.getData();

            visualSolution.applyVisual(
                visualMapModel.stateList,
                visualMapModel.targetVisuals,
                data,
                visualMapModel.getValueState,
                visualMapModel,
                visualMapModel.getDataDimension(data)
            );
        });
    }

    // Only support color.
    function prepareVisualMeta(ecModel) {
        ecModel.eachSeries(function (seriesModel) {
            var data = seriesModel.getData();
            var visualMetaList = [];

            ecModel.eachComponent('visualMap', function (visualMapModel) {
                var visualMeta = {};
                visualMetaList.push(visualMeta);

                var stops = visualMeta.stops = visualMapModel.getStops(seriesModel, getColorVisual);
                visualMeta.dimension = visualMapModel.getDataDimension(data);
            });

            // console.log(JSON.stringify(visualMetaList.map(a => a.stops)));
            seriesModel.getData().setVisual('visualMeta', visualMetaList);
        });
    }

    // FIXME
    // performance and export for heatmap?
    function getColorVisual(visualMapModel, value, valueState) {
        var mappings = visualMapModel.targetVisuals[valueState];
        var visualTypes = VisualMapping.prepareVisualTypes(mappings);
        var resultVisual = {};

        for (var i = 0, len = visualTypes.length; i < len; i++) {
            var type = visualTypes[i];
            var mapping = mappings[
                type === 'colorAlpha' ? '__alphaForOpacity' : type
            ];
            mapping && mapping.applyVisual(value, getVisual, setVisual);
        }

        return resultVisual.color;

        function getVisual(key) {
            return resultVisual[key];
        }

        function setVisual(key, value) {
            resultVisual[key] = value;
        }
    }

});
