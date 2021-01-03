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
import ComponentModel from '../../model/Component';
import {
    getLayoutParams,
    sizeCalculable,
    mergeLayoutParam
} from '../../util/layout';
import Calendar from './Calendar';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    LayoutOrient,
    LineStyleOption,
    ItemStyleOption,
    LabelOption,
    OptionDataValueDate
} from '../../util/types';
import GlobalModel from '../../model/Global';
import Model from '../../model/Model';

export interface CalendarMonthLabelFormatterCallbackParams {
    nameMap: string
    yyyy: string
    yy: string
    /**
     * Month string. With 0 prefix.
     */
    MM: string
    /**
     * Month number
     */
    M: number
}

export interface CalendarYearLabelFormatterCallbackParams {
    nameMap: string
    /**
     * Start year
     */
    start: string
    /**
     * End year
     */
    end: string
}

export interface CalendarOption extends ComponentOption, BoxLayoutOptionMixin {
    mainType?: 'calendar'

    cellSize?: number | 'auto' | (number | 'auto')[]
    orient?: LayoutOrient

    splitLine?: {
        show?: boolean
        lineStyle?: LineStyleOption
    }

    itemStyle?: ItemStyleOption
    /**
     * // one year
     * range: 2017
     * // one month
     * range: '2017-02'
     * //  a range
     * range: ['2017-01-02', '2017-02-23']
     * // note: they will be identified as ['2017-01-01', '2017-02-01']
     * range: ['2017-01', '2017-02']
     */
    range?: OptionDataValueDate | (OptionDataValueDate)[]

    dayLabel?: Omit<LabelOption, 'position'> & {
        /**
         * First day of week.
         */
        firstDay?: number

        /**
         * Margin between day label and axis line.
         * Can be percent string of cell size.
         */
        margin?: number | string

        /**
         * Position of week, at the beginning or end of the range.
         */
        position?: 'start' | 'end'

        /**
         * Week text content, defaults to 'en'; It supports Chinese, English, and custom; index 0 always means Sunday
         * en: shortcut to English  ['S', 'M', 'T', 'W', 'T', 'F', 'S']
         * cn: shortcut to Chinese ['日', '一', '二', '三', '四', '五', '六']
         */
        nameMap?: 'en' | 'cn' | string[]
    }

    monthLabel?: Omit<LabelOption, 'position'> & {
        /**
         * Margin between month label and axis line.
         */
        margin?: number

        /**
         * Position of month label, at the beginning or end of the range.
         */
        position?: 'start' | 'end'

        /**
         * Month text content, defaults to 'en'; It supports Chinese, English, and custom; Index 0 always means Jan;
         */
        nameMap?: 'en' | 'cn' | string[]

        formatter?: string | ((params: CalendarMonthLabelFormatterCallbackParams) => string)
    }

    yearLabel?: Omit<LabelOption, 'position'> & {
        /**
         * Margin between year label and axis line.
         */
        margin?: number

        /**
         * Position of year label, at the beginning or end of the range.
         */
        position?: 'top' | 'bottom' | 'left' | 'right'

        formatter?: string | ((params: CalendarYearLabelFormatterCallbackParams) => string)
    }
}

class CalendarModel extends ComponentModel<CalendarOption> {
    static type = 'calendar';
    type = CalendarModel.type;

    coordinateSystem: Calendar;

    /**
     * @override
     */
    init(option: CalendarOption, parentModel: Model, ecModel: GlobalModel) {
        const inputPositionParams = getLayoutParams(option);

        super.init.apply(this, arguments as any);

        mergeAndNormalizeLayoutParams(option, inputPositionParams);
    }

    /**
     * @override
     */
    mergeOption(option: CalendarOption) {
        super.mergeOption.apply(this, arguments as any);

        mergeAndNormalizeLayoutParams(this.option, option);
    }

    getCellSize() {
        // Has been normalized
        return this.option.cellSize as (number | 'auto')[];
    }

    static defaultOption: CalendarOption = {
        zlevel: 0,
        z: 2,
        left: 80,
        top: 60,

        cellSize: 20,

        // horizontal vertical
        orient: 'horizontal',

        // month separate line style
        splitLine: {
            show: true,
            lineStyle: {
                color: '#000',
                width: 1,
                type: 'solid'
            }
        },

        // rect style  temporarily unused emphasis
        itemStyle: {
            color: '#fff',
            borderWidth: 1,
            borderColor: '#ccc'
        },

        // week text style
        dayLabel: {
            show: true,

            firstDay: 0,

            // start end
            position: 'start',
            margin: '50%', // 50% of cellSize
            nameMap: 'en',
            color: '#000'
        },

        // month text style
        monthLabel: {
            show: true,

            // start end
            position: 'start',
            margin: 5,

            // center or left
            align: 'center',

            // cn en []
            nameMap: 'en',
            formatter: null,
            color: '#000'
        },

        // year text style
        yearLabel: {
            show: true,

            // top bottom left right
            position: null,
            margin: 30,
            formatter: null,
            color: '#ccc',
            fontFamily: 'sans-serif',
            fontWeight: 'bolder',
            fontSize: 20
        }
    };
}


function mergeAndNormalizeLayoutParams(target: CalendarOption, raw: BoxLayoutOptionMixin) {
    // Normalize cellSize
    const cellSize = target.cellSize;
    let cellSizeArr: (number | 'auto')[];

    if (!zrUtil.isArray(cellSize)) {
        cellSizeArr = target.cellSize = [cellSize, cellSize];
    }
    else {
        cellSizeArr = cellSize;
    }

    if (cellSizeArr.length === 1) {
        cellSizeArr[1] = cellSizeArr[0];
    }

    const ignoreSize = zrUtil.map([0, 1], function (hvIdx) {
        // If user have set `width` or both `left` and `right`, cellSizeArr
        // will be automatically set to 'auto', otherwise the default
        // setting of cellSizeArr will make `width` setting not work.
        if (sizeCalculable(raw, hvIdx)) {
            cellSizeArr[hvIdx] = 'auto';
        }
        return cellSizeArr[hvIdx] != null && cellSizeArr[hvIdx] !== 'auto';
    });

    mergeLayoutParam(target, raw, {
        type: 'box', ignoreSize: ignoreSize
    });
}

export default CalendarModel;
