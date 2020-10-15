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
import { AxisBaseOption } from './axisCommonTypes';


const defaultOption: AxisBaseOption = {
    show: true,
    zlevel: 0,
    z: 0,
    // Inverse the axis.
    inverse: false,

    // Axis name displayed.
    name: '',
    // 'start' | 'middle' | 'end'
    nameLocation: 'end',
    // By degree. By default auto rotate by nameLocation.
    nameRotate: null,
    nameTruncate: {
        maxWidth: null,
        ellipsis: '...',
        placeholder: '.'
    },
    // Use global text style by default.
    nameTextStyle: {},
    // The gap between axisName and axisLine.
    nameGap: 15,

    // Default `false` to support tooltip.
    silent: false,
    // Default `false` to avoid legacy user event listener fail.
    triggerEvent: false,

    tooltip: {
        show: false
    },

    axisPointer: {},

    axisLine: {
        show: true,
        onZero: true,
        onZeroAxisIndex: null,
        lineStyle: {
            color: '#6E7079',
            width: 1,
            type: 'solid'
        },
        // The arrow at both ends the the axis.
        symbol: ['none', 'none'],
        symbolSize: [10, 15]
    },
    axisTick: {
        show: true,
        // Whether axisTick is inside the grid or outside the grid.
        inside: false,
        // The length of axisTick.
        length: 5,
        lineStyle: {
            width: 1
        }
    },
    axisLabel: {
        show: true,
        // Whether axisLabel is inside the grid or outside the grid.
        inside: false,
        rotate: 0,
        // true | false | null/undefined (auto)
        showMinLabel: null,
        // true | false | null/undefined (auto)
        showMaxLabel: null,
        margin: 8,
        // formatter: null,
        fontSize: 12
    },
    splitLine: {
        show: true,
        lineStyle: {
            color: ['#E0E6F1'],
            width: 1,
            type: 'solid'
        }
    },
    splitArea: {
        show: false,
        areaStyle: {
            color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
        }
    }
};


const categoryAxis: AxisBaseOption = zrUtil.merge({
    // The gap at both ends of the axis. For categoryAxis, boolean.
    boundaryGap: true,
    // Set false to faster category collection.
    deduplication: null,
    // splitArea: {
        // show: false
    // },
    splitLine: {
        show: false
    },
    axisTick: {
        // If tick is align with label when boundaryGap is true
        alignWithLabel: false,
        interval: 'auto'
    },
    axisLabel: {
        interval: 'auto'
    }
}, defaultOption);

const valueAxis: AxisBaseOption = zrUtil.merge({
    boundaryGap: [0, 0],

    axisLine: {
        // Not shown when other axis is categoryAxis in cartesian
        show: 'auto'
    },
    axisTick: {
        // Not shown when other axis is categoryAxis in cartesian
        show: 'auto'
    },

    // TODO
    // min/max: [30, datamin, 60] or [20, datamin] or [datamin, 60]

    splitNumber: 5,

    minorTick: {
        // Minor tick, not available for cateogry axis.
        show: false,
        // Split number of minor ticks. The value should be in range of (0, 100)
        splitNumber: 5,
        // Lenght of minor tick
        length: 3,

        // Line style
        lineStyle: {
            // Default to be same with axisTick
        }
    },

    minorSplitLine: {
        show: false,

        lineStyle: {
            color: '#F4F7FD',
            width: 1
        }
    }
}, defaultOption);

const timeAxis: AxisBaseOption = zrUtil.merge({
    scale: true,
    splitNumber: 6,
    axisLabel: {
        // To eliminate labels that are not nice
        showMinLabel: false,
        showMaxLabel: false,
        rich: {
            primary: {
                fontWeight: 'bold'
            }
        }
    },
    splitLine: {
        show: false
    }
}, valueAxis);

const logAxis: AxisBaseOption = zrUtil.defaults({
    scale: true,
    logBase: 10
}, valueAxis);


export default {
    category: categoryAxis,
    value: valueAxis,
    time: timeAxis,
    log: logAxis
};
