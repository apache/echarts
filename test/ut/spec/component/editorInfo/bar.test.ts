
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
        describeText: 'editorInfo/bar',
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
                        data: [120, 200, 150, 80, 70, 110, 130],
                        type: 'bar',
                        showBackground: true,
                        markPoint: {
                            symbol: 'pin',
                            data: [{
                            type: 'min'
                            }]
                        },
                        markLine: {
                            label: {
                                show: true,
                                position: 'end'
                            },
                            lineStyle: {
                                type: 'dotted'
                            },
                            data: [{
                                    yAxis: 50
                                }
                            ]
                        },
                        markArea: {
                            label: {
                                position: 'inside'
                            },
                            data: [
                                [{
                                    name: 'Mark Area',
                                    coord: [1, 20]
                                }, {
                                    coord: [5, 50]
                                }]
                            ]
                        }
                    }
                ]
            },
            cases: [{
                describeText: 'series-cartesian2d-background',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'background'
                }
            }, {
                describeText: 'series-cartesian2d-bar',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'bar'
                }
            }, {
                describeText: 'series-cartesian2d-bar-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'bar',
                    dataIndex: 6
                }
            }, {
                describeText: 'series-cartesian2d-markPoint-label',
                editorInfo: {
                    component: 'markPoint',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markPoint-symbol',
                editorInfo: {
                    component: 'markPoint',
                    element: 'symbol',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markLine-line',
                editorInfo: {
                    component: 'markLine',
                    element: 'line',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markLine-fromSymbol',
                editorInfo: {
                    component: 'markLine',
                    element: 'line.fromSymbol',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markLine-toSymbol',
                editorInfo: {
                    component: 'markLine',
                    element: 'line.toSymbol',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markLine-label',
                editorInfo: {
                    component: 'markLine',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markArea-label',
                editorInfo: {
                    component: 'markArea',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-cartesian2d-markArea-polygon',
                editorInfo: {
                    component: 'markArea',
                    element: 'polygon',
                    componentIndex: 0
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
                series: [{
                    type: 'bar',
                    data: [2, 1.2, 2.4, 3.6],
                    coordinateSystem: 'polar',
                    showBackground: true,
                    label: {
                        show: true,
                        formatter: '{b}: {c}',
                        distance: 20,
                        position: 'top'
                    },
                    labelLine: {
                        show: true,
                        lineStyle: {
                            color: '#000'
                        }
                    }
                }, {
                    type: 'bar',
                    data: [2, 1.2, 2.4, 3.6],
                    coordinateSystem: 'polar',
                    showBackground: true,
                    label: {
                        show: true,
                        formatter: '{b}: {c}',
                        distance: 20,
                        position: 'top'
                    },
                    labelLine: {
                        show: true,
                        lineStyle: {
                            color: '#000'
                        }
                    }
                }]
            },
            cases: [{
                describeText: 'series-polar-background',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'background'
                }
            }, {
                describeText: 'series-polar-bar',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 1,
                    element: 'bar'
                }
            }, {
                describeText: 'series-polar-label',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'label'
                }
            }, {
                describeText: 'series-polar-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 1,
                    element: 'labelLine'
                }
            }, {
                describeText: 'series-polar-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 0,
                    element: 'label',
                    dataIndex: 3
                }
            }, {
                describeText: 'series-polar-labelLine-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'bar',
                    componentIndex: 1,
                    element: 'labelLine',
                    dataIndex: 3
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
