/**
 * @file Data zoom processor
 */
define(function (require) {

    var echarts = require('../../echarts');
    var numberUtil = require('../../util/number');

    echarts.registerProcessor('filter', function (ecModel, api) {

        ecModel.eachComponent('dataZoom', function (dataZoomModel) {
            // We calculate window and reset axis here but not in model
            // init stage and not after action dispatch handler, because
            // those reset should be done after seriesData.restoreData.
            dataZoomModel.eachTargetAxis(resetSingleAxis);

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

    function resetSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {
        var dimName = dimNames.name;
        var axisProxy = dataZoomModel.getAxisProxy(dimName, axisIndex);

        axisProxy.reset(dataZoomModel);

        var percentRange = axisProxy.getDataPercentWindow();
        var valueRange = axisProxy.getDataValueWindow();
        var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
        var isFull = (percentRange[0] === 0 && percentRange[1] === 100);
        var backup = axisProxy.getBackup();

        // [0, 500]: guess axis extent.
        var precision = numberUtil.getPixelPrecision(valueRange, [0, 500]);
        // toFixed() digits argument must be between 0 and 20
        var invalidPrecision = !(precision < 20 && precision >= 0);

        axisModel.setNeedsCrossZero && axisModel.setNeedsCrossZero(
            isFull ? !backup.scale : false
        );
        axisModel.setMin && axisModel.setMin(
            (isFull || invalidPrecision) ? backup.min : +valueRange[0].toFixed(precision)
        );
        axisModel.setMax && axisModel.setMax(
            (isFull || invalidPrecision) ? backup.max : +valueRange[1].toFixed(precision)
        );
    }

    function filterSingleAxis(dimNames, axisIndex, dataZoomModel, ecModel) {
        dataZoomModel.getAxisProxy(dimNames.name, axisIndex).filterData(dataZoomModel);
    }

});
