/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerProcessor('filter', function (ecModel, api) {

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            // We calculate window and reset axis here but not in model
            // init stage and not after action dispatch handler, because
            // those reset should be done after seriesData.restoreData.
            dataZoomModel.eachTargetAxis(resetSingleAxis);
        });

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            // Fullfill all of the range props so that user
            // is able to get them from chart.getOption().
            var axisProxy = dataZoomModel.findRepresentativeAxisProxy();
            var percentRange = axisProxy.getDataPercentWindow();
            var valueRange = axisProxy.getDataValueWindow();
            dataZoomModel.setRawRange({
                start: percentRange[0],
                end: percentRange[1],
                startValue: valueRange[0],
                endValue: valueRange[1]
            });
        });

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            dataZoomModel.eachTargetAxis(filterSingleAxis);
        });
    });

    function resetSingleAxis(dimNames, axisIndex, dataZoomModel) {
        dataZoomModel.getAxisProxy(dimNames.name, axisIndex).reset(dataZoomModel);
    }

    function filterSingleAxis(dimNames, axisIndex, dataZoomModel) {
        dataZoomModel.getAxisProxy(dimNames.name, axisIndex).filterData(dataZoomModel);
    }

});
