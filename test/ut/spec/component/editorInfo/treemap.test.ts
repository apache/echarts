
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
        describeText: 'editorInfo/treemap',
        charts: [{
            options: {
                series: [
                    {
                        levels: [{
                            itemStyle: {
                                borderColor: '#fff',
                                gapWidth: 6
                            }
                        }, {
                            itemStyle: {
                                borderColor: '#fff',
                                gapWidth: 6
                            }
                        }, {
                            itemStyle: {
                                gapWidth: 6
                            }
                        }],
                        type: 'treemap',
                        label: {
                            show: true
                        },
                        upperLabel: {
                            show: false
                        },
                        itemStyle: {
                            borderWidth: 2,
                            borderColor: '#666'
                        },
                        data: [
                            {
                                name: 'nodeA',
                                value: 10,
                                children: [
                                    {
                                        name: 'nodeAa',
                                        value: 4
                                    },
                                    {
                                        name: 'nodeAb',
                                        value: 6
                                    }
                                ]
                            },
                            {
                                name: 'nodeB',
                                value: 20,
                                children: [
                                    {
                                        name: 'nodeBa',
                                        value: 20,
                                        children: [
                                            {
                                                name: 'nodeBa1',
                                                value: 20
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'series-breadcrumb',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'breadcrumb',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-breadcrumbText',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'breadcrumbText',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-background',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'background',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-rect',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'rect',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-rect-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'rect',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }, {
                describeText: 'series-label',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
