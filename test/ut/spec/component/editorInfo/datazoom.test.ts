
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

import { isChartElementHaveEditorInfo, ChartWaitTest } from '../../../core/editorInfoUtHelper';

const chartsWaitTest: ChartWaitTest[] = [
    {
        describeText: 'editorInfo/dataZoom',
        charts: [{
            options: {
                xAxis: {
                    type: 'category',
                    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        data: [150, 230, 224, 218, 135, 147, 260],
                        type: 'line'
                    }
                ],
                dataZoom: {
                    'show': true,
                    'borderRadius': 0,
                    'bottom': 6,
                    'handleSize': '100%',
                    'handleStyle': {
                        'borderWidth': 2
                    },
                    'handleIcon': 'path://M-6,-16 L6,-16 L6,16 L-6,16Z',
                    'height': 14,
                    'textStyle': {
                        'fontFamily': 'Microsoft YaHei',
                        'fontSize': 12
                    }
                }
            },
            cases: [{
                describeText: 'dataZoom-handle',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'handle'
                }
            }, {
                describeText: 'dataZoom-clickPanel',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'clickPanel'
                }
            }, {
                describeText: 'dataZoom-filler',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'filler'
                }
            }, {
                describeText: 'dataZoom-fillerBackground',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'fillerBackground'
                }
            }, {
                describeText: 'dataZoom-moveHandle',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'moveHandle'
                }
            }, {
                describeText: 'dataZoom-moveHandleIcon',
                editorInfo: {
                    component: 'dataZoom',
                    element: 'moveHandleIcon'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
