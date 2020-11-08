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
import SeriesModel from '../../model/Series';
import {WhiskerBoxCommonMixin} from '../helper/whiskerBoxCommon';
import {
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    LayoutOrient,
    ItemStyleOption,
    ZRColor,
    ColorString,
    LabelOption,
    SeriesLargeOptionMixin,
    OptionDataValueNumeric,
    StatesOptionMixin,
    DefaultExtraEmpasisState
} from '../../util/types';
import List from '../../data/List';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import { BrushCommonSelectorsForSeries } from '../../component/brush/selector';

type CandlestickDataValue = OptionDataValueNumeric[];

interface CandlestickItemStyleOption extends ItemStyleOption {
    color0?: ZRColor
    borderColor0?: ColorString
}
export interface CandlestickStateOption {
    itemStyle?: CandlestickItemStyleOption
    label?: LabelOption
}
export interface CandlestickDataItemOption
    extends CandlestickStateOption, StatesOptionMixin<CandlestickStateOption, ExtraStateOption> {
    value: CandlestickDataValue
}

interface ExtraStateOption {
    emphasis?: {
        focus?: DefaultExtraEmpasisState['focus']
        scale?: boolean
    }
}

export interface CandlestickSeriesOption
    extends SeriesOption<CandlestickStateOption, ExtraStateOption>, CandlestickStateOption,
    SeriesOnCartesianOptionMixin,
    SeriesLargeOptionMixin {

    type?: 'candlestick'

    coordinateSystem?: 'cartesian2d'

    layout?: LayoutOrient
    clip?: boolean

    barMaxWidth?: number | string
    barMinWidth?: number | string
    barWidth?: number | string

    data?: (CandlestickDataValue | CandlestickDataItemOption)[]
}

class CandlestickSeriesModel extends SeriesModel<CandlestickSeriesOption> {

    static readonly type = 'series.candlestick';
    readonly type = CandlestickSeriesModel.type;

    static readonly dependencies = ['xAxis', 'yAxis', 'grid'];

    coordinateSystem: Cartesian2D;

    dimensions: string[];

    defaultValueDimensions = [
        {name: 'open', defaultTooltip: true},
        {name: 'close', defaultTooltip: true},
        {name: 'lowest', defaultTooltip: true},
        {name: 'highest', defaultTooltip: true}
    ];

    static defaultOption: CandlestickSeriesOption = {
        zlevel: 0,
        z: 2,
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,

        // xAxisIndex: 0,
        // yAxisIndex: 0,

        layout: null, // 'horizontal' or 'vertical'

        clip: true,

        itemStyle: {
            color: '#c23531', // 阳线 positive
            color0: '#314656', // 阴线 negative     '#c23531', '#314656'
            borderWidth: 1,
            // FIXME
            // ec2中使用的是lineStyle.color 和 lineStyle.color0
            borderColor: '#c23531',
            borderColor0: '#314656'
        },

        emphasis: {
            scale: true,
            itemStyle: {
                borderWidth: 2
            }
        },

        barMaxWidth: null,
        barMinWidth: null,
        barWidth: null,

        large: true,
        largeThreshold: 600,

        progressive: 3e3,
        progressiveThreshold: 1e4,
        progressiveChunkMode: 'mod',

        animationEasing: 'linear',
        animationDuration: 300
    };

    /**
     * Get dimension for shadow in dataZoom
     * @return dimension name
     */
    getShadowDim() {
        return 'open';
    }

    brushSelector(dataIndex: number, data: List, selectors: BrushCommonSelectorsForSeries): boolean {
        const itemLayout = data.getItemLayout(dataIndex);
        return itemLayout && selectors.rect(itemLayout.brushRect);
    }
}

zrUtil.mixin(CandlestickSeriesModel, WhiskerBoxCommonMixin, true);

SeriesModel.registerClass(CandlestickSeriesModel);

export default CandlestickSeriesModel;
