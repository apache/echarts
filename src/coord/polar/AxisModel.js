define(function(require) {

    'use strict';

    var axisDefault = require('../axisDefault');
    var zrUtil = require('zrender/core/util');
    var ComponentModel = require('../../model/Component');

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
            startAngle: 90,

            clockwise: true,

            splitNumber: 12,

            axisLabel: {
                rotate: false
            }
        },
        radius: {
            splitNumber: 5
        }
    };

    function getAxisType(axisDim, option) {
        return option.type || (axisDim === 'angle' ? 'category' : 'value');
    }

    function extendAxis(axisDim) {
        // FIXME axisType is fixed ?
        zrUtil.each(['value', 'category', 'time', 'log'], function (axisType) {
            PolarAxisModel.extend({
                type: axisDim + 'Axis.' + axisType,
                mergeDefaultAndTheme: function (option, ecModel) {
                    var themeModel = ecModel.getTheme();
                    zrUtil.merge(option, themeModel.get(axisType + 'Axis'));
                    zrUtil.merge(option, this.getDefaultOption());

                    option.type = getAxisType(axisDim, option);
                },
                defaultOption: zrUtil.merge(
                    axisDefault[axisType + 'Axis'],
                    zrUtil.extend(
                        {polarIndex: 0},
                        polarAxisDefaultExtendedOption[axisDim]
                    ),
                    true
                )
            });
        });
        // Defaulter
        ComponentModel.registerSubTypeDefaulter(axisDim + 'Axis', zrUtil.curry(getAxisType, axisDim));
    }

    extendAxis('angle');
    extendAxis('radius');
});