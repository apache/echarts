define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getZr', 'update', 'getCoordinateSystem', 'getWidth', 'getHeight'
    ];

    function ExtensionAPI(echarts) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(echarts[name], echarts);
        }, this);
    };

    // Mix graphic api
    zrUtil.merge(ExtensionAPI.prototype, require('./util/graphic'));
    zrUtil.merge(ExtensionAPI.prototype, require('./util/symbol'));

    return ExtensionAPI;
});