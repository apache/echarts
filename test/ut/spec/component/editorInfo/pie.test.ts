
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
        describeText: 'editorInfo/pie',
        charts: [{
            options: {
                series: [
                    {
                        name: 'Access From',
                        type: 'pie',
                        radius: ['60%', '70%'],
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
                            { value: 735, name: 'Direct' }
                        ]
                    }, {
                        name: 'Access From',
                        type: 'pie',
                        radius: ['2%', '18%'],
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
                            { value: 735, name: 'Direct' }
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'series-pie-piece',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'piece',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-pie-piece-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'piece',
                    componentIndex: 1,
                    dataIndex: 1
                }
            }, {
                describeText: 'series-pie-label',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'label',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-pie-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'labelLine',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-pie-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'label',
                    componentIndex: 0,
                    dataIndex: 1
                }
            }, {
                describeText: 'series-pie-labelLine-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'pie',
                    element: 'labelLine',
                    componentIndex: 1,
                    dataIndex: 1
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);

