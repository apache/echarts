import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as visualSolution from '../../visual/visualSolution';
import VisualMapping from '../../visual/VisualMapping';

var VISUAL_PRIORITY = echarts.PRIORITY.VISUAL.COMPONENT;

echarts.registerVisual(VISUAL_PRIORITY, {
    createOnAllSeries: true,
    reset: function (seriesModel, ecModel) {
        var resetDefines = [];
        ecModel.eachComponent('visualMap', function (visualMapModel) {
            if (!visualMapModel.isTargetSeries(seriesModel)) {
                return;
            }

            resetDefines.push(visualSolution.incrementalApplyVisual(
                visualMapModel.stateList,
                visualMapModel.targetVisuals,
                zrUtil.bind(visualMapModel.getValueState, visualMapModel),
                visualMapModel.getDataDimension(seriesModel.getData())
            ));
        });

        return resetDefines;
    }
});

// Only support color.
echarts.registerVisual(VISUAL_PRIORITY, {
    createOnAllSeries: true,
    reset: function (seriesModel, ecModel) {
        var data = seriesModel.getData();
        var visualMetaList = [];

        ecModel.eachComponent('visualMap', function (visualMapModel) {
            if (visualMapModel.isTargetSeries(seriesModel)) {
                var visualMeta = visualMapModel.getVisualMeta(
                    zrUtil.bind(getColorVisual, null, seriesModel, visualMapModel)
                ) || {stops: [], outerColors: []};

                var concreteDim = visualMapModel.getDataDimension(data);
                var dimInfo = data.getDimensionInfo(concreteDim);
                if (dimInfo != null) {
                    // visualMeta.dimension should be dimension index, but not concrete dimension.
                    visualMeta.dimension = dimInfo.index;
                    visualMetaList.push(visualMeta);
                }
            }
        });

        // console.log(JSON.stringify(visualMetaList.map(a => a.stops)));
        seriesModel.getData().setVisual('visualMeta', visualMetaList);
    }
});

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
