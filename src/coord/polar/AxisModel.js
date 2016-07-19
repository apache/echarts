define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var ComponentModel = require('../../model/Component');
    var axisModelCreator = require('../axisModelCreator');

    var PolarAxisModel = ComponentModel.extend({
        type: 'polarAxis',
        /**
         * @type {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
         */
        axis: null
    });

    zrUtil.merge(PolarAxisModel.prototype, require('../axisModelCommonMixin'));

    var polarAxisDefaultExtendedOption = {
        angle: {
            // polarIndex: 0,
            // polarId: '',

            startAngle: 90,

            clockwise: true,

            splitNumber: 12,

            axisLabel: {
                rotate: false
            }
        },
        radius: {
            // polarIndex: 0,
            // polarId: '',

            splitNumber: 5
        }
    };

    function getAxisType(axisDim, option) {
        // Default axis with data is category axis
        return option.type || (option.data ? 'category' : 'value');
    }

    axisModelCreator('angle', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.angle);
    axisModelCreator('radius', PolarAxisModel, getAxisType, polarAxisDefaultExtendedOption.radius);

});