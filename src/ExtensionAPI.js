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

        function animateOrSetGraphicEl(isUpdate, el, props, cb) {
            var ecModel = chartInstance.getModel();
            var duration = ecModel.getShallow('animationDuration' + (isUpdate ? 'Update' : ''));
            var animationEasing = ecModel.getShallow('animationEasing' + (isUpdate ? 'Update' : ''));

            ecModel.getShallow('animation')
                ? el.animateTo(props, duration, animationEasing, cb)
                : (el.attr(props), cb && cb());
        }
        /**
         * Update element property
         * @param {module:zrender/Element} el
         * @param {Object} props
         * @param {Function} [cb]
         */
        this.updateGraphicEl = zrUtil.curry(animateOrSetGraphicEl, true);

        /**
         * Init element property
         * @param {module:zrender/Element} el
         * @param {Object} props
         * @param {Function} [cb]
         */
        this.initGraphicEl = zrUtil.curry(animateOrSetGraphicEl, false);
    }

    return ExtensionAPI;
});