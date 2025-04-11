
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
        describeText: 'editorInfo/graph',
        charts: [{
            options: {
                series: [
                    {
                        type: 'graph',
                        layout: 'none',
                        data: [
                            {
                                id: '11',
                                name: 'Valjean',
                                symbolSize: 66.66666666666667,
                                x: -87.93029,
                                y: -6.8120565,
                                value: 100,
                                category: 1,
                                label: {
                                    show: true
                                }
                            },
                            {
                                id: '32',
                                name: 'Scaufflaire',
                                symbolSize: 2.6666666666666665,
                                x: -122.41348,
                                y: 210.37503,
                                value: 4,
                                category: 1,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '33',
                                name: 'Woman1',
                                symbolSize: 4.495239333333333,
                                x: -234.6001,
                                y: -113.15067,
                                value: 6.742859,
                                category: 1,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '34',
                                name: 'Judge',
                                symbolSize: 11.809524666666666,
                                x: -387.84915,
                                y: 58.7059,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '35',
                                name: 'Champmathieu',
                                symbolSize: 11.809524666666666,
                                x: -338.2307,
                                y: 87.48405,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '36',
                                name: 'Brevet',
                                symbolSize: 11.809524666666666,
                                x: -453.26874,
                                y: 58.94648,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '37',
                                name: 'Chenildieu',
                                symbolSize: 11.809524666666666,
                                x: -386.44904,
                                y: 140.05937,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '38',
                                name: 'Cochepaille',
                                symbolSize: 11.809524666666666,
                                x: -446.7876,
                                y: 123.38005,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '43',
                                name: 'Woman2',
                                symbolSize: 6.323809333333333,
                                x: -187.00418,
                                y: -145.02663,
                                value: 9.485714,
                                category: 6,
                                label: {
                                    show: false
                                }
                            }
                        ],
                        links: [
                            {
                                source: '32',
                                target: '11'
                            },
                            {
                                source: '33',
                                target: '11'
                            },
                            {
                                source: '34',
                                target: '11'
                            },
                            {
                                source: '35',
                                target: '11'
                            },
                            {
                                source: '36',
                                target: '11'
                            },
                            {
                                source: '37',
                                target: '11'
                            },
                            {
                                source: '38',
                                target: '11'
                            },
                            {
                                source: '43',
                                target: '11'
                            }
                        ],
                        categories: [
                            {
                                name: 'A'
                            },
                            {
                                name: 'B'
                            },
                            {
                                name: 'C'
                            },
                            {
                                name: 'D'
                            },
                            {
                                name: 'E'
                            },
                            {
                                name: 'F'
                            },
                            {
                                name: 'G'
                            },
                            {
                                name: 'H'
                            },
                            {
                                name: 'I'
                            }
                        ],
                        roam: true,
                        label: {
                            position: 'right',
                            formatter: '{b}'
                        },
                        lineStyle: {
                            color: 'source',
                            curveness: 0.3
                        },
                        emphasis: {
                            focus: 'adjacency',
                            lineStyle: {
                                width: 10
                            }
                        }
                    }, {
                        type: 'graph',
                        layout: 'none',
                        data: [
                            {
                                id: '11',
                                name: 'Valjean',
                                symbolSize: 66.66666666666667,
                                x: -87.93029,
                                y: -6.8120565,
                                value: 100,
                                category: 1,
                                label: {
                                    show: true
                                }
                            },
                            {
                                id: '32',
                                name: 'Scaufflaire',
                                symbolSize: 2.6666666666666665,
                                x: -122.41348,
                                y: 210.37503,
                                value: 4,
                                category: 1,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '33',
                                name: 'Woman1',
                                symbolSize: 4.495239333333333,
                                x: -234.6001,
                                y: -113.15067,
                                value: 6.742859,
                                category: 1,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '34',
                                name: 'Judge',
                                symbolSize: 11.809524666666666,
                                x: -387.84915,
                                y: 58.7059,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '35',
                                name: 'Champmathieu',
                                symbolSize: 11.809524666666666,
                                x: -338.2307,
                                y: 87.48405,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '36',
                                name: 'Brevet',
                                symbolSize: 11.809524666666666,
                                x: -453.26874,
                                y: 58.94648,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '37',
                                name: 'Chenildieu',
                                symbolSize: 11.809524666666666,
                                x: -386.44904,
                                y: 140.05937,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '38',
                                name: 'Cochepaille',
                                symbolSize: 11.809524666666666,
                                x: -446.7876,
                                y: 123.38005,
                                value: 17.714287,
                                category: 3,
                                label: {
                                    show: false
                                }
                            },
                            {
                                id: '43',
                                name: 'Woman2',
                                symbolSize: 6.323809333333333,
                                x: -187.00418,
                                y: -145.02663,
                                value: 9.485714,
                                category: 6,
                                label: {
                                    show: false
                                }
                            }
                        ],
                        links: [
                            {
                                source: '32',
                                target: '11'
                            },
                            {
                                source: '33',
                                target: '11'
                            },
                            {
                                source: '34',
                                target: '11'
                            },
                            {
                                source: '35',
                                target: '11'
                            },
                            {
                                source: '36',
                                target: '11'
                            },
                            {
                                source: '37',
                                target: '11'
                            },
                            {
                                source: '38',
                                target: '11'
                            },
                            {
                                source: '43',
                                target: '11'
                            }
                        ],
                        categories: [
                            {
                                name: 'A'
                            },
                            {
                                name: 'B'
                            },
                            {
                                name: 'C'
                            },
                            {
                                name: 'D'
                            },
                            {
                                name: 'E'
                            },
                            {
                                name: 'F'
                            },
                            {
                                name: 'G'
                            },
                            {
                                name: 'H'
                            },
                            {
                                name: 'I'
                            }
                        ],
                        roam: true,
                        label: {
                            position: 'right',
                            formatter: '{b}'
                        },
                        lineStyle: {
                            color: 'source',
                            curveness: 0.3
                        },
                        emphasis: {
                            focus: 'adjacency',
                            lineStyle: {
                                width: 10
                            }
                        }
                    }
                ]
            },
            cases: [{
                describeText: 'series-graph-node',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'node',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-graph-line',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'line',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-graph-symbol',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'symbol',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-graph-line-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'line',
                    componentIndex: 1,
                    dataIndex: 7
                }
            }, {
                describeText: 'series-graph-symbol-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'symbol',
                    componentIndex: 0,
                    dataIndex: 8
                }
            }]
        }, {
            options: {
                series: {
                    type: 'graph',
                    layout: 'circular',
                    circular: {
                        rotateLabel: true
                    },
                    links: [
                        {
                            source: 'a',
                            target: 'a1'
                        },
                        {
                            source: 'a2',
                            target: 'b1'
                        },
                        {
                            source: 'c',
                            target: 'a'
                        },
                        {
                            source: 'a',
                            target: 'b'
                        },
                        {
                            source: 'b',
                            target: 'a1'
                        },
                        {
                            source: 'd',
                            target: 'a1'
                        },
                        {
                            source: 'd',
                            target: 'a2'
                        },
                        {
                            source: 'a',
                            target: 'a2'
                        },
                        {
                            source: 'b',
                            target: 'b1'
                        },
                        {
                            source: 'd',
                            target: 'c'
                        },
                        {
                            source: 'a',
                            target: 'b1'
                        },
                        {
                            source: 'b1',
                            target: 'a1'
                        },
                        {
                            source: 'b1',
                            target: 'c'
                        },
                        {
                            source: 'd1',
                            target: 'b1'
                        },
                        {
                            source: 'd2',
                            target: 'c'
                        },
                        {
                            source: 'b1',
                            target: 'b1'
                        },
                        {
                            source: 'b2',
                            target: 'a1'
                        },
                        {
                            source: 'c1',
                            target: 'c'
                        },
                        {
                            source: 'c1',
                            target: 'b1'
                        },
                        {
                            source: 'c2',
                            target: 'c'
                        },
                        {
                            source: 'c3',
                            target: 'b1'
                        },
                        {
                            source: 'd3',
                            target: 'a1'
                        },
                        {
                            source: 'c3',
                            target: 'c'
                        }
                    ],
                    data: [
                        {
                            name: 'a',
                            value: 30,
                            symbolSize: 30,
                            category: 'A',
                            symbol: 'circle'
                        },
                        {
                            name: 'a1',
                            value: 20,
                            symbolSize: 20,
                            category: 'A',
                            symbol: 'circle'
                        },
                        {
                            name: 'a2',
                            value: 20,
                            symbolSize: 20,
                            category: 'A',
                            symbol: 'circle'
                        },
                        {
                            name: 'b',
                            value: 20,
                            symbolSize: 20,
                            category: 'B',
                            symbol: 'circle'
                        },
                        {
                            name: 'b1',
                            value: 20,
                            symbolSize: 20,
                            category: 'B',
                            symbol: 'circle'
                        },
                        {
                            name: 'b2',
                            value: 20,
                            symbolSize: 20,
                            category: 'B',
                            symbol: 'circle'
                        },
                        {
                            name: 'c',
                            value: 10,
                            symbolSize: 10,
                            category: 'C',
                            symbol: 'circle'
                        },
                        {
                            name: 'c1',
                            value: 10,
                            symbolSize: 10,
                            category: 'C',
                            symbol: 'circle'
                        },
                        {
                            name: 'c2',
                            value: 10,
                            symbolSize: 10,
                            category: 'C',
                            symbol: 'circle'
                        },
                        {
                            name: 'c3',
                            value: 10,
                            symbolSize: 10,
                            category: 'C',
                            symbol: 'circle'
                        },
                        {
                            name: 'd',
                            value: 20,
                            symbolSize: 20,
                            category: 'D',
                            symbol: 'circle'
                        },
                        {
                            name: 'd1',
                            value: 20,
                            symbolSize: 20,
                            category: 'D',
                            symbol: 'circle'
                        },
                        {
                            name: 'd2',
                            value: 20,
                            symbolSize: 20,
                            category: 'D',
                            symbol: 'circle'
                        },
                        {
                            name: 'd3',
                            value: 20,
                            symbolSize: 20,
                            category: 'D',
                            symbol: 'circle'
                        }
                    ],
                    lineStyle: {
                        color: 'source',
                        curveness: 0.3,
                        width: 1,
                        opacity: 0.25,
                        colorType: 'source'
                    },
                    label: {
                        show: true,
                        rich: {
                            a: {
                                color: '#D3D3D3',
                                fontSize: 12,
                                fontFamily: 'Microsoft YaHei'
                            },
                            b: {
                                color: 'inherit',
                                fontSize: 16,
                                fontFamily: 'Microsoft YaHei'
                            }
                        }
                    },
                    top: '15%',
                    left: '5%',
                    right: '5%',
                    bottom: '15%'
                }
            },
            cases: [{
                describeText: 'series-graph-node',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'node',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-graph-line',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'line',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-graph-symbol',
                editorInfo: {
                    component: 'series',
                    subType: 'graph',
                    element: 'symbol',
                    componentIndex: 0
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);

