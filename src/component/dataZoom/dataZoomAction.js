/**
 * @file Data zoom action
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var helper = require('./helper');
    var echarts = require('../../echarts');


    echarts.registerAction('dataZoom', function (payload, ecModel) {

        var linkedNodesFinder = helper.createLinkedNodesFinder(
            zrUtil.bind(ecModel.eachComponent, ecModel, 'dataZoom'),
            helper.eachAxisDim,
            function (model, dimNames) {
                return model.get(dimNames.axisIndex);
            }
        );

        var effectedModels = [];

        ecModel.eachComponent(
            {mainType: 'dataZoom', query: payload},
            function (model, index) {
                effectedModels.push.apply(
                    effectedModels, linkedNodesFinder(model).nodes
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

    });

});