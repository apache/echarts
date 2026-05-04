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
    Dictionary,
    ComponentOnCalendarOptionMixin,
    ComponentOnMatrixOptionMixin,
} from '../../util/types';
import tokens from '../../visual/tokens';
import type GlobalModel from '../../model/Global';
import type Model from '../../model/Model';
import { each, extend, merge } from 'zrender/src/core/util';


export interface ToolboxTooltipFormatterParams {
    componentType: 'toolbox'
    name: string
    title: string
    $vars: ['name', 'title']
}
export interface ToolboxOption extends
    ComponentOption,
    ComponentOnCalendarOptionMixin,
    ComponentOnMatrixOptionMixin,
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

    private _themeFeatureOption: ToolboxOption['feature'];

    init(option: ToolboxOption, parentModel: Model, ecModel: GlobalModel): void {
        // An historical behavior:
        //  An initial ec option
        //       chart.setOption( {toolbox: {feature: { featureA: {}, featureB: {}, }} } )
        //  indicates the declared toolbox features need to be enabled regardless of whether property
        //  "show" is explicity specified. But the subsequent `setOption` in merge mode requires property
        //  "show: false" to be explicity specified if intending to remove features, for example:
        //       chart.setOption( {toolbox: {feature: { featureA: {show: false}, featureC: {} } )
        // We keep backward compatibility and perform specific processing to prevent theme
        // settings from breaking it.
        const toolboxOptionInTheme = ecModel.getTheme().get('toolbox');
        const themeFeatureOption = toolboxOptionInTheme ? toolboxOptionInTheme.feature : null;
        if (themeFeatureOption) {
            // Use extend - the first level of the feature option will be modified later.
            this._themeFeatureOption = extend({}, themeFeatureOption);
            toolboxOptionInTheme.feature = {};
        }

        super.init(option, parentModel, ecModel); // merge theme is performed inside it.

        if (themeFeatureOption) {
            toolboxOptionInTheme.feature = themeFeatureOption; // Recover
        }
    }

    optionUpdated() {
        each(this.option.feature, function (featureOpt, featureName) {
            const themeFeatureOption = this._themeFeatureOption;
            const Feature = featureManager.getFeature(featureName);
            if (Feature) {
                if (Feature.getDefaultOption) {
                    Feature.defaultOption = Feature.getDefaultOption(this.ecModel);
                }
                if (themeFeatureOption && themeFeatureOption[featureName]) {
                    merge(featureOpt, themeFeatureOption[featureName]);
                    // Follow the previous behavior, theme is only be merged once.
                    themeFeatureOption[featureName] = null;
                }
                merge(featureOpt, Feature.defaultOption);
            }
        }, this);
    }

    static defaultOption: ToolboxOption = {

        show: true,

        z: 6,

        // zlevel: 0,

        orient: 'horizontal',

        left: 'right',

        top: 'top',

        // right
        // bottom

        backgroundColor: 'transparent',

        borderColor: tokens.color.border,

        borderRadius: 0,

        borderWidth: 0,

        padding: tokens.size.m,

        itemSize: 15,

        itemGap: tokens.size.s,

        showTitle: true,

        iconStyle: {
            borderColor: tokens.color.accent50,
            color: 'none'
        },
        emphasis: {
            iconStyle: {
                borderColor: tokens.color.accent70
            }
        },
        // textStyle: {},

        // feature

        tooltip: {
            show: false,
            position: 'bottom'
        }
    };
}

export default ToolboxModel;
