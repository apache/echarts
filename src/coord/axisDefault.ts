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
import tokens from '../visual/tokens';
import { AxisBaseOption } from './axisCommonTypes';

const defaultOption: AxisBaseOption = {
    show: true,
    // zlevel: 0,
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
    nameTextStyle: {
        // textMargin: never, // The default value will be specified based on `nameLocation`.
    },
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
            color: tokens.color.axisLine,
            width: 1,
            type: 'solid'
        },
        // The arrow at both ends the the axis.
        symbol: ['none', 'none'],
        symbolSize: [10, 15],
        breakLine: true,
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
        fontSize: 12,
        color: tokens.color.axisLabel,
        // In scenarios like axis labels, when labels text's progression direction matches the label
        // layout direction (e.g., when all letters are in a single line), extra start/end margin is
        // needed to prevent the text from appearing visually joined. In the other case, when lables
        // are stacked (e.g., having rotation or horizontal labels on yAxis), the layout needs to be
        // compact, so NO extra top/bottom margin should be applied.
        textMargin: [0, 3], // Empirical default value.
    },
    splitLine: {
        show: true,
        showMinLine: true,
        showMaxLine: true,
        lineStyle: {
            color: tokens.color.axisSplitLine,
            width: 1,
            type: 'solid'
        }
    },
    splitArea: {
        show: false,
        areaStyle: {
            color: [
                tokens.color.backgroundTint,
                tokens.color.backgroundTransparent
            ]
        }
    },
    breakArea: {
        show: true,
        itemStyle: {
            color: tokens.color.neutral00,
            // Break border color should be darker than the splitLine
            // because it has opacity and should be more prominent
            borderColor: tokens.color.border,
            borderWidth: 1,
            borderType: [3, 3],
            opacity: 0.6
        },
        zigzagAmplitude: 4,
        zigzagMinSpan: 4,
        zigzagMaxSpan: 20,
        zigzagZ: 100,
        expandOnClick: true,
    },
    breakLabelLayout: {
        moveOverlap: 'auto',
    }
};


const categoryAxis: AxisBaseOption = zrUtil.merge({
    // The gap at both ends of the axis. For categoryAxis, boolean.
    boundaryGap: true,
    // Set false to faster category collection.
    deduplication: null,
    jitter: 0,
    jitterOverlap: true,
    jitterMargin: 2,
    // splitArea: {
        // show: false
    // },
    splitLine: {
        show: false
    },
    axisTick: {
        // If tick is align with label when boundaryGap is true
        alignWithLabel: false,
        interval: 'auto',
        show: 'auto'
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
        // Length of minor tick
        length: 3,

        // Line style
        lineStyle: {
            // Default to be same with axisTick
        }
    },

    minorSplitLine: {
        show: false,

        lineStyle: {
            color: tokens.color.axisMinorSplitLine,
            width: 1
        }
    }
}, defaultOption);

const timeAxis: AxisBaseOption = zrUtil.merge({
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
    logBase: 10
}, valueAxis);


export default {
    category: categoryAxis,
    value: valueAxis,
    time: timeAxis,
    log: logAxis
};
