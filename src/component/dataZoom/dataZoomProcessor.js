/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerProcessor('filter', function (ecModel) {
        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            dataZoomModel.eachTargetAxis(processSingleAxis);
        });
    });

    // TODO
    // undo redo

    function processSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {
        dataZoomModel.getAxisProxy(dimNames.name, axisIndex).filterData(dataZoomModel);
    }

});
