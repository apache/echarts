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

import { createSource } from '@/src/data/Source';
import { applyDataTransform, registerExternalTransform, DataTransformConfig } from '@/src/data/helper/transform';
import { filterTransform } from '@/src/component/transform/filterTransform';
import { OptionSourceDataObjectRows } from '@/src/util/types';
import { EChartsOption } from '@/src/export/option';
import { createChart, removeChart, getECModel } from '../../core/utHelper';


describe('filter transform regexp row state', function () {
    beforeAll(function () {
        registerExternalTransform(filterTransform);
    });

    (['arrayRows', 'objectRows'] as const).forEach(function (sourceFormat) {
        describe(sourceFormat, function () {
            function makeData(rows: OptionSourceDataObjectRows) {
                return sourceFormat === 'objectRows'
                    ? rows
                    : rows.map(function (row) { return [row.id, row.value]; });
            }

            function filter(rows: OptionSourceDataObjectRows, config: DataTransformConfig) {
                return applyDataTransform({ type: 'filter', config: config }, [
                    createSource(makeData(rows), {
                        dimensions: ['id', 'value'], sourceHeader: false, seriesLayoutBy: 'column'
                    }, sourceFormat)
                ], { datasetIndex: 1 })[0].data;
            }

            ['g', 'gi', 'y', 'iy'].forEach(function (flags) {
                it('keeps every repeated match on successive runs with ' + flags, function () {
                    const reg = new RegExp('alpha', flags);
                    const value = flags.indexOf('i') >= 0 ? 'ALPHA' : 'alpha';
                    const rows = [
                        { id: 'first', value: value },
                        { id: 'second', value: value },
                        { id: 'third', value: value }
                    ];
                    const config = { dimension: 'value', reg: reg };
                    for (let run = 0; run < 2; run++) {
                        expect(filter(rows, config)).toEqual(makeData(rows));
                        expect(reg.lastIndex).toBe(0);
                    }
                });
            });

            it('does not consume the caller regexp cursor', function () {
                const reg = /alpha/gi;
                reg.lastIndex = 2;
                const rows = [{ id: 'first', value: 'ALPHA' }, { id: 'second', value: 'ALPHA' }];
                expect(filter(rows, { dimension: 'value', reg: reg })).toEqual(makeData(rows));
                expect(reg.lastIndex).toBe(2);
            });

            it('preserves multiline and ignore-case matching, order and nonmatches', function () {
                const rows = [
                    { id: 'first', value: 'prefix\nALPHA\nsuffix' },
                    { id: 'nonmatch', value: 'beta' },
                    { id: 'second', value: 'prefix\nALPHA\nsuffix' },
                    { id: 'third', value: 'prefix\nALPHA\nsuffix' }
                ];
                expect(filter(rows, { dimension: 'value', reg: /^alpha$/gim })).toEqual(
                    makeData([rows[0], rows[2], rows[3]])
                );
            });

            it('preserves sticky matching at the start of each value', function () {
                const rows = [
                    { id: 'first', value: 'ALPHA tail' },
                    { id: 'nonmatch', value: 'prefix ALPHA' },
                    { id: 'second', value: 'ALPHA tail' },
                    { id: 'third', value: 'ALPHA tail' }
                ];
                expect(filter(rows, { dimension: 'value', reg: /alpha/iy })).toEqual(
                    makeData([rows[0], rows[2], rows[3]])
                );
            });

            it('works with logical conditions and a following filter', function () {
                const rows = [
                    { id: 'first', value: 'ALPHA' },
                    { id: 'second', value: 'ALPHA' },
                    { id: 'third', value: 'ALPHA' }
                ];
                const source = createSource(makeData(rows), {
                    dimensions: ['id', 'value'], sourceHeader: false, seriesLayoutBy: 'column'
                }, sourceFormat);
                const result = applyDataTransform([
                    { type: 'filter', config: { and: [
                        { dimension: 'value', reg: /alpha/gi },
                        { dimension: 'id', ne: 'blocked' }
                    ] } },
                    { type: 'filter', config: { not: { dimension: 'id', eq: 'third' } } }
                ], [source], { datasetIndex: 1 });
                expect(result[0].data).toEqual(makeData([rows[0], rows[1]]));
            });

            [/alpha/i, 'ALPHA'].forEach(function (reg) {
                it('preserves stateless regexp and string conditions with ' + typeof reg, function () {
                    const rows = [
                        { id: 'first', value: 'ALPHA' },
                        { id: 'nonmatch', value: 'beta' },
                        { id: 'second', value: 'ALPHA' }
                    ];
                    expect(filter(rows, { dimension: 'value', reg: reg })).toEqual(makeData([rows[0], rows[2]]));
                });
            });
        });
    });

    it('keeps all matches through setOption on successive updates', function () {
        const chart = createChart({ width: 200, height: 150 });
        const rows = [
            { id: 'first', value: 'ALPHA', amount: 1 },
            { id: 'second', value: 'ALPHA', amount: 2 },
            { id: 'third', value: 'ALPHA', amount: 3 }
        ];
        const option: EChartsOption = {
            animation: false,
            dataset: [
                { dimensions: ['id', 'value', 'amount'], source: rows },
                { transform: { type: 'filter', config: { dimension: 'value', reg: /alpha/gi } } }
            ],
            xAxis: { type: 'category' },
            yAxis: {},
            series: { type: 'bar', datasetIndex: 1, encode: { x: 'id', y: 'amount' } }
        };
        try {
            for (let run = 0; run < 2; run++) {
                chart.setOption(option, true);
                const data = getECModel(chart).getSeries()[0].getData();
                expect(data.count()).toBe(3);
                expect([0, 1, 2].map(function (idx) { return data.getRawDataItem(idx); })).toEqual(rows);
            }
        }
        finally {
            removeChart(chart);
        }
    });
});
