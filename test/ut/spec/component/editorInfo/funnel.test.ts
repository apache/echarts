
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
        describeText: 'editorInfo/funnel',
        charts: [{
            options: {
                series: [
                    {
                        type: 'funnel',
                        label: {
                            show: true,
                            position: 'outside'
                        },
                        labelLine: {
                            length: 10
                        },
                        data: [
                            { value: 60, name: 'Visit' },
                            { value: 40, name: 'Inquiry' },
                            { value: 20, name: 'Order' },
                            { value: 80, name: 'Click' },
                            { value: 100, name: 'Show' }
                        ]
                    }, {
                        type: 'funnel',
                        label: {
                            show: true,
                            position: 'outside'
                        },
                        labelLine: {
                            length: 10
                        },
                        data: [
                            { value: 60, name: 'Visit' },
                            { value: 40, name: 'Inquiry' },
                            { value: 20, name: 'Order' },
                            { value: 80, name: 'Click' },
                            { value: 100, name: 'Show' }
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'series-funnel-piece',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'piece',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-funnel-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'piece',
                    componentIndex: 0,
                    dataIndex: 4
                }
            }, {
                describeText: 'series-funnel-labelLine',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'labelLine',
                    componentIndex: 0
                }
            }, {
                describeText: 'series-funnel-label',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'label',
                    componentIndex: 1
                }
            }, {
                describeText: 'series-funnel-labelLine-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'labelLine',
                    componentIndex: 0,
                    dataIndex: 4
                }
            }, {
                describeText: 'series-funnel-label-dataIndex',
                editorInfo: {
                    component: 'series',
                    subType: 'funnel',
                    element: 'label',
                    componentIndex: 1,
                    dataIndex: 4
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
