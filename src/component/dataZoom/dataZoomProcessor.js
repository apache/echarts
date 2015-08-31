/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');
    var helper = require('./helper');
    var zrUtil = require('zrender/core/util');

    echarts.registerProcessor(function (ecModel) {
        ecModel.eachComponent('dataZoom', zrUtil.curry(processSingleDataZoom, ecModel));
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

    function processSingleDataZoom(ecModel, dataZoomModel) {
        helper.eachAxisDim(function (dimNames) {
            zrUtil.each(
                dataZoomModel.get(dimNames.axisIndex),
                zrUtil.curry(processSingleAxis, ecModel, dataZoomModel, dimNames)
            );
        });
    }

    function processSingleAxis(ecModel, dataZoomModel, dimNames, axisIndex) {
        // TODO
        // backup axis data
        var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
        var axisData = axisModel.get('data');
        if (axisData) {
            var dataLength = axisData.length;
            var start = Math.floor(axisModel.get('dataZoomStart') / 100 * dataLength);
            var end = Math.ceil(axisModel.get('dataZoomEnd') / 100 * dataLength);

            // Only category axis has property 'data's.
            axisData = axisData.slice(start, end);

            var seriesModels = getTargetSeriesModelsByAxis(
                ecModel, dataZoomModel, axisIndex, dimNames
            );
            zrUtil.each(seriesModels, function (seriesModel) {
                // FIXME
                // data的backup

                // FIXME
                // 如何filter，
                // 是根据data自己存的信息（如dimension）来判断（这比较直接，但是现在list里存的信息没清楚），
                // 还是根据axis type来判断（比较枚举不太好）
                // var axisType = axisModel.get('type');

                // FIXME
                // 这里仅仅处理了list类型
                var seriesData = seriesModel.getData();
                seriesModel.setData(
                    seriesData['filter' + dimNames.dim.toUpperCase()](start, end)
                );

                // FIXME
                // 对于数值轴，还要考虑log等情况
                // FIXME
                // 对于时间河流图，还要考虑是否须整块移除。
            });
        }
    }

    function getTargetSeriesModelsByAxis(ecModel, dataZoomModel, axisIndex, dimNames) {
        var seriesModels = [];
        ecModel.eachSeries(function (seriesModel) {
            if (axisIndex === seriesModel.get(dimNames.axisIndex)) {
                seriesModels.push(seriesModel);
            }
        });
        return seriesModels;
    }

});
