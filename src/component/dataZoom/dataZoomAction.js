/**
 * @file Data zoom action
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var helper = require('./helper');

    echarts.registerAction('dataZoom', function (event, ecModel) {
        var linkSet = helper.findLinkSet(
            zrUtil.bind(ecModel.eachComponent, ecModel, 'dataZoom'),
            function (model, dimNames) {
                return model.get(dimNames.axisIndex);
            },
            event.dataZoomModel
        );

        var dataZoomRange = event.dataZoomRange;
        zrUtil.each(linkSet.models, function (dataZoomModel) {
            dataZoomModel.setRange({
                start: dataZoomRange.start,
                end: dataZoomRange.end,
                start2: dataZoomRange.start2,
                end2: dataZoomRange.end2
            });
        });
    });

});