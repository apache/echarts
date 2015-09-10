define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getDom', 'getZr', 'getCoordinateSystem', 'getWidth', 'getHeight', 'dispatch'
    ];

    function ExtensionAPI(echarts) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(echarts[name], echarts);
        }, this);
    };

    // Mix graphic api
    zrUtil.merge(ExtensionAPI.prototype, require('./util/graphic'));

    zrUtil.merge(ExtensionAPI.prototype, require('./util/symbol'));

    ExtensionAPI.prototype.log = require('zrender/core/log');

    return ExtensionAPI;
});