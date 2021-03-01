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

import axisDefault from './axisDefault';
import ComponentModel from '../model/Component';
import {
    getLayoutParams,
    mergeLayoutParam,
    fetchLayoutMode
} from '../util/layout';
import OrdinalMeta from '../data/OrdinalMeta';
import { DimensionName, BoxLayoutOptionMixin, OrdinalRawValue } from '../util/types';
import { AxisBaseOption, AXIS_TYPES } from './axisCommonTypes';
import GlobalModel from '../model/Global';
import { each, merge } from 'zrender/src/core/util';
import { EChartsExtensionInstallRegisters } from '../extension';


type Constructor<T> = new (...args: any[]) => T;

export interface AxisModelExtendedInCreator<Opt extends AxisBaseOption> {
    getCategories(rawData?: boolean): OrdinalRawValue[] | Opt['data']
    getOrdinalMeta(): OrdinalMeta
}

/**
 * Generate sub axis model class
 * @param axisName 'x' 'y' 'radius' 'angle' 'parallel' ...
 */
export default function axisModelCreator<
    AxisOptionT extends AxisBaseOption,
    AxisModelCtor extends Constructor<ComponentModel<AxisOptionT>>
>(
    registers: EChartsExtensionInstallRegisters,
    axisName: DimensionName,
    BaseAxisModelClass: AxisModelCtor,
    extraDefaultOption?: AxisOptionT
) {

    each(AXIS_TYPES, function (v, axisType) {

        const defaultOption = merge(
            merge({}, axisDefault[axisType], true),
            extraDefaultOption, true
        );

        class AxisModel extends BaseAxisModelClass implements AxisModelExtendedInCreator<AxisOptionT> {

            static type = axisName + 'Axis.' + axisType;
            type = axisName + 'Axis.' + axisType;

            static defaultOption = defaultOption;

            private __ordinalMeta: OrdinalMeta;

            constructor(...args: any[]) {
                super(...args);
            }

            mergeDefaultAndTheme(option: AxisOptionT, ecModel: GlobalModel): void {
                const layoutMode = fetchLayoutMode(this);
                const inputPositionParams = layoutMode
                    ? getLayoutParams(option as BoxLayoutOptionMixin) : {};

                const themeModel = ecModel.getTheme();
                merge(option, themeModel.get(axisType + 'Axis'));
                merge(option, this.getDefaultOption());

                option.type = getAxisType(option);

                if (layoutMode) {
                    mergeLayoutParam(option as BoxLayoutOptionMixin, inputPositionParams, layoutMode);
                }
            }

            optionUpdated(): void {
                const thisOption = this.option;
                if (thisOption.type === 'category') {
                    this.__ordinalMeta = OrdinalMeta.createByAxisModel(this);
                }
            }

            /**
             * Should not be called before all of 'getInitailData' finished.
             * Because categories are collected during initializing data.
             */
            getCategories(rawData?: boolean): OrdinalRawValue[] | AxisBaseOption['data'] {
                const option = this.option;
                // FIXME
                // warning if called before all of 'getInitailData' finished.
                if (option.type === 'category') {
                    if (rawData) {
                        return option.data as AxisBaseOption['data'];
                    }
                    return this.__ordinalMeta.categories;
                }
            }

            getOrdinalMeta(): OrdinalMeta {
                return this.__ordinalMeta;
            }
        }

        registers.registerComponentModel(AxisModel);
    });

    registers.registerSubTypeDefaulter(
        axisName + 'Axis',
        getAxisType
    );
}

function getAxisType(option: AxisBaseOption) {
    // Default axis with data is category axis
    return option.type || (option.data ? 'category' : 'value');
}
