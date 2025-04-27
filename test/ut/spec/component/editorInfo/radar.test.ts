
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
        describeText: 'editorInfo/radar',
        charts: [{
            options: {
                radar: {
                    // shape: 'circle',
                    indicator: [
                        { name: 'Sales', max: 6500 },
                        { name: 'Administration', max: 16000 },
                        { name: 'Information Technology', max: 30000 },
                        { name: 'Customer Support', max: 38000 },
                        { name: 'Development', max: 52000 },
                        { name: 'Marketing', max: 25000 }
                    ]
                },
                series: [
                    {
                        name: 'Budget vs spending',
                        type: 'radar',
                        label: {
                            show: true
                        },
                        data: [
                            {
                                value: [4200, 3000, 20000, 35000, 50000, 18000],
                                name: 'Allocated Budget'
                            },
                            {
                                value: [5000, 14000, 28000, 26000, 42000, 21000],
                                name: 'Actual Spending'
                            }
                        ]
                    }, {
                        name: 'Budget vs spending',
                        type: 'radar',
                        label: {
                            show: true
                        },
                        data: [
                            {
                                value: [4200, 3000, 20000, 35000, 50000, 18000],
                                name: 'Allocated Budget'
                            },
                            {
                                value: [5000, 14000, 28000, 26000, 42000, 21000],
                                name: 'Actual Spending'
                            }
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'series-radar-polyline',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'polyline',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-radar-polyline-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'polyline',
                    componentIndex: 0,
                    dataIndex: 1
                }
            }, {
                describeText: 'series-radar-symbol',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'symbol',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-radar-symbol-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'symbol',
                    componentIndex: 0,
                    dataIndex: 5
                }
            }, {
                describeText: 'series-radar-label',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'label',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-radar-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'radar',
                    element: 'label',
                    componentIndex: 1,
                    dataIndex: 5
                }
            }, {
                describeText: 'radar-axisName',
                editorInfo: {
                    component: 'radar',
                    element: 'axisName',
                    componentIndex: 0
                }
            }, {
                describeText: 'radar-axisLine',
                editorInfo: {
                    component: 'radar',
                    element: 'axisLine',
                    componentIndex: 0
                }
            }, {
                describeText: 'radar-splitArea',
                editorInfo: {
                    component: 'radar',
                    element: 'splitArea'
                }
            }, {
                describeText: 'radar-splitLine',
                editorInfo: {
                    component: 'radar',
                    element: 'splitLine'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
