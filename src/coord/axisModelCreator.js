/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import axisDefault from './axisDefault';
import ComponentModel from '../model/Component';
import {
    getLayoutParams,
    mergeLayoutParam
} from '../util/layout';
import OrdinalMeta from '../data/OrdinalMeta';


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

            /**
             * @readOnly
             */
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

            /**
             * @override
             */
            optionUpdated: function () {
                var thisOption = this.option;
                if (thisOption.type === 'category') {
                    this.__ordinalMeta = OrdinalMeta.createByAxisModel(this);
                }
            },

            /**
             * Should not be called before all of 'getInitailData' finished.
             * Because categories are collected during initializing data.
             */
            getCategories: function (rawData) {
                var option = this.option;
                // FIXME
                // warning if called before all of 'getInitailData' finished.
                if (option.type === 'category') {
                    if (rawData) {
                        return option.data;
                    }
                    return this.__ordinalMeta.categories;
                }
            },

            getOrdinalMeta: function () {
                return this.__ordinalMeta;
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
