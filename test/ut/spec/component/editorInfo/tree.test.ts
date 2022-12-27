
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
        describeText: 'editorInfo/tree',
        charts: [{
            options: {
                series: [
                    {
                        type: 'tree',
                        data: [{
                            name: 'flare',
                            children: [
                                {
                                    name: 'analytics',
                                    children: [
                                        {
                                            name: 'cluster',
                                            children: [
                                                {
                                                    name: 'AgglomerativeCluster',
                                                    value: 3938
                                                },
                                                {
                                                    name: 'CommunityStructure',
                                                    value: 3812
                                                },
                                                {
                                                    name: 'HierarchicalCluster',
                                                    value: 6714
                                                },
                                                {
                                                    name: 'MergeEdge',
                                                    value: 743
                                                }
                                            ]
                                        }
                                    ],
                                    collapsed: true
                                },
                                {
                                    name: 'animate',
                                    children: [
                                        {
                                            name: 'Easing',
                                            value: 17010
                                        },
                                        {
                                            name: 'FunctionSequence',
                                            value: 5842
                                        }
                                    ]
                                }
                            ]
                        }]
                    }
                ]
            },
            cases: [{
                describeText: 'series-tree-node',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'node',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-tree-edge',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'edge',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-tree-node-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'node',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }, {
                describeText: 'series-tree-label',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-tree-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 2
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
