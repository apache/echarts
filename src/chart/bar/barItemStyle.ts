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

import makeStyleMapper from '../../model/mixin/makeStyleMapper';
import * as zrUtil from 'zrender/src/core/util';
import Model from '../../model/Model';
import { ItemStyleOption, Dictionary } from '../../util/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { BarDataItemOption, BarItemStyleOption } from './BarSeries';

const ITEM_STYLE_BAR_BORDER_COLOR = ['itemStyle', 'barBorderColor'] as const;
const ITEM_STYLE_BAR_BORDER_WIDTH = ['itemStyle', 'barBorderWidth'] as const;
const ITEM_STYLE_BORDER_WIDTH = ['itemStyle', 'borderWidth'] as const;
const ITEM_STYLE_BAR_BORDER_RADIUS = ['itemStyle', 'barBorderRadius'] as const;
const ITEM_STYLE_BORDER_RADIUS = ['itemStyle', 'borderRadius'] as const;

const getBarItemStyleInner = makeStyleMapper(
    [
        ['fill', 'color'],
        ['stroke', 'borderColor'],
        ['lineWidth', 'borderWidth'],
        // Previously echarts2 use 'barBorderXxx' to distinguish
        // with `borderXxx` for "magic type" feature. That seams
        // not a neat strategy. We should better unify the name
        // of those props to `borderXxx` rather than `barBorderXxx`.
        // But the echarts-doc has been describing it as `barBorderXxx`
        // until echarts4. So we still compat that settings to reduce
        // the break change.
        ['stroke', 'barBorderColor'],
        ['lineWidth', 'barBorderWidth'],
        ['opacity'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['shadowColor']
    ]
);

export function getBarItemStyle(
    model: Model,
    excludes?: readonly (keyof ItemStyleOption)[]
) {
    const style = getBarItemStyleInner(model, excludes);
    if (model.getBorderLineDash) {
        const lineDash = model.getBorderLineDash();
        lineDash && (style.lineDash = lineDash);
    }
    return style;
}

/**
 * If has `barBorderColor` or `barBorderWidth`, return a new style.
 * Otherwise return the input style.
 */
export function fixBarItemStyle(
    itemModel: Model<BarDataItemOption>,
    style: PathStyleProps
): PathStyleProps {

    const barBorderColor = itemModel.get(ITEM_STYLE_BAR_BORDER_COLOR);
    const barBorderWidth = itemModel.get(ITEM_STYLE_BAR_BORDER_WIDTH);
    let newProps: Dictionary<unknown>;

    if (barBorderColor != null) {
        newProps = newProps || {};
        newProps.barBorderColor = barBorderColor;
    }
    if (barBorderWidth != null) {
        newProps = newProps || {};
        newProps.barBorderColor = barBorderWidth;
    }
    if (newProps) {
        style = zrUtil.createObject(style, newProps);
    }

    return style;
}

export function getBarBorderColor(styleModel: Model<BarItemStyleOption>): BarItemStyleOption['borderColor'] {
    return zrUtil.retrieve2(
        styleModel.get('borderColor'),
        styleModel.get('barBorderColor')
    );
}
export function getBarBorderRadius(styleModel: Model<BarItemStyleOption>): BarItemStyleOption['borderRadius'] {
    return zrUtil.retrieve2(
        styleModel.get('borderRadius'),
        styleModel.get('barBorderRadius')
    );
}

export function getBarItemModelBorderWidth(itemModel: Model<BarDataItemOption>): BarItemStyleOption['borderWidth'] {
    return zrUtil.retrieve2(
        itemModel.get(ITEM_STYLE_BORDER_WIDTH),
        itemModel.get(ITEM_STYLE_BAR_BORDER_WIDTH)
    );
}

export function getBarItemModelBorderRadius(itemModel: Model<BarDataItemOption>): BarItemStyleOption['borderRadius'] {
    return zrUtil.retrieve2(
        itemModel.get(ITEM_STYLE_BORDER_RADIUS),
        itemModel.get(ITEM_STYLE_BAR_BORDER_RADIUS)
    );
}

