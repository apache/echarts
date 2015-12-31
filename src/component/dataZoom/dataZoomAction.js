/**
 * @file Data zoom action
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var echarts = require('../../echarts');


    echarts.registerAction('dataZoom', function (payload, ecModel) {

        var linkedNodesFinder = modelUtil.createLinkedNodesFinder(
            zrUtil.bind(ecModel.eachComponent, ecModel, 'dataZoom'),
            modelUtil.eachAxisDim,
            function (model, dimNames) {
                return model.get(dimNames.axisIndex);
            }
        );

        var effectedModels = [];
        var payloadInfoList = []; // For batch.

        ecModel.eachComponent(
            {mainType: 'dataZoom', query: payload},
            function (model, index, payloadInfo) {
                distinctPush(
                    effectedModels, linkedNodesFinder(model).nodes, payloadInfo
                );
            }
        );

        zrUtil.each(effectedModels, function (dataZoomModel, index) {
            var payloadInfo = payloadInfoList[index];

            dataZoomModel.setRawRange({
                start: payloadInfo.start,
                end: payloadInfo.end,
                startValue: payloadInfo.startValue,
                endValue: payloadInfo.endValue
            });
        });

        function distinctPush(effectedModels, source, payloadInfo) {
            var targetLen = effectedModels.length;

            for (var i = 0, len = source.length; i < len; i++) {
                var src = source[i];

                var has = false;
                for (var j = 0; j < targetLen; j++) {
                    if (src === effectedModels[j]) {
                        has = true;
                    }
                }

                if (!has) {
                    effectedModels.push(src);
                    payloadInfoList.push(payloadInfo);
                }
            }
        }

    });

});