define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');

    function MagicType(model) {
        this.model = model;
    }

    MagicType.defaultOption = {
        show: true,
        // Icon group
        icon: {
            line: 'M4.1,28.9h7.1l9.3-22l7.4,38l9.7-19.7l3,12.8h14.9M4.1,58h51.4',
            bar: 'M8.5,22.9h6.9V50H8.5V22.9z M26.7,12.9h6.9v37h-6.9V12.9z M45,2h6.9v48H45V2z M3.3,58H57',
            stack: 'M8.2,38.4l-8.4,4.1l30.6,15.3L60,42.5l-8.1-4.1l-21.5,11L8.2,38.4z M51.9,30l-8.1,4.2l-13.4,6.9l-13.9-6.9L8.2,30l-8.4,4.2l8.4,4.2l22.2,11l21.5-11l8.1-4.2L51.9,30z M51.9,21.7l-8.1,4.2L35.7,30l-5.3,2.8L24.9,30l-8.4-4.1l-8.3-4.2l-8.4,4.2L8.2,30l8.3,4.2l13.9,6.9l13.4-6.9l8.1-4.2l8.1-4.1L51.9,21.7zM30.4,2.2L-0.2,17.5l8.4,4.1l8.3,4.2l8.4,4.2l5.5,2.7l5.3-2.7l8.1-4.2l8.1-4.2l8.1-4.1L30.4,2.2z',
            tiled: 'M2.3,2.2h22.8V25H2.3V2.2z M35,2.2h22.8V25H35V2.2zM2.3,35h22.8v22.8H2.3V35z M35,35h22.8v22.8H35V35z'
        },
        title: {
            line: '切换为折线图',
            bar: '切换为柱状图',
            stack: '切换为堆叠',
            tiled: '切换为平铺'
        }
    };

    var proto = MagicType.prototype;

    proto.getIcons = function () {
        var model = this.model;
        var availableIcons = model.get('icon');
        var icons = {};
        zrUtil.each(model.get('option'), function (option, type) {
            if (availableIcons[type]) {
                icons[type] = availableIcons[type];
            }
        });
        return icons;
    };

    proto.onclick = function (ecModel, api, type) {
        if (type === 'stack') {
            // var seriesModels = 
        }
    }

    require('../featureManager').register('magicType', MagicType);

    return MagicType;
});