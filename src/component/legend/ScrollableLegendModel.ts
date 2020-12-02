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

import LegendModel, {LegendOption} from './LegendModel';
import {
    mergeLayoutParam,
    getLayoutParams
} from '../../util/layout';
import { ZRColor, LabelOption } from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import { inheritDefaultOption } from '../../util/component';

export interface ScrollableLegendOption extends LegendOption {
    scrollDataIndex?: number
    /**
     * Gap between each page button
     */
    pageButtonItemGap?: number
    /**
     * Gap between page buttons group and legend items.
     */
    pageButtonGap?: number
    pageButtonPosition?: 'start' | 'end'

    pageFormatter?: string | ((param: {current: number, total: number}) => string)
    pageIcons?: {
        horizontal?: string[]
        vertical?: string[]
    }
    pageIconColor?: ZRColor
    pageIconInactiveColor?: ZRColor
    pageIconSize?: number
    pageTextStyle?: LabelOption

    animationDurationUpdate?: number
}

class ScrollableLegendModel extends LegendModel<ScrollableLegendOption> {

    static type = 'legend.scroll' as const;
    type = ScrollableLegendModel.type;

    /**
     * @param {number} scrollDataIndex
     */
    setScrollDataIndex(scrollDataIndex: number) {
        this.option.scrollDataIndex = scrollDataIndex;
    }

    init(
        option: ScrollableLegendOption,
        parentModel: Model,
        ecModel: GlobalModel
    ) {
        const inputPositionParams = getLayoutParams(option);

        super.init(option, parentModel, ecModel);

        mergeAndNormalizeLayoutParams(this, option, inputPositionParams);
    }

    /**
     * @override
     */
    mergeOption(option: ScrollableLegendOption, ecModel: GlobalModel) {
        super.mergeOption(option, ecModel);

        mergeAndNormalizeLayoutParams(this, this.option, option);
    }

    static defaultOption: ScrollableLegendOption = inheritDefaultOption(LegendModel.defaultOption, {
        scrollDataIndex: 0,
        pageButtonItemGap: 5,
        pageButtonGap: null,
        pageButtonPosition: 'end', // 'start' or 'end'
        pageFormatter: '{current}/{total}', // If null/undefined, do not show page.
        pageIcons: {
            horizontal: ['M0,0L12,-10L12,10z', 'M0,0L-12,-10L-12,10z'],
            vertical: ['M0,0L20,0L10,-20z', 'M0,0L20,0L10,20z']
        },
        pageIconColor: '#2f4554',
        pageIconInactiveColor: '#aaa',
        pageIconSize: 15, // Can be [10, 3], which represents [width, height]
        pageTextStyle: {
            color: '#333'
        },

        animationDurationUpdate: 800
    });
};

// Do not `ignoreSize` to enable setting {left: 10, right: 10}.
function mergeAndNormalizeLayoutParams(
    legendModel: ScrollableLegendModel,
    target: ScrollableLegendOption,
    raw: ScrollableLegendOption
) {
    const orient = legendModel.getOrient();
    const ignoreSize = [1, 1];
    ignoreSize[orient.index] = 0;
    mergeLayoutParam(target, raw, {
        type: 'box', ignoreSize: !!ignoreSize
    });
}

export default ScrollableLegendModel;