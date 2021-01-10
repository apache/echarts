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

import TimelineModel, { TimelineOption } from './TimelineModel';
import { DataFormatMixin } from '../../model/mixin/dataFormat';
import { mixin } from 'zrender/src/core/util';
import List from '../../data/List';
import { inheritDefaultOption } from '../../util/component';

export interface SliderTimelineOption extends TimelineOption {
}

class SliderTimelineModel extends TimelineModel {

    static type = 'timeline.slider';
    type = SliderTimelineModel.type;

    /**
     * @protected
     */
    static defaultOption: SliderTimelineOption = inheritDefaultOption(TimelineModel.defaultOption, {

        backgroundColor: 'rgba(0,0,0,0)',   // 时间轴背景颜色
        borderColor: '#ccc',               // 时间轴边框颜色
        borderWidth: 0,                    // 时间轴边框线宽，单位px，默认为0（无边框）

        orient: 'horizontal',              // 'vertical'
        inverse: false,

        tooltip: {                          // boolean or Object
            trigger: 'item'                 // data item may also have tootip attr.
        },

        symbol: 'circle',
        symbolSize: 12,

        lineStyle: {
            show: true,
            width: 2,
            color: '#DAE1F5'
        },
        label: {                            // 文本标签
            position: 'auto',           // auto left right top bottom
                                        // When using number, label position is not
                                        // restricted by viewRect.
                                        // positive: right/bottom, negative: left/top
            show: true,
            interval: 'auto',
            rotate: 0,
            // formatter: null,
            // 其余属性默认使用全局文本样式，详见TEXTSTYLE
            color: '#A4B1D7'
        },
        itemStyle: {
            color: '#A4B1D7',
            borderWidth: 1
        },

        checkpointStyle: {
            symbol: 'circle',
            symbolSize: 15,
            color: '#316bf3',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 2,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            // borderColor: 'rgba(194,53,49, 0.5)',
            animation: true,
            animationDuration: 300,
            animationEasing: 'quinticInOut'
        },

        controlStyle: {
            show: true,
            showPlayBtn: true,
            showPrevBtn: true,
            showNextBtn: true,

            itemSize: 24,
            itemGap: 12,

            position: 'left',  // 'left' 'right' 'top' 'bottom'

            playIcon: 'path://M31.6,53C17.5,53,6,41.5,6,27.4S17.5,1.8,31.6,1.8C45.7,1.8,57.2,13.3,57.2,27.4S45.7,53,31.6,53z M31.6,3.3 C18.4,3.3,7.5,14.1,7.5,27.4c0,13.3,10.8,24.1,24.1,24.1C44.9,51.5,55.7,40.7,55.7,27.4C55.7,14.1,44.9,3.3,31.6,3.3z M24.9,21.3 c0-2.2,1.6-3.1,3.5-2l10.5,6.1c1.899,1.1,1.899,2.9,0,4l-10.5,6.1c-1.9,1.1-3.5,0.2-3.5-2V21.3z', // jshint ignore:line
            stopIcon: 'path://M30.9,53.2C16.8,53.2,5.3,41.7,5.3,27.6S16.8,2,30.9,2C45,2,56.4,13.5,56.4,27.6S45,53.2,30.9,53.2z M30.9,3.5C17.6,3.5,6.8,14.4,6.8,27.6c0,13.3,10.8,24.1,24.101,24.1C44.2,51.7,55,40.9,55,27.6C54.9,14.4,44.1,3.5,30.9,3.5z M36.9,35.8c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H36c0.5,0,0.9,0.4,0.9,1V35.8z M27.8,35.8 c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H27c0.5,0,0.9,0.4,0.9,1L27.8,35.8L27.8,35.8z', // jshint ignore:line
            nextIcon: 'M2,18.5A1.52,1.52,0,0,1,.92,18a1.49,1.49,0,0,1,0-2.12L7.81,9.36,1,3.11A1.5,1.5,0,1,1,3,.89l8,7.34a1.48,1.48,0,0,1,.49,1.09,1.51,1.51,0,0,1-.46,1.1L3,18.08A1.5,1.5,0,0,1,2,18.5Z', // jshint ignore:line
            prevIcon: 'M10,.5A1.52,1.52,0,0,1,11.08,1a1.49,1.49,0,0,1,0,2.12L4.19,9.64,11,15.89a1.5,1.5,0,1,1-2,2.22L1,10.77A1.48,1.48,0,0,1,.5,9.68,1.51,1.51,0,0,1,1,8.58L9,.92A1.5,1.5,0,0,1,10,.5Z', // jshint ignore:line

            prevBtnSize: 18,
            nextBtnSize: 18,

            color: '#A4B1D7',
            borderColor: '#A4B1D7',
            borderWidth: 1
        },
        emphasis: {
            label: {
                show: true,
                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: '#6f778d'
            },

            itemStyle: {
                color: '#316BF3'
            },

            controlStyle: {
                color: '#316BF3',
                borderColor: '#316BF3',
                borderWidth: 2
            }
        },

        progress: {
            lineStyle: {
                color: '#316BF3'
            },
            itemStyle: {
                color: '#316BF3'
            },
            label: {
                color: '#6f778d'
            }
        },

        data: []
    });

}

interface SliderTimelineModel extends DataFormatMixin {
    getData(): List<SliderTimelineModel>
}

mixin(SliderTimelineModel, DataFormatMixin.prototype);

export default SliderTimelineModel;