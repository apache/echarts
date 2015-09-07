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

    // FIXME
    // originalData是放在原来的data中（这样不会被接下来的processor处理）
    // 还是新创建个series(type="dataZoom")专门存originalData（这样会被processor处理，但是一些地方得特别判断type=='dataZoom'）
    // 同样，Axis的originalData放在哪里。
    // 其中：
    // originalData在ec2中的用途：
    // （1）画dataZoom组件（包括具体数值）
    // （2）在packData时会用getRealDataIndex

    // TODO
    // undo redo

    function processSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {

        // Process axis data
        var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
        var percentExtent = [0, 100];
        var dataZoomStart = axisModel.get('dataZoomStart');
        var dataZoomEnd = axisModel.get('dataZoomEnd');

        var axisData = axisModel.getData();
        if (axisData) {
            var axisDataExtent = [0, axisData.length];
            var axisStart = Math.floor(linearMap(dataZoomStart, percentExtent, axisDataExtent, true));
            var axisEnd = Math.ceil(linearMap(dataZoomEnd, percentExtent, axisDataExtent, true));
            // Only category axis has property 'data's.
            // FIXME
            // setter?
            axisData = axisModel.option.data = axisData.slice(axisStart, axisEnd);
        }

        // Process series data
        var seriesModels = dataZoomModel.getTargetSeriesModels(dimNames.dim, axisIndex);
        zrUtil.each(seriesModels, function (seriesModel) {

            // FIXME
            // 如何filter，
            // 是根据data自己存的信息（如dimension）来判断（这比较直接，但是现在list里存的信息没清楚），
            // 还是根据axis type来判断（比较枚举不太好）
            // var axisType = axisModel.get('type');

            // FIXME
            // 这里仅仅处理了list类型
            var seriesData = seriesModel.getData();
            if (seriesData) {

                var seriesDataExtent = [0, seriesData.count()];
                var seriesStart = Math.floor(linearMap(dataZoomStart, percentExtent, seriesDataExtent, true));
                var seriesEnd = Math.ceil(linearMap(dataZoomEnd, percentExtent, seriesDataExtent, true));
                seriesData.filterSelf(function (entry) {
                    var value = entry['get' + dimNames.dim.toUpperCase()]();
                    return value >= seriesStart && value <= seriesEnd;
                });
            }

            // FIXME
            // 对于数值轴，还要考虑log等情况.
            // FIXME
            // 对于时间河流图，还要考虑是否须整块移除。
        });
    }

});
