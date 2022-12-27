
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
        describeText: 'editorInfo/calendar',
        charts: [{
            options: {
                'calendar': {
                    'orient': 'vertical',
                    'itemStyle': {
                        'color': 'rgba(255,255,255,0)',
                        'borderColor': 'rgb(102, 102, 102)',
                        'borderWidth': 1
                    },
                    'splitLine': {
                        'lineStyle': {
                            'color': 'rgb(153, 153, 153)',
                            'width': 1
                        }
                    },
                    'yearLabel': {
                        'show': true,
                        'fontFamily': 'Microsoft YaHei',
                        'fontSize': 12,
                        'color': '#D3D3D3'
                    },
                    'dayLabel': {
                        'show': true,
                        'fontFamily': 'Microsoft YaHei',
                        'fontSize': 14,
                        'color': '#FFFFFF'
                    },
                    'monthLabel': {
                        'show': true,
                        'fontFamily': 'Microsoft YaHei',
                        'fontSize': 12,
                        'color': '#D3D3D3'
                    },
                    'range': [
                        1640966400000,
                        1643472000000
                    ]
                },
                'series': [
                    {
                        'type': 'scatter',
                        'name': 'value',
                        'coordinateSystem': 'calendar',
                        'data': [],
                        'symbol': 'square',
                        'itemStyle': {
                            'borderType': 'solid',
                            'borderColor': '#1890ff',
                            'borderWidth': 0
                        }
                    }
                ],
                'type': 'basicCalendar'
            },
            cases: [{
                describeText: 'calendar-weekText',
                editorInfo: {
                    component: 'calendar',
                    element: 'weekText'
                }
            }, {
                describeText: 'calendar-monthText',
                editorInfo: {
                    component: 'calendar',
                    element: 'monthText'
                }
            }, {
                describeText: 'calendar-yearText',
                editorInfo: {
                    component: 'calendar',
                    element: 'yearText'
                }
            }, {
                describeText: 'calendar-dayRect',
                editorInfo: {
                    component: 'calendar',
                    element: 'dayRect'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
