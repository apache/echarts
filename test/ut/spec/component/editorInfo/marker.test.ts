
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
        describeText: 'editorInfo/marker',
        charts: [{
            options: {
                xAxis: {
                    type: 'category',
                    boundaryGap: false
                },
                yAxis: {
                    type: 'value',
                    boundaryGap: [0, '30%']
                },
                visualMap: {
                    type: 'piecewise',
                    show: false,
                    dimension: 0,
                    seriesIndex: 0,
                    pieces: [
                        {
                            gt: 1,
                            lt: 3,
                            color: 'rgba(0, 0, 180, 0.4)'
                        },
                        {
                            gt: 5,
                            lt: 7,
                            color: 'rgba(0, 0, 180, 0.4)'
                        }
                    ]
                },
                series: [
                    {
                        type: 'line',
                        smooth: 0.6,
                        symbol: 'none',
                        lineStyle: {
                            color: '#5470C6',
                            width: 5
                        },
                        markLine: {
                            symbol: ['none', 'none'],
                            label: { show: false },
                            data: [{ xAxis: 1 }, { xAxis: 3 }, { xAxis: 5 }, { xAxis: 7 }]
                        },
                        markPoint: {
                            data: [{ name: '最低', value: 250, xAxis: '2019-10-14', yAxis: 250 }]
                        },
                        markArea: {
                            itemStyle: {
                                color: 'rgba(255, 173, 177, 0.4)'
                            },
                            data: [
                                [
                                    {
                                        name: 'Morning Peak',
                                        xAxis: '2019-10-13'
                                    },
                                    {
                                        xAxis: '2019-10-14'
                                    }
                                ]
                            ]
                        },
                        areaStyle: {},
                        data: [
                            ['2019-10-10', 200],
                            ['2019-10-11', 560],
                            ['2019-10-12', 750],
                            ['2019-10-13', 580],
                            ['2019-10-14', 250],
                            ['2019-10-15', 300],
                            ['2019-10-16', 450],
                            ['2019-10-17', 300],
                            ['2019-10-18', 100]
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'marker-polygon',
                editorInfo: {
                    component: 'markArea',
                    element: 'polygon'
                }
            }, {
                describeText: 'marker-line',
                editorInfo: {
                    component: 'markLine',
                    element: 'line'
                }
            }, {
                describeText: 'marker-label',
                editorInfo: {
                    component: 'markArea',
                    element: 'label'
                }
            }, {
                describeText: 'marker-symbol',
                editorInfo: {
                    component: 'markPoint',
                    element: 'symbol'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
