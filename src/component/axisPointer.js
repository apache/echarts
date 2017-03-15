define(function (require) {

    var echarts = require('../echarts');
    var axisPointerModelHelper = require('./axisPointer/modelHelper');
    var axisTrigger = require('./axisPointer/axisTrigger');
    var zrUtil = require('zrender/core/util');

    require('./axisPointer/AxisPointerModel');
    require('./axisPointer/AxisPointerView');

    echarts.registerPreprocessor(function (option) {
        // Always has a global axisPointerModel for default setting.
        option
            && (!option.axisPointer || option.axisPointer.length === 0)
            && (option.axisPointer = {});
    });

    // This process should proformed after coordinate systems created
    // and series data processed. So put it on statistic processing stage.
    echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.STATISTIC, function (ecModel, api) {
        // Build axisPointerModel, mergin tooltip.axisPointer model for each axis.
        // allAxesInfo should be updated when setOption performed.
        ecModel.getComponent('axisPointer').coordSysAxesInfo
            = axisPointerModelHelper.collect(ecModel, api);
    });

    // Broadcast to all views.
    echarts.registerAction({
        type: 'updateAxisPointer',
        event: 'axisPointerUpdated',
        update: ':updateAxisPointer'
    }, function (payload, ecModel, api) {
        axisTrigger(
            ecModel.getComponent('axisPointer').coordSysAxesInfo,
            payload.currTrigger,
            payload,
            payload.dispatchAction || zrUtil.bind(api.dispatchAction, api),
            api,
            payload.tooltipOption,
            payload.highDownKey
        );
    });

});