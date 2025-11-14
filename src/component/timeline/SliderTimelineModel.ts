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
import SeriesData from '../../data/SeriesData';
import { inheritDefaultOption } from '../../util/component';
import tokens from '../../visual/tokens';

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
        borderColor: tokens.color.border,     // 时间轴边框颜色
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
            color: tokens.color.accent10
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
            color: tokens.color.tertiary
        },
        itemStyle: {
            color: tokens.color.accent20,
            borderWidth: 0
        },

        checkpointStyle: {
            symbol: 'circle',
            symbolSize: 15,
            color: tokens.color.accent50,
            borderColor: tokens.color.accent50,
            borderWidth: 0,
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'rgba(0, 0, 0, 0)',
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

            playIcon: 'path://M15 0C23.2843 0 30 6.71573 30 15C30 23.2843 23.2843 30 15 30C6.71573 30 0 23.2843 0 15C0 6.71573 6.71573 0 15 0ZM15 3C8.37258 3 3 8.37258 3 15C3 21.6274 8.37258 27 15 27C21.6274 27 27 21.6274 27 15C27 8.37258 21.6274 3 15 3ZM11.5 10.6699C11.5 9.90014 12.3333 9.41887 13 9.80371L20.5 14.1338C21.1667 14.5187 21.1667 15.4813 20.5 15.8662L13 20.1963C12.3333 20.5811 11.5 20.0999 11.5 19.3301V10.6699Z', // jshint ignore:line
            stopIcon: 'path://M15 0C23.2843 0 30 6.71573 30 15C30 23.2843 23.2843 30 15 30C6.71573 30 0 23.2843 0 15C0 6.71573 6.71573 0 15 0ZM15 3C8.37258 3 3 8.37258 3 15C3 21.6274 8.37258 27 15 27C21.6274 27 27 21.6274 27 15C27 8.37258 21.6274 3 15 3ZM11.5 10C12.3284 10 13 10.6716 13 11.5V18.5C13 19.3284 12.3284 20 11.5 20C10.6716 20 10 19.3284 10 18.5V11.5C10 10.6716 10.6716 10 11.5 10ZM18.5 10C19.3284 10 20 10.6716 20 11.5V18.5C20 19.3284 19.3284 20 18.5 20C17.6716 20 17 19.3284 17 18.5V11.5C17 10.6716 17.6716 10 18.5 10Z', // jshint ignore:line
            // eslint-disable-next-line max-len
            nextIcon: 'path://M0.838834 18.7383C0.253048 18.1525 0.253048 17.2028 0.838834 16.617L7.55635 9.89949L0.838834 3.18198C0.253048 2.59619 0.253048 1.64645 0.838834 1.06066C1.42462 0.474874 2.37437 0.474874 2.96015 1.06066L10.7383 8.83883L10.8412 8.95277C11.2897 9.50267 11.2897 10.2963 10.8412 10.8462L10.7383 10.9602L2.96015 18.7383C2.37437 19.3241 1.42462 19.3241 0.838834 18.7383Z', // jshint ignore:line
            // eslint-disable-next-line max-len
            prevIcon: 'path://M10.9602 1.06066C11.5459 1.64645 11.5459 2.59619 10.9602 3.18198L4.24264 9.89949L10.9602 16.617C11.5459 17.2028 11.5459 18.1525 10.9602 18.7383C10.3744 19.3241 9.42462 19.3241 8.83883 18.7383L1.06066 10.9602L0.957771 10.8462C0.509245 10.2963 0.509245 9.50267 0.957771 8.95277L1.06066 8.83883L8.83883 1.06066C9.42462 0.474874 10.3744 0.474874 10.9602 1.06066Z', // jshint ignore:line

            prevBtnSize: 18,
            nextBtnSize: 18,

            color: tokens.color.accent50,
            borderColor: tokens.color.accent50,
            borderWidth: 0
        },
        emphasis: {
            label: {
                show: true,
                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: tokens.color.accent60
            },

            itemStyle: {
                color: tokens.color.accent60,
                borderColor: tokens.color.accent60
            },

            controlStyle: {
                color: tokens.color.accent70,
                borderColor: tokens.color.accent70
            },
        },

        progress: {
            lineStyle: {
                color: tokens.color.accent30
            },
            itemStyle: {
                color: tokens.color.accent40
            }
        },

        data: []
    });

}

interface SliderTimelineModel extends DataFormatMixin {
    getData(): SeriesData<SliderTimelineModel>
}

mixin(SliderTimelineModel, DataFormatMixin.prototype);

export default SliderTimelineModel;
