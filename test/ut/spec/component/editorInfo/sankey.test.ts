
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
        describeText: 'editorInfo/sankey',
        charts: [{
            options: {
                series: {
                    type: 'sankey',
                    layout: 'none',
                    emphasis: {
                        focus: 'adjacency'
                    },
                    data: [
                        {
                            name: 'a'
                        },
                        {
                            name: 'b'
                        },
                        {
                            name: 'a1'
                        },
                        {
                            name: 'a2'
                        },
                        {
                            name: 'b1'
                        },
                        {
                            name: 'c'
                        }
                    ],
                    links: [
                        {
                            source: 'a',
                            target: 'a1',
                            value: 5
                        },
                        {
                            source: 'a',
                            target: 'a2',
                            value: 3
                        },
                        {
                            source: 'b',
                            target: 'b1',
                            value: 8
                        },
                        {
                            source: 'a',
                            target: 'b1',
                            value: 3
                        },
                        {
                            source: 'b1',
                            target: 'a1',
                            value: 1
                        },
                        {
                            source: 'b1',
                            target: 'c',
                            value: 2
                        }
                    ]
                }
            },
            cases: [{
                describeText: 'series-sankey-node',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'node',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sankey-edge',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'edge',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sankey-node-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'node',
                    componentIndex: 0,
                    dataIndex: 5
                }
            }, {
                describeText: 'series-sankey-edge-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'edge',
                    componentIndex: 0,
                    dataIndex: 5
                }
            }, {
                describeText: 'series-sankey-label',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-sankey-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 5
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
