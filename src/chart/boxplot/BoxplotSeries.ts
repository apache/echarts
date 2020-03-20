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
    LabelOption,
    OptionDataValueNumeric
} from '../../util/types';
import type Axis2D from '../../coord/cartesian/Axis2D';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';

// [min,  Q1,  median (or Q2),  Q3,  max]
type BoxplotDataValue = OptionDataValueNumeric[];
export interface BoxplotDataItemOption {
    value: BoxplotDataValue

    itemStyle?: ItemStyleOption
    label?: LabelOption

    emphasis?: {
        itemStyle: ItemStyleOption
        label?: LabelOption
    }

}

export interface BoxplotSeriesOption extends SeriesOption, SeriesOnCartesianOptionMixin {
    type?: 'boxplot'

    coordinateSystem?: 'cartesian2d'

    hoverAnimation?: boolean
    layout?: LayoutOrient
    /**
     * [min, max] can be percent of band width.
     */
    boxWidth?: (string | number)[]

    itemStyle?: ItemStyleOption

    label?: LabelOption

    emphasis?: {
        itemStyle: ItemStyleOption
        label?: LabelOption
    }

    data?: (BoxplotDataValue | BoxplotDataItemOption)[]
}

class BoxplotSeriesModel extends SeriesModel<BoxplotSeriesOption> {

    static readonly type = 'series.boxplot';
    readonly type = BoxplotSeriesModel.type;

    static readonly dependencies = ['xAxis', 'yAxis', 'grid'];

    coordinateSystem: Cartesian2D;
    // TODO
    // box width represents group size, so dimension should have 'size'.

    /**
     * @see <https://en.wikipedia.org/wiki/Box_plot>
     * The meanings of 'min' and 'max' depend on user,
     * and echarts do not need to know it.
     * @readOnly
     */
    defaultValueDimensions = [
        {name: 'min', defaultTooltip: true},
        {name: 'Q1', defaultTooltip: true},
        {name: 'median', defaultTooltip: true},
        {name: 'Q3', defaultTooltip: true},
        {name: 'max', defaultTooltip: true}
    ];

    dimensions: string[];

    static defaultOption: BoxplotSeriesOption = {
        zlevel: 0,
        z: 2,
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,

        hoverAnimation: true,

        layout: null,
        boxWidth: [7, 50],

        itemStyle: {
            color: '#fff',
            borderWidth: 1
        },

        emphasis: {
            itemStyle: {
                borderWidth: 2,
                shadowBlur: 5,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                shadowColor: 'rgba(0,0,0,0.4)'
            }
        },

        animationEasing: 'elasticOut',
        animationDuration: 800
    };
}

interface BoxplotSeriesModel extends WhiskerBoxCommonMixin<BoxplotSeriesOption> {
    getBaseAxis(): Axis2D
}
zrUtil.mixin(BoxplotSeriesModel, WhiskerBoxCommonMixin, true);

SeriesModel.registerClass(BoxplotSeriesModel);

export default BoxplotSeriesModel;
