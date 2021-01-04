
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

import { findEffectedDataZooms } from '../../../../../src/component/dataZoom/helper';
import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';



describe('dataZoom/helper', function () {

    describe('findLinkedNodes', function () {

        let chart: EChartsType;
        beforeEach(function () {
            chart = createChart();
        });

        afterEach(function () {
            chart.dispose();
        });

        it('findLinkedNodes_base', function () {
            chart.setOption({
                xAxis: [{}, {}, {}, {}, {}, {}],
                yAxis: [{}, {}, {}, {}, {}, {}],
                dataZoom: [
                    { id: 'dz0', xAxisIndex: [1, 2], yAxisIndex: [0] },
                    { id: 'dz1', xAxisIndex: [3], yAxisIndex: [1] },
                    { id: 'dz2', xAxisIndex: [5], yAxisIndex: [] },
                    { id: 'dz3', xAxisIndex: [2, 5], yAxisIndex: [] }
                ]
            });

            const payload = { type: 'dataZoom', dataZoomIndex: 0 };
            const dzModels = findEffectedDataZooms(getECModel(chart), payload);

            expect(dzModels.length === 3);
            expect(dzModels[0] === getECModel(chart).getComponent('dataZoom', 0)).toEqual(true);
            expect(dzModels[1] === getECModel(chart).getComponent('dataZoom', 3)).toEqual(true);
            expect(dzModels[2] === getECModel(chart).getComponent('dataZoom', 2)).toEqual(true);
        });

        it('findLinkedNodes_crossXY', function () {
            chart.setOption({
                xAxis: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
                yAxis: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
                dataZoom: [
                    { id: 'dz0', xAxisIndex: [1, 2], yAxisIndex: [0] },
                    { id: 'dz1', xAxisIndex: [3], yAxisIndex: [3, 0] },
                    { id: 'dz2', xAxisIndex: [6, 3], yAxisIndex: [9] },
                    { id: 'dz3', xAxisIndex: [5, 3], yAxisIndex: [] },
                    { id: 'dz4', xAxisIndex: [8], yAxisIndex: [4] }
                ]
            });

            const payload = { type: 'dataZoom', dataZoomIndex: 0 };
            const dzModels = findEffectedDataZooms(getECModel(chart), payload);

            expect(dzModels.length === 4);
            expect(dzModels[0] === getECModel(chart).getComponent('dataZoom', 0)).toEqual(true);
            expect(dzModels[1] === getECModel(chart).getComponent('dataZoom', 1)).toEqual(true);
            expect(dzModels[2] === getECModel(chart).getComponent('dataZoom', 2)).toEqual(true);
            expect(dzModels[3] === getECModel(chart).getComponent('dataZoom', 3)).toEqual(true);
        });

        it('findLinkedNodes_emptySourceModel', function () {
            chart.setOption({
                xAxis: [{}, {}, {}, {}, {}, {}, {}, {}, {}],
                yAxis: [{}, {}, {}, {}, {}, {}, {}, {}, {}],
                dataZoom: [
                    { id: 'dz0', xAxisIndex: [1, 2], yAxisIndex: [0] },
                    { id: 'dz1', xAxisIndex: [3], yAxisIndex: [3, 0] },
                    { id: 'dz2', xAxisIndex: [6, 3], yAxisIndex: [9] },
                    { id: 'dz3', xAxisIndex: [5, 3], yAxisIndex: [] },
                    { id: 'dz4', xAxisIndex: [8], yAxisIndex: [4] }
                ]
            });

            const payload = { type: 'other' };
            const dzModels = findEffectedDataZooms(getECModel(chart), payload);

            expect(dzModels.length === 0);
        });

    });

});