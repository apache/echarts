define(function (require) {

    var axisDefault = require('./axisDefault');
    var zrUtil = require('zrender/core/util');
    var ComponentModel = require('../model/Component');
    var layout = require('../util/layout');

    // FIXME axisType is fixed ?
    var AXIS_TYPES = ['value', 'category', 'time', 'log'];

    /**
     * Generate sub axis model class
     * @param {string} axisName 'x' 'y' 'radius' 'angle' 'parallel'
     * @param {module:echarts/model/Component} BaseAxisModelClass
     * @param {Function} axisTypeDefaulter
     * @param {Object} [extraDefaultOption]
     */
    return function (axisName, BaseAxisModelClass, axisTypeDefaulter, extraDefaultOption) {

        zrUtil.each(AXIS_TYPES, function (axisType) {

            BaseAxisModelClass.extend({

                type: axisName + 'Axis.' + axisType,

                mergeDefaultAndTheme: function (option, ecModel) {
                    var layoutMode = this.layoutMode;
                    var inputPositionParams = layoutMode
                        ? layout.getLayoutParams(option) : {};

                    var themeModel = ecModel.getTheme();
                    zrUtil.merge(option, themeModel.get(axisType + 'Axis'));
                    zrUtil.merge(option, this.getDefaultOption());

                    option.type = axisTypeDefaulter(axisName, option);

                    if (layoutMode) {
                        layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
                    }
                },

                defaultOption: zrUtil.mergeAll(
                    [
                        {},
                        axisDefault[axisType + 'Axis'],
                        extraDefaultOption
                    ],
                    true
                )
            });
        });

        ComponentModel.registerSubTypeDefaulter(
            axisName + 'Axis',
            zrUtil.curry(axisTypeDefaulter, axisName)
        );
    };
});