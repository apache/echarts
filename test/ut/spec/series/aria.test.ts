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

import { EChartsType } from '@/src/echarts';
import { createChart } from '../../core/utHelper';

describe('omit some aria data', function() {

    let chart: EChartsType;
    beforeEach(function() {
        chart = createChart();
    });

    afterEach(function() {
        chart.dispose();
    });

    it('data for column index in columnsToExclude (Tuesday, second column) should be omitted from Aria', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [1]
                }
            },
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
                    type: 'line'
                }
            ]
        };
        chart.setOption(option);
        const el = chart.getDom();
        const ariaValue = el.getAttribute('aria-label');
        expect(ariaValue).not.toContain('Tue');
    });

    it('data for columns in columnsToExclude (first and seventh, Monday and Sunday) should be omitted from Aria', async () => {
        const option = {
            aria: {
                enabled: true,
                data: {
                    columnsToExclude: [0,6]
                }
            },
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
                    type: 'line'
                }
            ]
        };
        chart.setOption(option);
        const el = chart.getDom();
        const ariaValue = el.getAttribute('aria-label');
        expect(ariaValue).not.toContain('Mon');
        expect(ariaValue).not.toContain('Sun');
    });

});
