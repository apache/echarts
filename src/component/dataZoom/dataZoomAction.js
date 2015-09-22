/**
 * @file Data zoom action
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var echarts = require('../../echarts');


    echarts.registerAction('dataZoom', function (event, ecModel) {

        var fromDataZoomModel = ecModel.getComponentById(event.dataZoomModelId);
        if (!fromDataZoomModel) {
            return;
        }

        var linkedNodesFinder = modelUtil.createLinkedNodesFinder(
            zrUtil.bind(ecModel.eachComponent, ecModel, 'dataZoom'),
            modelUtil.eachAxisDim,
            function (model, dimNames) {
                return model.get(dimNames.axisIndex);
            }
        );

        var effectedModels = linkedNodesFinder(fromDataZoomModel).nodes;

        zrUtil.each(effectedModels, function (dataZoomModel) {
            dataZoomModel.setRange(event.dataZoomRange);
        });
    });

});