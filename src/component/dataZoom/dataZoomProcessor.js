/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerProcessor('filter', function (ecModel) {

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            dataZoomModel.eachTargetAxis(resetSingleAxis);
        });

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            dataZoomModel.eachTargetAxis(filterSingleAxis);
        });
    });

    function resetSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {
        var dimName = dimNames.name;
        var axisProxy = dataZoomModel.getAxisProxy(dimName, axisIndex);

        axisProxy.reset(dataZoomModel);

        var percentRange = axisProxy.getDataPercentWindow();
        var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);

        axisModel.setNeedsCrossZero && axisModel.setNeedsCrossZero(
            (percentRange[0] === 0 && percentRange[1] === 100)
                ? axisProxy.getCrossZero()
                : false
        );
    }

    function filterSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {
        dataZoomModel.getAxisProxy(dimNames.name, axisIndex).filterData(dataZoomModel);
    }

});
