
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
        describeText: 'editorInfo/visualMap',
        charts: [{
            options: {
                dataset: {
                    source: [
                        ['score', 'amount', 'product'],
                        [89.3, 58212, 'Matcha Latte'],
                        [57.1, 78254, 'Milk Tea'],
                        [74.4, 41032, 'Cheese Cocoa'],
                        [50.1, 12755, 'Cheese Brownie'],
                        [89.7, 20145, 'Matcha Cocoa'],
                        [68.1, 79146, 'Tea'],
                        [19.6, 91852, 'Orange Juice'],
                        [10.6, 101852, 'Lemon Juice'],
                        [32.7, 20112, 'Walnut Brownie']
                    ]
                },
                grid: { containLabel: true },
                xAxis: { name: 'amount' },
                yAxis: { type: 'category' },
                visualMap: {
                    orient: 'horizontal',
                    left: 'center',
                    min: 10,
                    max: 100,
                    text: ['High Score', 'Low Score'],
                    // Map the score column to color
                    dimension: 0,
                    calculable: true,
                    inRange: {
                        color: ['#65B581', '#FFCE34', '#FD665F']
                    }
                },
                series: [
                    {
                        type: 'bar',
                        encode: {
                            // Map the "amount" column to X axis.
                            x: 'amount',
                            // Map the "product" column to Y axis
                            y: 'product'
                        }
                    }
                ]
            },
            cases: [{
                describeText: 'visualMap-continuous-background',
                editorInfo: {
                    component: 'visualMap',
                    element: 'background'
                }
            }, {
                describeText: 'visualMap-continuous-handleText',
                editorInfo: {
                    component: 'visualMap',
                    element: 'handleText'
                }
            }, {
                describeText: 'visualMap-continuous-outOfRange',
                editorInfo: {
                    component: 'visualMap',
                    element: 'outOfRange'
                }
            }, {
                describeText: 'visualMap-continuous-inRange',
                editorInfo: {
                    component: 'visualMap',
                    element: 'inRange'
                }
            }, {
                describeText: 'visualMap-continuous-handleThumb',
                editorInfo: {
                    component: 'visualMap',
                    element: 'handleThumb'
                }
            }, {
                describeText: 'visualMap-continuous-endText',
                editorInfo: {
                    component: 'visualMap',
                    element: 'endText'
                }
            }]
        }, {
            options: {
                tooltip: {},
                xAxis: {
                    type: 'category',
                    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
                },
                yAxis: {
                    type: 'category',
                    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
                },
                visualMap: {
                    type: 'piecewise',
                    splitNumber: 8,
                    min: 0,
                    max: 100,
                    calculable: true,
                    realtime: false,
                    inRange: {
                        // eslint-disable-next-line max-len
                        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
                    }
                },
                series: [{
                    name: 'Gaussian',
                    type: 'heatmap',
                    data: [
                    ],
                    emphasis: {
                        itemStyle: {
                            borderColor: '#333',
                            borderWidth: 1
                        }
                    },
                    progressive: 1000,
                    animation: false
                }]
            },
            cases: [{
                describeText: 'visualMap-piecewise-background',
                editorInfo: {
                    component: 'visualMap',
                    element: 'background'
                }
            }, {
                describeText: 'visualMap-piecewise-label',
                editorInfo: {
                    component: 'visualMap',
                    element: 'label'
                }
            }, {
                describeText: 'visualMap-piecewise-symbol',
                editorInfo: {
                    component: 'visualMap',
                    element: 'symbol'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
