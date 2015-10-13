/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var linearMap = require('../../util/number').linearMap;

    echarts.registerProcessor(function (ecModel) {
        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            dataZoomModel.eachTargetAxis(processSingleAxis);
        });
    });

    // TODO
    // undo redo

    function processSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {

        // Process axis data
        var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
        var isCategoryFilter = axisModel.get('type') === 'category';
        var seriesModels = dataZoomModel.getTargetSeriesModels(dimNames.name, axisIndex);
        var dataExtent = calculateDataExtent(dimNames, axisModel, seriesModels);
        var dataWindow = calculateDataWindow(axisModel, dataZoomModel, dataExtent, isCategoryFilter);

        dataZoomModel.recordDataInfo(dimNames.name, axisIndex, dataWindow);

        // Process series data
        zrUtil.each(seriesModels, function (seriesModel) {
            // FIXME
            // 这里仅仅处理了list类型
            var seriesData = seriesModel.getData();
            if (!seriesData) {
                return;
            }

            seriesData.filterSelf(dimNames.name, function (value) {
                return value >= dataWindow[0] && value <= dataWindow[1];
            });

            // FIXME
            // 对于数值轴，还要考虑log等情况.
            // FIXME
            // 对于时间河流图，还要考虑是否须整块移除。
        });
    }

    function calculateDataExtent(dimNames, axisModel, seriesModels) {
        var dataExtent = [Number.MAX_VALUE, Number.MIN_VALUE];

        zrUtil.each(seriesModels, function (seriesModel) {
            var seriesData = seriesModel.getData();
            if (seriesData) {
                var seriesExtent = seriesData.getDataExtent(dimNames.name);
                seriesExtent[0] < dataExtent[0] && (dataExtent[0] = seriesExtent[0]);
                seriesExtent[1] > dataExtent[1] && (dataExtent[1] = seriesExtent[1]);
            }
        }, this);

        return dataExtent;
    }

    function calculateDataWindow(axisModel, dataZoomModel, dataExtent, isCategoryFilter) {
        var result = linearMap(dataZoomModel.getRange(), [0, 100], dataExtent, true);

        if (isCategoryFilter) {
            result = [Math.floor(result[0]), Math.ceil(result[1])];
        }

        return result;
    }

});
