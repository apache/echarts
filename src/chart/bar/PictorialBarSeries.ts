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

import BaseBarSeriesModel, { BaseBarSeriesOption } from './BaseBarSeries';
import {
    OptionDataValue,
    ItemStyleOption,
    SeriesLabelOption,
    AnimationOptionMixin,
    SeriesStackOptionMixin,
    StatesOptionMixin,
    OptionDataItemObject,
    DefaultEmphasisFocus
} from '../../util/types';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import { inheritDefaultOption } from '../../util/component';

export interface PictorialBarStateOption {
    itemStyle?: ItemStyleOption
    label?: SeriesLabelOption
}

interface PictorialBarSeriesSymbolOption {
    /**
     * Customized bar shape
     */
    symbol?: string
    /**
     * Can be ['100%', '100%'], null means auto.
     * The percent will be relative to category width. If no repeat.
     * Will be relative to symbolBoundingData.
     */
    symbolSize?: (number | string)[] | number | string

    symbolRotate?: number

    /**
     * Default to be auto
     */
    symbolPosition?: 'start' | 'end' | 'center'

    /**
     * Can be percent offset relative to the symbolSize
     */
    symbolOffset?: (number | string)[] | number | string
    /**
     * start margin and end margin. Can be a number or a percent string relative to symbolSize.
     * Auto margin by default.
     */
    symbolMargin?: (number | string)[] | number | string

    /**
     * true: means auto calculate repeat times and cut by data.
     * a number: specifies repeat times, and do not cut by data.
     * 'fixed': means auto calculate repeat times but do not cut by data.
     *
     * Otherwise means no repeat
     */
    symbolRepeat?: boolean | number | 'fixed'

    /**
     * From start to end or end to start.
     */
    symbolRepeatDirection?: 'start' | 'end'

    symbolClip?: boolean

    /**
     * It will define the size of graphic elements.
     */
    symbolBoundingData?: number | number[]

    symbolPatternSize?: number
}


interface ExtraStateOption {
    emphasis?: {
        focus?: DefaultEmphasisFocus
        scale?: boolean
    }
}

export interface PictorialBarDataItemOption extends PictorialBarSeriesSymbolOption,
    // Pictorial bar support configure animation in each data item.
    AnimationOptionMixin,
    PictorialBarStateOption, StatesOptionMixin<PictorialBarStateOption, ExtraStateOption>,
    OptionDataItemObject<OptionDataValue> {

    z?: number

    cursor?: string
}

export interface PictorialBarSeriesOption
    extends BaseBarSeriesOption<PictorialBarStateOption, ExtraStateOption>, PictorialBarStateOption,
    PictorialBarSeriesSymbolOption,
    SeriesStackOptionMixin {

    type?: 'pictorialBar'

    coordinateSystem?: 'cartesian2d'

    data?: (PictorialBarDataItemOption | OptionDataValue | OptionDataValue[])[]
}

class PictorialBarSeriesModel extends BaseBarSeriesModel<PictorialBarSeriesOption> {
    static type = 'series.pictorialBar';
    type = PictorialBarSeriesModel.type;

    static dependencies = ['grid'];

    coordinateSystem: Cartesian2D;


    hasSymbolVisual = true;
    defaultSymbol = 'roundRect';

    static defaultOption: PictorialBarSeriesOption = inheritDefaultOption(BaseBarSeriesModel.defaultOption, {

        symbol: 'circle',     // Customized bar shape
        symbolSize: null,     //
        symbolRotate: null,

        symbolPosition: null, // 'start' or 'end' or 'center', null means auto.
        symbolOffset: null,
        symbolMargin: null,
        symbolRepeat: false,
        symbolRepeatDirection: 'end', // 'end' means from 'start' to 'end'.

        symbolClip: false,
        symbolBoundingData: null, // Can be 60 or -40 or [-40, 60]
        symbolPatternSize: 400, // 400 * 400 px

        barGap: '-100%',      // In most case, overlap is needed.

        // z can be set in data item, which is z2 actually.

        // Disable progressive
        progressive: 0,

        emphasis: {
            // By default pictorialBar do not hover scale. Hover scale is not suitable
            // for the case that both has foreground and background.
            scale: false
        },

        select: {
            itemStyle: {
                borderColor: '#212121'
            }
        }
    });

    getInitialData(option: PictorialBarSeriesOption) {
        // Disable stack.
        (option as any).stack = null;
        return super.getInitialData.apply(this, arguments as any);
    }
}

export default PictorialBarSeriesModel;