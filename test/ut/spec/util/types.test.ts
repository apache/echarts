/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* 'License'); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import { CallbackDataParams } from '@/src/util/types';

describe('util/types', function () {
    describe('CallbackDataParams', function () {
        it('should allow accessing axis context properties without type assertions', function () {
            const params: CallbackDataParams = {
                componentType: 'series',
                componentSubType: 'line',
                componentIndex: 0,
                seriesType: 'line',
                seriesIndex: 0,
                seriesId: 'series_0',
                seriesName: 'Sales',
                name: 'Monday',
                dataIndex: 1,
                data: 120,
                value: 120,
                $vars: ['name', 'value'],
                axisDim: 'x',
                axisIndex: 0,
                axisType: 'xAxis.category',
                axisId: 'xAxis_0',
                axisValue: 'Monday',
                axisValueLabel: 'Monday'
            };

            expect(params.axisDim).toBe('x');
            expect(params.axisIndex).toBe(0);
            expect(params.axisType).toBe('xAxis.category');
            expect(params.axisId).toBe('xAxis_0');
            expect(params.axisValue).toBe('Monday');
            expect(params.axisValueLabel).toBe('Monday');

            // Formatter simulation using CallbackDataParams
            function formatTooltip(cbParams: CallbackDataParams): string {
                if (cbParams.axisValueLabel != null) {
                    return `${cbParams.axisValueLabel}: ${cbParams.value}`;
                }
                return `${cbParams.name}: ${cbParams.value}`;
            }

            expect(formatTooltip(params)).toBe('Monday: 120');
        });

        it('should allow numeric and timestamp axisValue in CallbackDataParams', function () {
            const numericAxisParams: CallbackDataParams = {
                componentType: 'series',
                componentSubType: 'line',
                componentIndex: 0,
                name: 'Data Point',
                dataIndex: 0,
                data: 20,
                value: 20,
                $vars: ['name', 'value'],
                axisDim: 'x',
                axisIndex: 0,
                axisType: 'xAxis.value',
                axisId: 'xAxis_0',
                axisValue: 20,
                axisValueLabel: '20'
            };

            const timeAxisParams: CallbackDataParams = {
                componentType: 'series',
                componentSubType: 'line',
                componentIndex: 0,
                name: 'Timestamp Point',
                dataIndex: 0,
                data: 100,
                value: 100,
                $vars: ['name', 'value'],
                axisDim: 'x',
                axisIndex: 0,
                axisType: 'xAxis.time',
                axisId: 'xAxis_0',
                axisValue: 1704153600000,
                axisValueLabel: '2024-01-02'
            };

            expect(numericAxisParams.axisValue).toBe(20);
            expect(numericAxisParams.axisType).toBe('xAxis.value');
            expect(timeAxisParams.axisValue).toBe(1704153600000);
            expect(timeAxisParams.axisType).toBe('xAxis.time');
        });
    });
});
