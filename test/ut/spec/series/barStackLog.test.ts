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

import { EChartsType } from '@/src/echarts.all';
import { createChart, getECModel } from '../../core/utHelper';
import SeriesModel from '@/src/model/Series';

describe('barStackLog', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function getItemLayout(seriesIndex: number, dataIndex: number) {
        const seriesModel = getECModel(chart).getSeriesByIndex(seriesIndex) as SeriesModel;
        return seriesModel.getData().getItemLayout(dataIndex);
    }

    it('should layout a bar stacked over a null value on a log axis', function () {
        // https://github.com/apache/echarts/issues/19517
        chart.setOption({
            animation: false,
            yAxis: {
                type: 'log'
            },
            xAxis: {
                type: 'category',
                data: ['First', 'Second']
            },
            series: [{
                type: 'bar',
                data: ['-', 2000],
                stack: 'main'
            }, {
                type: 'bar',
                data: [2500, 3000],
                stack: 'main'
            }]
        });

        // The bar of the second series at 'First' is stacked over a null
        // value. Its layout should be finite so that it gets rendered.
        const layout = getItemLayout(1, 0);
        expect(isFinite(layout.x)).toEqual(true);
        expect(isFinite(layout.y)).toEqual(true);
        expect(isFinite(layout.width)).toEqual(true);
        expect(isFinite(layout.height)).toEqual(true);

        // It should be drawn from the value axis start, like a bar that is
        // the first in its stack.
        const firstInStackLayout = getItemLayout(0, 1);
        expect(layout.y).toBeCloseTo(firstInStackLayout.y);
    });

    it('should layout a horizontal bar stacked over a null value on a log axis', function () {
        chart.setOption({
            animation: false,
            xAxis: {
                type: 'log'
            },
            yAxis: {
                type: 'category',
                data: ['First', 'Second']
            },
            series: [{
                type: 'bar',
                data: ['-', 2000],
                stack: 'main'
            }, {
                type: 'bar',
                data: [2500, 3000],
                stack: 'main'
            }]
        });

        const layout = getItemLayout(1, 0);
        expect(isFinite(layout.x)).toEqual(true);
        expect(isFinite(layout.y)).toEqual(true);
        expect(isFinite(layout.width)).toEqual(true);
        expect(isFinite(layout.height)).toEqual(true);

        const firstInStackLayout = getItemLayout(0, 1);
        expect(layout.x).toBeCloseTo(firstInStackLayout.x);
    });

    it('should not change the layout of stacked bars with all values present', function () {
        chart.setOption({
            animation: false,
            yAxis: {
                type: 'log'
            },
            xAxis: {
                type: 'category',
                data: ['First', 'Second']
            },
            series: [{
                type: 'bar',
                data: [1000, 2000],
                stack: 'main'
            }, {
                type: 'bar',
                data: [2500, 3000],
                stack: 'main'
            }]
        });

        // The base of the stacked-over bar should be at the coordinate of
        // the stacked-on value.
        const bottomLayout = getItemLayout(0, 0);
        const topLayout = getItemLayout(1, 0);
        expect(topLayout.y).toBeCloseTo(bottomLayout.y + bottomLayout.height);
    });
});
