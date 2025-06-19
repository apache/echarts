
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
        describeText: 'editorInfo/timeline',
        charts: [{
            options: {
                timeline: {
                    // @ts-ignore
                    show: true,
                    axisType: 'category',
                    currentIndex: 0,
                    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                }
            },
            cases: [{
                describeText: 'timeline-text',
                editorInfo: {
                    component: 'timeline',
                    element: 'text'
                }
            }, {
                describeText: 'timeline-button',
                editorInfo: {
                    component: 'timeline',
                    element: 'button'
                }
            }, {
                describeText: 'timeline-progressLine',
                editorInfo: {
                    component: 'timeline',
                    element: 'progressLine'
                }
            }, {
                describeText: 'timeline-symbol',
                editorInfo: {
                    component: 'timeline',
                    element: 'symbol'
                }
            }, {
                describeText: 'timeline-line',
                editorInfo: {
                    component: 'timeline',
                    element: 'line'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
