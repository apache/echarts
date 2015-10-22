define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    var echartsAPIList = [
        'getDom', 'getZr', 'getWidth', 'getHeight', 'dispatch'
    ];

    function ExtensionAPI(chartInstance) {
        zrUtil.each(echartsAPIList, function (name) {
            this[name] = zrUtil.bind(chartInstance[name], chartInstance);
        }, this);

        /**
         * Update element property
         * @param {module:zrender/Element}
         */
        this.updateGraphicEl = function (el, props) {
            var ecModel = chartInstance.getModel();
            var duration = ecModel.getShallow('animationDurationUpdate');
            var enableAnimation = ecModel.getShallow('animation');
            var animationEasing = ecModel.getShallow('animationEasing');

            enableAnimation
                ? el.animateTo(props, duration, animationEasing)
                : el.attr(props);
        }
    };

    return ExtensionAPI;
});