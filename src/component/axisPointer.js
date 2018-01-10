import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as axisPointerModelHelper from './axisPointer/modelHelper';
import axisTrigger from './axisPointer/axisTrigger';

import './axisPointer/AxisPointerModel';
import './axisPointer/AxisPointerView';

// CartesianAxisPointer is not supposed to be required here. But consider
// echarts.simple.js and online build tooltip, which only require gridSimple,
// CartesianAxisPointer should be able to required somewhere.
import './axisPointer/CartesianAxisPointer';

echarts.registerPreprocessor(function (option) {
    // Always has a global axisPointerModel for default setting.
    if (option) {
        (!option.axisPointer || option.axisPointer.length === 0)
            && (option.axisPointer = {});

        var link = option.axisPointer.link;
        // Normalize to array to avoid object mergin. But if link
        // is not set, remain null/undefined, otherwise it will
        // override existent link setting.
        if (link && !zrUtil.isArray(link)) {
            option.axisPointer.link = [link];
        }
    }
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
    event: 'updateAxisPointer',
    update: ':updateAxisPointer'
}, axisTrigger);
