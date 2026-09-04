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

import { EChartsType } from '../../../../../src/echarts';
import { createChart, getECModel } from '../../../core/utHelper';
import {
    buildTooltipMarkup,
    TooltipMarkupStyleCreator
} from '../../../../../src/component/tooltip/tooltipMarkup';

describe('component/tooltip', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should pass radar indicator index to tooltip valueFormatter', function () {
        chart.setOption({
            animation: false,
            radar: {
                indicator: [
                    { name: 'Sales', max: 100 },
                    { name: 'Administration', max: 100 },
                    { name: 'Technology', max: 100 }
                ]
            },
            series: [{
                type: 'radar',
                data: [{
                    value: [60, 12, 0.8],
                    name: 'Allocated Budget'
                }]
            }]
        });

        const formatterDataIndexes: number[] = [];
        const seriesModel = getECModel(chart).getSeriesByIndex(0);
        const tooltipMarkup = seriesModel.formatTooltip(0, false, null) as any;
        tooltipMarkup.valueFormatter = function (value: unknown, dataIndex: number): string {
            formatterDataIndexes.push(dataIndex);
            return value + '';
        };

        buildTooltipMarkup(
            tooltipMarkup,
            new TooltipMarkupStyleCreator(),
            'html',
            null,
            false,
            {} as any
        );

        expect(formatterDataIndexes).toEqual([0, 1, 2]);
    });
});
