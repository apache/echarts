define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var extensionAPIList = ['addProcessor', 'update'];

    function ExtensionAPI(echarts) {
        zrUtil.each(extensionAPIList, function (name) {
            this[name] = zrUtil.bind(echarts[name], echarts);
        }, this);
    };

    return ExtensionAPI;
});