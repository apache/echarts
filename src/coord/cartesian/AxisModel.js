define(function(require) {

    'use strict';

    var ComponentModel = require('../../model/Component');
    var defaultOption = require('../axisDefault');
    var zrUtil = require('zrender/core/util');

    var AxisModel = ComponentModel.extend({

        type: 'cartesian2dAxis',

        /**
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        axis: null,

        /**
         * @public
         * @param {boolean} needs Whether axis needs cross zero.
         */
        setNeedsCrossZero: function (needs) {
            this.option.scale = !needs;
        }
    });

    function getAxisType(axisDim, option) {
        return option.type || (axisDim === 'x' ? 'category' : 'value');
    }

    zrUtil.merge(AxisModel.prototype, require('../axisModelCommonMixin'));

    function extendAxis(axisDim) {
        // FIXME axisType is fixed ?
        zrUtil.each(['value', 'category', 'time', 'log'], function (axisType) {
            AxisModel.extend({
                type: axisDim + 'Axis.' + axisType,
                mergeDefaultAndTheme: function (option, ecModel) {
                    var themeModel = ecModel.getTheme();
                    zrUtil.merge(option, themeModel.get(axisType + 'Axis'));
                    zrUtil.merge(option, this.getDefaultOption());

                    option.type = getAxisType(axisDim, option);
                },
                defaultOption: zrUtil.extend(
                    defaultOption[axisType + 'Axis'],
                    {
                        gridIndex: 0
                    }
                )
            });
        });
        // Defaulter
        ComponentModel.registerSubTypeDefaulter(axisDim + 'Axis', zrUtil.curry(getAxisType, axisDim));
    }

    extendAxis('x');
    extendAxis('y');

    return AxisModel;
});