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

import DataZoomModel, {DataZoomOption} from './DataZoomModel';
import ComponentModel from '../../model/Component';
import {
    BoxLayoutOptionMixin,
    ZRColor,
    LineStyleOption,
    AreaStyleOption,
    ItemStyleOption,
    LabelOption
} from '../../util/types';
import { inheritDefaultOption } from '../../util/component';

export interface SliderDataZoomOption extends DataZoomOption, BoxLayoutOptionMixin {

    show?: boolean
    /**
     * Slider dataZoom don't support textStyle
     */

    /**
     * Background of slider zoom component
     */
    backgroundColor?: ZRColor

    /**
     * @deprecated Use borderColor instead
     */
    // dataBackgroundColor?: ZRColor

    /**
     * border color of the box. For compatibility,
     * if dataBackgroundColor is set, borderColor
     * is ignored.
     */
    borderColor?: ZRColor

    /**
     * Border radius of the box.
     */
    borderRadius?: number | number[]

    dataBackground?: {
        lineStyle?: LineStyleOption
        areaStyle?: AreaStyleOption
    }

    selectedDataBackground?: {
        lineStyle?: LineStyleOption
        areaStyle?: AreaStyleOption
    }

    /**
     * Color of selected area.
     */
    fillerColor?: ZRColor

    /**
     * @deprecated Use handleStyle instead
     */
    // handleColor?: ZRColor

    handleIcon?: string

    /**
     * number: height of icon. width will be calculated according to the aspect of icon.
     * string: percent of the slider height. width will be calculated according to the aspect of icon.
     */
    handleSize?: string | number

    handleStyle?: ItemStyleOption

    moveHandleIcon?: string
    moveHandleStyle?: ItemStyleOption
    moveHandleSize?: number

    labelPrecision?: number | 'auto'

    labelFormatter?: string | ((value: number, valueStr: string) => string)

    showDetail?: boolean

    showDataShadow?: 'auto' | boolean

    zoomLock?: boolean

    textStyle?: LabelOption

    /**
     * If eable select by brushing
     */
    brushSelect?: boolean

    brushStyle?: ItemStyleOption

    emphasis?: {
        handleStyle?: ItemStyleOption
    }
}


class SliderZoomModel extends DataZoomModel<SliderDataZoomOption> {
    static readonly type = 'dataZoom.slider';
    type = SliderZoomModel.type;

    static readonly layoutMode = 'box';

    static defaultOption: SliderDataZoomOption = inheritDefaultOption(DataZoomModel.defaultOption, {
        show: true,

        // deault value can only be drived in view stage.
        right: 'ph',  // Default align to grid rect.
        top: 'ph',    // Default align to grid rect.
        width: 'ph',  // Default align to grid rect.
        height: 'ph', // Default align to grid rect.
        left: null,   // Default align to grid rect.
        bottom: null, // Default align to grid rect.

        borderColor: '#d2dbee',
        borderRadius: 3,

        backgroundColor: 'rgba(47,69,84,0)',    // Background of slider zoom component.

        // dataBackgroundColor: '#ddd',
        dataBackground: {
            lineStyle: {
                color: '#d2dbee',
                width: 0.5
            },
            areaStyle: {
                color: '#d2dbee',
                opacity: 0.2
            }
        },

        selectedDataBackground: {
            lineStyle: {
                color: '#8fb0f7',
                width: 0.5
            },
            areaStyle: {
                color: '#8fb0f7',
                opacity: 0.2
            }
        },


        fillerColor: 'rgba(135,175,274,0.2)',     // Color of selected area.
        handleIcon: 'path://M-9.35,34.56V42m0-40V9.5m-2,0h4a2,2,0,0,1,2,2v21a2,2,0,0,1-2,2h-4a2,2,0,0,1-2-2v-21A2,2,0,0,1-11.35,9.5Z',
        // Percent of the slider height
        handleSize: '100%',

        handleStyle: {
            color: '#fff',
            borderColor: '#ACB8D1'
        },

        showDetail: true,
        showDataShadow: 'auto',                 // Default auto decision.
        realtime: true,
        zoomLock: false,                        // Whether disable zoom.

        textStyle: {
            color: '#333'
        },

        brushStyle: {
            color: 'rgba(135,175,274,0.15)'
        },

        emphasis: {
            handleStyle: {
                borderColor: '#8FB0F7',
                borderWidth: 2
            }
        }
    });
}

ComponentModel.registerClass(SliderZoomModel);

export default SliderZoomModel;