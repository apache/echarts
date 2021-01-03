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

import { EChartsType } from '../../../../src/echarts';
import { createChart, removeChart, getECModel } from '../../core/utHelper';
import { EChartsFullOption } from '../../../../src/option';
import { retrieveRawValue } from '../../../../src/data/helper/dataProvider';


describe('dataTransform', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 200,
            height: 150
        });
    });

    afterEach(function () {
        removeChart(chart);
    });

    function makeDatasetSourceDetection() {
        return [
            ['product', '2012', '2013', '2014', '2015'],
            ['AAA', 41.1, 30.4, 65.1, 53.3],
            ['BBB', 86.5, 92.1, 85.7, 83.1],
            ['CCC', 24.1, 67.2, 79.5, 86.4]
        ];
    }

    function makeDatasetSourceNonDetectionByRow() {
        return {
            dimensions: ['2012', '2013', '2014', '2015'],
            source: [
                [41.1, 30.4, 65.1, 53.3],
                [86.5, 92.1, 85.7, 83.1],
                [24.1, 67.2, 79.5, 86.4]
            ]
        };
    }

    it('forbid_seriesLayoutBy_row', function () {
        const option: EChartsFullOption = {
            dataset: [{
                source: makeDatasetSourceDetection(),
                // This config should cause error thrown.
                seriesLayoutBy: 'row'
            }, {
                transform: { type: 'filter', config: { dimension: 0, ne: '' } }
            }],
            xAxis: { type: 'category' },
            yAxis: {},
            series: { type: 'bar', datasetIndex: 1 }
        };

        expect(() => {
            chart.setOption(option);
        }).toThrowError(/column/);
    });

    it('seriesLayoutBy_changed_no_transform', function () {
        const option: EChartsFullOption = {
            dataset: {
                source: makeDatasetSourceDetection()
            },
            xAxis: { type: 'category' },
            yAxis: {},
            series: { type: 'bar', seriesLayoutBy: 'row' }
        };

        chart.setOption(option);
        const listData = getECModel(chart).getSeries()[0].getData();
        expect(listData.getDimension(1)).toEqual('AAA');
        expect(listData.getDimension(2)).toEqual('BBB');
        expect(listData.getDimension(3)).toEqual('CCC');
    });

    [{
        transform:
            { type: 'filter', config: { dimension: 'product', '!=': 'XXX' } }
    }, {
        transform: [
            { type: 'filter', config: { dimension: 'product', '!=': 'XXX' } },
            { type: 'filter', config: { dimension: 'product', '!=': 'XXX' } }
        ]
    }].forEach((dataset1, itIdx) => {
        it(`seriesLayoutBy_changed_transform_detection_${itIdx}`, function () {
            const option: EChartsFullOption = {
                dataset: [{
                    source: makeDatasetSourceDetection()
                }, dataset1],
                xAxis: { type: 'category' },
                yAxis: {},
                series: { type: 'bar', datasetIndex: 1, seriesLayoutBy: 'row' }
            };

            chart.setOption(option);
            const listData = getECModel(chart).getSeries()[0].getData();
            expect(listData.getDimension(1)).toEqual('AAA');
            expect(listData.getDimension(2)).toEqual('BBB');
            expect(listData.getDimension(3)).toEqual('CCC');
            expect(listData.get('product', 0)).toEqual(0);
            expect(retrieveRawValue(listData, 0, 'product')).toEqual('2012');
            expect(listData.get('product', 1)).toEqual(1);
            expect(retrieveRawValue(listData, 1, 'product')).toEqual('2013');
        });
    });

    [{
        transform:
            { type: 'filter', config: { dimension: 0, '!=': 'XXX' } }
    }, {
        transform: [
            { type: 'filter', config: { dimension: 0, '!=': 'XXX' } },
            { type: 'filter', config: { dimension: 0, '!=': 'XXX' } }
        ]
    }].forEach((dataset1, itIdx) => {
        it(`seriesLayoutBy_changed_transform_non_detection_${itIdx}`, function () {
            const sourceWrap = makeDatasetSourceNonDetectionByRow();
            const option: EChartsFullOption = {
                dataset: [{
                    dimensions: sourceWrap.dimensions,
                    source: sourceWrap.source
                }, dataset1],
                xAxis: {},
                yAxis: {},
                series: { type: 'bar', datasetIndex: 1, seriesLayoutBy: 'row' }
            };

            chart.setOption(option);
            const listData = getECModel(chart).getSeries()[0].getData();
            expect(listData.get(listData.getDimension(0), 0)).toEqual(41.1);
            expect(listData.get(listData.getDimension(0), 1)).toEqual(30.4);
        });
    });

    [{
        transform:
            { type: 'filter', config: { dimension: '2012', '!=': 'XXX' } }
    }, {
        transform: [
            { type: 'filter', config: { dimension: '2012', '!=': 'XXX' } },
            { type: 'filter', config: { dimension: '2012', '!=': 'XXX' } }
        ]
    }].forEach((dataset1, itIdx) => {
        it(`inherit_detected_dimensions_${itIdx}`, function () {
            const option: EChartsFullOption = {
                dataset: [{
                    source: makeDatasetSourceDetection()
                }, dataset1],
                xAxis: { type: 'category' },
                yAxis: {},
                series: { type: 'bar', datasetIndex: 1 }
            };

            chart.setOption(option);
            const listData = getECModel(chart).getSeries()[0].getData();
            expect(listData.getDimension(0)).toEqual('product');
            expect(listData.getDimension(1)).toEqual('2012');
            expect(listData.getDimension(2)).toEqual('2013');
        });
    });


});

