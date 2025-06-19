
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
        describeText: 'editorInfo/themeRiver',
        charts: [{
            options: {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'line',
                        lineStyle: {
                            color: 'rgba(0,0,0,0.2)',
                            width: 1,
                            type: 'solid'
                        }
                    }
                },
                legend: {
                    data: ['DQ']
                },
                singleAxis: {
                    top: 50,
                    bottom: 50,
                    axisTick: {},
                    axisLabel: {},
                    type: 'time',
                    axisPointer: {
                        animation: true,
                        label: {
                            show: true
                        }
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            type: 'dashed',
                            opacity: 0.2
                        }
                    }
                },
                series: [
                    {
                        type: 'themeRiver',
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 20,
                                shadowColor: 'rgba(0, 0, 0, 0.8)'
                            }
                        },
                        label: {
                            show: true,
                            position: 'top'
                        },
                        labelLine: {
                            show: true
                        },
                        data: [
                            ['2015/11/08', 10, 'DQ'],
                            ['2015/11/09', 15, 'DQ'],
                            ['2015/11/10', 35, 'DQ'],
                            ['2015/11/11', 38, 'DQ'],
                            ['2015/11/12', 22, 'DQ'],
                            ['2015/11/13', 16, 'DQ'],
                            ['2015/11/14', 7, 'DQ'],
                            ['2015/11/15', 2, 'DQ'],
                            ['2015/11/16', 17, 'DQ'],
                            ['2015/11/17', 33, 'DQ'],
                            ['2015/11/18', 40, 'DQ'],
                            ['2015/11/19', 32, 'DQ'],
                            ['2015/11/20', 26, 'DQ'],
                            ['2015/11/21', 35, 'DQ'],
                            ['2015/11/22', 40, 'DQ'],
                            ['2015/11/23', 32, 'DQ'],
                            ['2015/11/24', 26, 'DQ'],
                            ['2015/11/25', 22, 'DQ'],
                            ['2015/11/26', 16, 'DQ'],
                            ['2015/11/27', 22, 'DQ'],
                            ['2015/11/28', 10, 'DQ']
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'themeRiver-polygon',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'polygon',
                    componentIndex: 0
                }
            }, {
                describeText: 'themeRiver-polygon-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'polygon',
                    componentIndex: 0,
                    dataIndex: 0
                }
            }, {
                describeText: 'themeRiver-label',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'themeRiver-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'labelLine',
                    componentIndex: 0
                }
            }, {
                describeText: 'themeRiver-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 0
                }
            }, {
                describeText: 'themeRiver-labelLine-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'themeRiver',
                    element: 'labelLine',
                    componentIndex: 0,
                    dataIndex: 0
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
