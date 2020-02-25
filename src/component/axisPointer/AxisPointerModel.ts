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

import ComponentModel from '../../model/Component';
import {
    ComponentOption,
    OptionDataValue,
    LineStyleOption,
    AreaStyleOption,
    LabelOption,
    ZREasing,
    ColorString,
    ShadowOptionMixin,
    CallbackDataParams
} from '../../util/types';

interface AxisInfo {
    axisIndex: number
    axisName: string
    axisId: string
}

interface AxisPointerLink {
    xAxisIndex?: number[] | 'all'
    yAxisIndex?: number[] | 'all'
    xAxisId?: string[]
    yAxisId?: string[]
    xAxisName?: string[] | string
    yAxisName?: string[] | string

    radiusAxisIndex?: number[] | 'all'
    angleAxisIndex?: number[] | 'all'
    radiusAxisId?: string[]
    angleAxisId?: string[]
    radiusAxisName?: string[] | string
    angleAxisName?: string[] | string

    singleAxisIndex?: number[] | 'all'
    singleAxisId?: string[]
    singleAxisName?: string[] | string

    mapper?(
        sourceVal: OptionDataValue,
        sourceAxisInfo: AxisInfo,
        targetAxisInfo: AxisInfo
    ): OptionDataValue
}

type LabelFormatterParmas = Pick<CallbackDataParams,
    'componentType'
    | 'componentSubType'
    | 'componentIndex'
    | 'seriesType'
    | 'seriesIndex'
    | 'seriesId'
    | 'seriesName'
    | 'name'
    | 'dataIndex'
    | 'data'
    | 'dataType'
    | 'value'
    | 'dimensionNames'
    | 'dimensionIndex'
>

export interface AxisPointerOption extends ComponentOption {

    show?: boolean | 'auto'

    triggerOn?: 'click' | 'mousemove' | 'none' | 'mousemove|click'

    type?: 'line' | 'shadow'

    snap?: boolean

    triggerTooltip?: boolean

    /**
     * current value. When using axisPointer.handle, value can be set to define the initail position of axisPointer.
     */
    value?: OptionDataValue

    status?: 'show' | 'hide'

    // [group0, group1, ...]
    // Each group can be: {
    //      mapper: function () {},
    //      singleTooltip: 'multiple',  // 'multiple' or 'single'
    //      xAxisId: ...,
    //      yAxisName: ...,
    //      angleAxisIndex: ...
    // }
    // mapper: can be ignored.
    //      input: {axisInfo, value}
    //      output: {axisInfo, value}
    link?: AxisPointerLink[]

    label?: LabelOption & {
        precision?: 'auto' | string
        margin?: number
        /**
         * String template include variable {value} or callback function
         */
        formatter?: string | ((params: LabelFormatterParmas) => string)
    }
    animation?: boolean | 'auto'
    animationDurationUpdate?: number
    animationEasingUpdate?: ZREasing

    /**
     * Available when type is 'line'
     */
    lineStyle?: LineStyleOption
    /**
     * Available when type is 'shadow'
     */
    shadowStyle?: AreaStyleOption

    handle?: {
        show?: boolean
        icon?: string
        /**
         * The size of the handle
         */
        size?: number | number[]
        /**
         * Distance from handle center to axis.
         */
        margin?: number

        color?: ColorString

        /**
         * Throttle for mobile performance
         */
        throttle?: number
    } & ShadowOptionMixin
}


class AxisPointerModel extends ComponentModel<AxisPointerOption> {

    static type = 'axisPointer' as const
    type = AxisPointerModel.type

    // coordSysAxesInfo

    static defaultOption: AxisPointerOption = {
        // 'auto' means that show when triggered by tooltip or handle.
        show: 'auto',

        zlevel: 0,
        z: 50,

        type: 'line', // 'line' 'shadow' 'cross' 'none'.
        // axispointer triggered by tootip determine snap automatically,
        // see `modelHelper`.
        snap: false,
        triggerTooltip: true,

        value: null,
        status: null, // Init value depends on whether handle is used.

        link: [],

        // Do not set 'auto' here, otherwise global animation: false
        // will not effect at this axispointer.
        animation: null,
        animationDurationUpdate: 200,

        lineStyle: {
            color: '#aaa',
            width: 1,
            type: 'solid'
        },

        shadowStyle: {
            color: 'rgba(150,150,150,0.3)'
        },

        label: {
            show: true,
            formatter: null, // string | Function
            precision: 'auto', // Or a number like 0, 1, 2 ...
            margin: 3,
            color: '#fff',
            padding: [5, 7, 5, 7],
            backgroundColor: 'auto', // default: axis line color
            borderColor: null,
            borderWidth: 0,
            shadowBlur: 3,
            shadowColor: '#aaa'
            // Considering applicability, common style should
            // better not have shadowOffset.
            // shadowOffsetX: 0,
            // shadowOffsetY: 2
        },

        handle: {
            show: false,
            /* eslint-disable */
            icon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z', // jshint ignore:line
            /* eslint-enable */
            size: 45,
            // handle margin is from symbol center to axis, which is stable when circular move.
            margin: 50,
            // color: '#1b8bbd'
            // color: '#2f4554'
            color: '#333',
            shadowBlur: 3,
            shadowColor: '#aaa',
            shadowOffsetX: 0,
            shadowOffsetY: 2,

            // For mobile performance
            throttle: 40
        }
    }
}

ComponentModel.registerClass(AxisPointerModel);

export default AxisPointerModel;
