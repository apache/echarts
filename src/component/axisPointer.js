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

    // This process should proformed after coordinate systems created.
    // So put it on processor stage
    echarts.registerProcessor(function (ecModel, api) {
        // Build axisPointerModel, mergin tooltip.axisPointer model for each axis.
        // allAxesInfo should be updated when setOption performed.
        var coordSysAxesInfo = axisPointerModelHelper.collect(ecModel, api);
        axisPointerModelHelper.initializeValue(coordSysAxesInfo);
        ecModel.getComponent('axisPointer').coordSysAxesInfo = coordSysAxesInfo;
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
            payload.tooltipOption
        );
    });

});