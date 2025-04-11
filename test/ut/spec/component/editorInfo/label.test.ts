
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
        describeText: 'editorInfo/label',
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
                        type: 'line',
                        label: {
                            show: true
                        },
                        endLabel: {
                            show: true
                        },
                        labelLine: {
                            show: true,
                            length2: 5,
                            lineStyle: {
                                color: '#bbb'
                            }
                        },
                        labelLayout: function () {
                            return {
                                x: 200,
                                moveOverlap: 'shiftY'
                            };
                        },
                        name: 'value'
                    }
                ]
            },
            cases: [{
                describeText: 'label-line-label',
                editorInfo: {
                    component: 'series',
                    subType: 'line',
                    element: 'label'
                }
            }, {
                describeText: 'label-line-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'line',
                    element: 'labelLine'
                }
            }, {
                describeText: 'label-line-endLabel',
                editorInfo: {
                    component: 'series',
                    subType: 'line',
                    element: 'endLabel'
                }
            }]
        }, {
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
                        data: [120, 200, 150, 80, 70, 110, 130],
                        type: 'bar',
                        showBackground: true,
                        label: {
                            show: true
                        }
                    }
                ]
            },
            cases: [{
                describeText: 'label-barChart-cartesian2d',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    element: 'label'
                }
            }]
        }, {
            options: {
                polar: {
                    radius: [30, '80%']
                },
                angleAxis: {
                    max: 4,
                    startAngle: 75
                },
                radiusAxis: {
                    type: 'category',
                    data: ['a', 'b', 'c', 'd']
                },
                series: {
                    type: 'bar',
                    data: [2, 1.2, 2.4, 3.6],
                    coordinateSystem: 'polar',
                    showBackground: true,
                    label: {
                        show: true,
                        position: 'middle',
                        formatter: '{b}: {c}'
                    }
                }
            },
            cases: [{
                describeText: 'label-barChart-polar',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    element: 'label'
                }
            }]
        }, {
            options: {
                series: [
                    {
                        name: 'Access From',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: true
                        },
                        labelLine: {
                            show: true
                        },
                        data: [
                            { value: 1048, name: 'Search Engine' },
                            { value: 735, name: 'Direct' },
                            { value: 580, name: 'Email' },
                            { value: 484, name: 'Union Ads' },
                            { value: 300, name: 'Video Ads' }
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'label-pie',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'labelLine'
                }
            }, {
                describeText: 'label-pie',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'label'
                }
            }]
        }, {
            options: {
                series: [
                    {
                        type: 'treemap',
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
                describeText: 'label-treeMap',
                editorInfo: {
                    component: 'series',
                    subType: 'treemap',
                    element: 'label'
                }
            }]
        }, {
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
                describeText: 'label-tree',
                editorInfo: {
                    component: 'series',
                    subType: 'tree',
                    element: 'label'
                }
            }]
        }, {
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
                describeText: 'label-sankey',
                editorInfo: {
                    component: 'series',
                    subType: 'sankey',
                    element: 'label'
                }
            }]
        }, {
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
                        rotate: 'radial'
                    }
                }
            },
            cases: [{
                describeText: 'label-sunburst',
                editorInfo: {
                    component: 'series',
                    subType: 'sunburst',
                    element: 'label'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
