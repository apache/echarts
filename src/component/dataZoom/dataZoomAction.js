/**
 * @file Data zoom action
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var helper = require('./helper');

    echarts.registerAction(function (event, ecModel) {
        ecModel.eachComponent('dataZoom', zrUtil.curry(processSingleDataZoom, event, ecModel));
    });

    function processSingleDataZoom(event, ecModel, dataZoomModel) {
        helper.eachAxisDim(function (dimNames) {
            zrUtil.each(
                dataZoomModel.get(dimNames.axisIndex),
                zrUtil.curry(processSingleAxis, ecModel, dataZoomModel, dimNames)
            );
        });
    }

});