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
import * as featureManager from './featureManager';
import ComponentModel from '../../model/Component';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    LayoutOrient,
    ZRColor,
    BorderOptionMixin,
    ItemStyleOption,
    LabelOption,
    CommonTooltipOption,
    Dictionary
} from '../../util/types';


export interface ToolboxTooltipFormatterParams {
    componentType: 'toolbox'
    name: string
    title: string
    $vars: ['name', 'title']
}
export interface ToolboxOption extends ComponentOption,
    BoxLayoutOptionMixin,
    BorderOptionMixin {
    mainType?: 'toolbox'

    show?: boolean

    orient?: LayoutOrient

    backgroundColor?: ZRColor

    borderRadius?: number | number[]

    padding?: number | number[]

    itemSize?: number

    itemGap?: number

    showTitle?: boolean

    iconStyle?: ItemStyleOption

    emphasis?: {
        iconStyle?: ItemStyleOption
    }

    textStyle?: LabelOption

    tooltip?: CommonTooltipOption<ToolboxTooltipFormatterParams>

    /**
     * Write all supported features in the final export option.
     */
    feature?: Partial<Dictionary<featureManager.ToolboxFeatureOption>>
}

class ToolboxModel extends ComponentModel<ToolboxOption> {

    static type = 'toolbox' as const;
    type = ToolboxModel.type;

    static layoutMode = {
        type: 'box',
        ignoreSize: true
    } as const;

    optionUpdated() {
        super.optionUpdated.apply(this, arguments as any);
        const {ecModel} = this;

        zrUtil.each(this.option.feature, function (featureOpt, featureName) {
            const Feature = featureManager.getFeature(featureName);
            if (Feature) {
                if (Feature.getDefaultOption) {
                    Feature.defaultOption = Feature.getDefaultOption(ecModel);
                }
                zrUtil.merge(featureOpt, Feature.defaultOption);
            }
        });
    }

    static defaultOption: ToolboxOption = {

        show: true,

        z: 6,

        zlevel: 0,

        orient: 'horizontal',

        left: 'right',

        top: 'top',

        // right
        // bottom

        backgroundColor: 'transparent',

        borderColor: '#ccc',

        borderRadius: 0,

        borderWidth: 0,

        padding: 5,

        itemSize: 15,

        itemGap: 8,

        showTitle: true,

        iconStyle: {
            borderColor: '#666',
            color: 'none'
        },
        emphasis: {
            iconStyle: {
                borderColor: '#3E98C5'
            }
        },
        // textStyle: {},

        // feature

        tooltip: {
            show: false
        }
    };
}

export default ToolboxModel;
