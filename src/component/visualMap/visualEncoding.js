import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as visualSolution from '../../visual/visualSolution';
import VisualMapping from '../../visual/VisualMapping';

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
            if (visualMapModel.isTargetSeries(seriesModel)) {
                var visualMeta = visualMapModel.getVisualMeta(
                    zrUtil.bind(getColorVisual, null, seriesModel, visualMapModel)
                ) || {stops: [], outerColors: []};
                visualMeta.dimension = visualMapModel.getDataDimension(data);
                visualMetaList.push(visualMeta);
            }
        });

        // console.log(JSON.stringify(visualMetaList.map(a => a.stops)));
        seriesModel.getData().setVisual('visualMeta', visualMetaList);
    });
}

// FIXME
// performance and export for heatmap?
// value can be Infinity or -Infinity
function getColorVisual(seriesModel, visualMapModel, value, valueState) {
    var mappings = visualMapModel.targetVisuals[valueState];
    var visualTypes = VisualMapping.prepareVisualTypes(mappings);
    var resultVisual = {
        color: seriesModel.getData().getVisual('color') // default color.
    };

    for (var i = 0, len = visualTypes.length; i < len; i++) {
        var type = visualTypes[i];
        var mapping = mappings[
            type === 'opacity' ? '__alphaForOpacity' : type
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
