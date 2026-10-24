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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import MarkerModel from '../../../../../src/component/marker/MarkerModel';

describe('markPoint#coordValue', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getMarkPointData() {
        const ecModel = getECModel(chart);
        const seriesModel = ecModel.getSeriesByIndex(0);
        const mpModel = MarkerModel.getMarkerModelFromSeries(seriesModel as any, 'markPoint');
        return mpModel ? mpModel.getData() : null;
    }

    it('formatter_params_carry_the_value_for_a_coord_markPoint_on_a_time_axis', function () {
        // https://github.com/apache/echarts/issues/20410
        const capturedParams: any[] = [];
        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{
                type: 'line',
                data: [
                    ['2024-01-01', 100],
                    ['2024-01-02', 200],
                    ['2024-01-03', 300]
                ],
                markPoint: {
                    label: {
                        formatter: function (params: any) {
                            capturedParams.push(JSON.parse(JSON.stringify(params)));
                            return '{c}';
                        }
                    },
                    data: [{
                        coord: ['2024-01-02', 200]
                    }]
                }
            }]
        });

        expect(capturedParams.length).toEqual(1);
        const params = capturedParams[0];
        // `{c}` interpolates params.value; it must carry the coord value,
        // not undefined.
        expect(params.value).toBeDefined();
    });

    it('defaultedLabel_dims_carry_the_value_for_coord_markPoint', function () {
        chart.setOption({
            xAxis: { type: 'time' },
            yAxis: {},
            series: [{
                type: 'line',
                data: [
                    ['2024-01-01', 100],
                    ['2024-01-02', 200],
                    ['2024-01-03', 300]
                ],
                markPoint: {
                    data: [{
                        coord: ['2024-01-02', 200]
                    }]
                }
            }]
        });

        const mpData = getMarkPointData();
        expect(mpData).toBeTruthy();
        expect(mpData.count()).toEqual(1);

        const labelDims = mpData.mapDimensionsAll('defaultedLabel');
        const vals = labelDims.map((dim: string) => mpData.get(dim, 0));
        expect(vals.length).toBeGreaterThan(0);
        expect(vals).not.toContain(undefined);
    });
});
