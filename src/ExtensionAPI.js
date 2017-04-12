define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getDom', 'getZr', 'getWidth', 'getHeight', 'getDevicePixelRatio', 'dispatchAction', 'isDisposed',
        'on', 'off', 'getDataURL', 'getConnectedDataURL', 'getModel', 'getOption',
        'getViewOfComponentModel', 'getViewOfSeriesModel'
    ];
    // And `getCoordinateSystems` and `getComponentByElement` will be injected in echarts.js

    function ExtensionAPI(chartInstance) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(chartInstance[name], chartInstance);
        }, this);
    }

    return ExtensionAPI;
});