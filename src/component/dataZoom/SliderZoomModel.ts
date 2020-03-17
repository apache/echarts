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

interface SliderDataZoomOption extends DataZoomOption, BoxLayoutOptionMixin {

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

    dataBackground?: {
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
     * Percent of the slider height
     */
    handleSize?: string | number

    handleStyle?: ItemStyleOption

    labelPrecision?: number | 'auto'

    labelFormatter?: string | ((value: number, valueStr: string) => string)

    showDetail?: boolean

    showDataShadow?: 'auto' | boolean

    zoomLock?: boolean

    textStyle?: LabelOption
}


class SliderZoomModel extends DataZoomModel<SliderDataZoomOption> {
    static readonly type = 'dataZoom.slider'
    type = SliderZoomModel.type

    static readonly layoutMode = 'box'

    static defaultOption: SliderDataZoomOption = inheritDefaultOption(DataZoomModel.defaultOption, {
        show: true,

        // deault value can only be drived in view stage.
        right: 'auto',  // Default align to grid rect.
        top: 'auto',    // Default align to grid rect.
        width: 'auto',  // Default align to grid rect.
        height: 'auto', // Default align to grid rect.
        left: null,   // Default align to grid rect.
        bottom: null, // Default align to grid rect.

        backgroundColor: 'rgba(47,69,84,0)',    // Background of slider zoom component.
        // dataBackgroundColor: '#ddd',
        dataBackground: {
            lineStyle: {
                color: '#2f4554',
                width: 0.5,
                opacity: 0.3
            },
            areaStyle: {
                color: 'rgba(47,69,84,0.3)',
                opacity: 0.3
            }
        },
        borderColor: '#ddd',

        fillerColor: 'rgba(167,183,204,0.4)',     // Color of selected area.
        // handleColor: 'rgba(89,170,216,0.95)',     // Color of handle.
        /* eslint-disable */
        handleIcon: 'M8.2,13.6V3.9H6.3v9.7H3.1v14.9h3.3v9.7h1.8v-9.7h3.3V13.6H8.2z M9.7,24.4H4.8v-1.4h4.9V24.4z M9.7,19.1H4.8v-1.4h4.9V19.1z',
        /* eslint-enable */
        // Percent of the slider height
        handleSize: '100%',

        handleStyle: {
            color: '#a7b7cc'
        },

        showDetail: true,
        showDataShadow: 'auto',                 // Default auto decision.
        realtime: true,
        zoomLock: false,                        // Whether disable zoom.
        textStyle: {
            color: '#333'
        }
    });
}

ComponentModel.registerClass(SliderZoomModel);

export default SliderZoomModel;