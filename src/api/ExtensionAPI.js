define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = ['getZr', 'update', 'getCoordinateSystem'];

    function ExtensionAPI(echarts) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(echarts[name], echarts);
        }, this);
    };

    // Mix graphic api
    zrUtil.merge(ExtensionAPI.prototype, require('./graphic'));

    return ExtensionAPI;
});