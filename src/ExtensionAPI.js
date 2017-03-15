define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getDom', 'getZr', 'getWidth', 'getHeight', 'getDevicePixelRatio', 'dispatchAction', 'isDisposed',
        'on', 'off', 'getDataURL', 'getConnectedDataURL', 'getModel', 'getOption',
        'getViewOfComponentModel', 'getViewOfSeriesModel'
    ];

    function ExtensionAPI(chartInstance, coordSysMgr) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(chartInstance[name], chartInstance);
        }, this);

        // Inject getCoordinateSystems to ecModel
        this.getCoordinateSystems = zrUtil.bind(coordSysMgr.getCoordinateSystems, coordSysMgr);
    }

    return ExtensionAPI;
});