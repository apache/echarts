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
import { createChart, getECModel } from '../../core/utHelper';
import SeriesModel from '@/src/model/Series';


describe('getDataParams_null_guard', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getSeries(chart: EChartsType, seriesIndex: number): SeriesModel {
        return getECModel(chart).getComponent('series', seriesIndex) as SeriesModel;
    }

    it('should_not_throw_when_getData_returns_null_on_pie', function () {
        chart.setOption({
            series: [{
                type: 'pie',
                data: [
                    { value: 100, name: 'A' },
                    { value: 200, name: 'B' }
                ]
            }]
        });

        const seriesModel = getSeries(chart, 0);
        expect(seriesModel).toBeTruthy();

        // Simulate disposed state: replace getData to return null
        const originalGetData = seriesModel.getData.bind(seriesModel);
        seriesModel.getData = function () {
            return null as any;
        };

        // Should not throw — returns empty params
        expect(function () {
            seriesModel.getDataParams(0);
        }).not.toThrow();

        const params = seriesModel.getDataParams(0);
        expect(params).toBeDefined();

        // Restore
        seriesModel.getData = originalGetData;
    });

    it('should_not_throw_when_getData_returns_null_on_treemap', function () {
        chart.setOption({
            series: [{
                type: 'treemap',
                data: [
                    { value: 100, name: 'A' },
                    { value: 200, name: 'B' }
                ]
            }]
        });

        const seriesModel = getSeries(chart, 0);
        expect(seriesModel).toBeTruthy();

        const originalGetData = seriesModel.getData.bind(seriesModel);
        seriesModel.getData = function () {
            return null as any;
        };

        expect(function () {
            seriesModel.getDataParams(0);
        }).not.toThrow();

        seriesModel.getData = originalGetData;
    });

    it('should_not_throw_when_getData_returns_null_on_funnel', function () {
        chart.setOption({
            series: [{
                type: 'funnel',
                data: [
                    { value: 100, name: 'A' },
                    { value: 200, name: 'B' }
                ]
            }]
        });

        const seriesModel = getSeries(chart, 0);
        expect(seriesModel).toBeTruthy();

        const originalGetData = seriesModel.getData.bind(seriesModel);
        seriesModel.getData = function () {
            return null as any;
        };

        expect(function () {
            seriesModel.getDataParams(0);
        }).not.toThrow();

        seriesModel.getData = originalGetData;
    });

    it('should_not_throw_when_getData_returns_null_on_sunburst', function () {
        chart.setOption({
            series: [{
                type: 'sunburst',
                data: [
                    { value: 100, name: 'A' },
                    { value: 200, name: 'B' }
                ]
            }]
        });

        const seriesModel = getSeries(chart, 0);
        expect(seriesModel).toBeTruthy();

        const originalGetData = seriesModel.getData.bind(seriesModel);
        seriesModel.getData = function () {
            return null as any;
        };

        expect(function () {
            seriesModel.getDataParams(0);
        }).not.toThrow();

        seriesModel.getData = originalGetData;
    });

    it('should_not_throw_when_getData_returns_null_on_tree', function () {
        chart.setOption({
            series: [{
                type: 'tree',
                data: [{
                    name: 'root',
                    children: [
                        { name: 'A', value: 100 },
                        { name: 'B', value: 200 }
                    ]
                }]
            }]
        });

        const seriesModel = getSeries(chart, 0);
        expect(seriesModel).toBeTruthy();

        const originalGetData = seriesModel.getData.bind(seriesModel);
        seriesModel.getData = function () {
            return null as any;
        };

        expect(function () {
            seriesModel.getDataParams(0);
        }).not.toThrow();

        seriesModel.getData = originalGetData;
    });

});
