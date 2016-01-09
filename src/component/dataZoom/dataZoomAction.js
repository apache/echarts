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

        ecModel.eachComponent(
            {mainType: 'dataZoom', query: payload},
            function (model, index) {
                distinctPush(
                    effectedModels, linkedNodesFinder(model).nodes, payload
                );
            }
        );

        zrUtil.each(effectedModels, function (dataZoomModel, index) {
            dataZoomModel.setRawRange({
                start: payload.start,
                end: payload.end,
                startValue: payload.startValue,
                endValue: payload.endValue
            });
        });

        function distinctPush(effectedModels, source) {
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
                }
            }
        }

    });

});