
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
        describeText: 'editorInfo/sunburst',
        charts: [{
            options: {
                series: {
                    type: 'sunburst',
                    data: [
                        {
                            name: 'Grandpa',
                            children: [
                                {
                                    name: 'Uncle Leo',
                                    value: 15,
                                    children: [
                                        {
                                            name: 'Cousin Jack',
                                            value: 2
                                        },
                                        {
                                            name: 'Cousin Mary',
                                            value: 5,
                                            children: [
                                                {
                                                    name: 'Jackson',
                                                    value: 2
                                                }
                                            ]
                                        },
                                        {
                                            name: 'Cousin Ben',
                                            value: 4
                                        }
                                    ]
                                },
                                {
                                    name: 'Father',
                                    value: 10,
                                    children: [
                                        {
                                            name: 'Me',
                                            value: 5
                                        },
                                        {
                                            name: 'Brother Peter',
                                            value: 1
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            name: 'Nancy',
                            children: [
                                {
                                    name: 'Uncle Nike',
                                    children: [
                                        {
                                            name: 'Cousin Betty',
                                            value: 1
                                        },
                                        {
                                            name: 'Cousin Jenny',
                                            value: 2
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    radius: [0, '90%'],
                    label: {
                        show: true,
                        rotate: 'radial',
                        position: 'outside',
                        distance: 20
                    },
                    labelLine: {
                        show: true,
                        showAbove: true
                    }
                }
            },
            cases: [{
                describeText: 'series-sunburst-label',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sunburst-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'labelLine',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sunburst-piece',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'piece',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sunburst-piece-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'piece',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }, {
                describeText: 'series-sunburst-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }, {
                describeText: 'series-sunburst-labelLine-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'labelLine',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
