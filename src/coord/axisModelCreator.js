import * as zrUtil from 'zrender/src/core/util';
import axisDefault from './axisDefault';
import ComponentModel from '../model/Component';
import {
    getLayoutParams,
    mergeLayoutParam
} from '../util/layout';

// FIXME axisType is fixed ?
var AXIS_TYPES = ['value', 'category', 'time', 'log'];

/**
 * Generate sub axis model class
 * @param {string} axisName 'x' 'y' 'radius' 'angle' 'parallel'
 * @param {module:echarts/model/Component} BaseAxisModelClass
 * @param {Function} axisTypeDefaulter
 * @param {Object} [extraDefaultOption]
 */
export default function (axisName, BaseAxisModelClass, axisTypeDefaulter, extraDefaultOption) {

    zrUtil.each(AXIS_TYPES, function (axisType) {

        BaseAxisModelClass.extend({

            type: axisName + 'Axis.' + axisType,

            mergeDefaultAndTheme: function (option, ecModel) {
                var layoutMode = this.layoutMode;
                var inputPositionParams = layoutMode
                    ? getLayoutParams(option) : {};

                var themeModel = ecModel.getTheme();
                zrUtil.merge(option, themeModel.get(axisType + 'Axis'));
                zrUtil.merge(option, this.getDefaultOption());

                option.type = axisTypeDefaulter(axisName, option);

                if (layoutMode) {
                    mergeLayoutParam(option, inputPositionParams, layoutMode);
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
}