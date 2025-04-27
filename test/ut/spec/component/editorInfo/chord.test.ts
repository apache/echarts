
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
        describeText: 'editorInfo/chord',
        charts: [{
            options: {
                series: [
                    {
                        type: 'chord',
                        name: 'Gene',
                        startAngle: 90,
                        endAngle: -270,
                        clockwise: false,
                        label: { show: true },
                        lineStyle: { color: 'target' },
                        data: [
                            { name: 'A' },
                            { name: 'B' },
                            { name: 'C' },
                            { name: 'D' },
                            { name: 'E' },
                            { name: 'F' }
                        ],
                        links: [
                            { source: 'A', target: 'B', value: 40 },
                            { source: 'A', target: 'C', value: 20 },
                        ]
                    }
                ]
            },
            cases: [{
                describeText: 'series-chord-chordEdge',
                editorInfo: {
                    component: 'series',
                    subType: 'chord',
                    dataIndex: 0,
                    componentIndex: 0,
                    element: 'edge'
                }
            }, {
                describeText: 'series-chord-chordPiece',
                editorInfo: {
                    component: 'series',
                    subType: 'chord',
                    dataIndex: 0,
                    componentIndex: 0,
                    element: 'piece'
                }
            }]
        }]
    }
];
isChartElementHaveEditorInfo(chartsWaitTest);
