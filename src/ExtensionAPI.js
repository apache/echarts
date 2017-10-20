import * as zrUtil from 'zrender/src/core/util';

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

export default ExtensionAPI;