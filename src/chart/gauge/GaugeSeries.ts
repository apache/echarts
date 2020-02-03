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

import createListSimply from '../helper/createListSimply';
import SeriesModel from '../../model/Series';

var GaugeSeries = SeriesModel.extend({

    type: 'series.gauge',

    getInitialData: function (option, ecModel) {
        return createListSimply(this, ['value']);
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
        // 默认全局居中
        center: ['50%', '50%'],
        legendHoverLink: true,
        radius: '75%',
        startAngle: 225,
        endAngle: -45,
        clockwise: true,
        // 最小值
        min: 0,
        // 最大值
        max: 100,
        // 分割段数，默认为10
        splitNumber: 10,
        // 坐标轴线
        axisLine: {
            // 默认显示，属性show控制显示与否
            show: true,
            lineStyle: {       // 属性lineStyle控制线条样式
                color: [[0.2, '#91c7ae'], [0.8, '#63869e'], [1, '#c23531']],
                width: 30
            }
        },
        // 分隔线
        splitLine: {
            // 默认显示，属性show控制显示与否
            show: true,
            // 属性length控制线长
            length: 30,
            // 属性lineStyle（详见lineStyle）控制线条样式
            lineStyle: {
                color: '#eee',
                width: 2,
                type: 'solid'
            }
        },
        // 坐标轴小标记
        axisTick: {
            // 属性show控制显示与否，默认不显示
            show: true,
            // 每份split细分多少段
            splitNumber: 5,
            // 属性length控制线长
            length: 8,
            // 属性lineStyle控制线条样式
            lineStyle: {
                color: '#eee',
                width: 1,
                type: 'solid'
            }
        },
        axisLabel: {
            show: true,
            distance: 5,
            // formatter: null,
            color: 'auto'
        },
        pointer: {
            show: true,
            length: '80%',
            width: 8
        },
        itemStyle: {
            color: 'auto'
        },
        title: {
            show: true,
            // x, y，单位px
            offsetCenter: [0, '-40%'],
            // 其余属性默认使用全局文本样式，详见TEXTSTYLE
            color: '#333',
            fontSize: 15
        },
        detail: {
            show: true,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            borderColor: '#ccc',
            width: 100,
            height: null, // self-adaption
            padding: [5, 10],
            // x, y，单位px
            offsetCenter: [0, '40%'],
            // formatter: null,
            // 其余属性默认使用全局文本样式，详见TEXTSTYLE
            color: 'auto',
            fontSize: 30
        }
    }
});

export default GaugeSeries;