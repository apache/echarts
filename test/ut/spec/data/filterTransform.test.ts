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


describe('filter transform regular expressions', function () {
    beforeAll(function () {
        registerExternalTransform(filterTransform);
    });

    (['arrayRows', 'objectRows'] as const).forEach(function (sourceFormat) {
        describe(sourceFormat, function () {
            const rows: OptionSourceDataObjectRows = [
                { id: 'null-value', value: null },
                { id: 'undefined-value', value: undefined },
                { id: 'missing-value' },
                { id: 'literal-null', value: 'null' },
                { id: 'literal-undefined', value: 'undefined' },
                { id: 'number', value: 42 },
                { id: 'numeric-string', value: '42' },
                { id: 'other-string', value: 'other' }
            ];

            function makeData(items: OptionSourceDataObjectRows) {
                return sourceFormat === 'objectRows'
                    ? items
                    : items.map(function (row) { return [row.id, row.value]; });
            }

            function makeSource() {
                return createSource(makeData(rows), {
                    dimensions: ['id', 'value'], sourceHeader: false, seriesLayoutBy: 'column'
                }, sourceFormat);
            }

            function filter(config: DataTransformConfig) {
                return applyDataTransform(
                    { type: 'filter', config: config },
                    [makeSource()],
                    { datasetIndex: 1 }
                )[0].data;
            }

            [/^(null|undefined)$/, '^(null|undefined)$'].forEach(function (reg) {
                it('distinguishes missing values from their literal strings with ' + typeof reg, function () {
                    expect(filter({ dimension: 'value', reg: reg })).toEqual(makeData([
                        { id: 'literal-null', value: 'null' },
                        { id: 'literal-undefined', value: 'undefined' }
                    ]));
                });
            });

            [/^42$/, '^42$'].forEach(function (reg) {
                it('matches numbers and strings with ' + typeof reg, function () {
                    expect(filter({ dimension: 'value', reg: reg })).toEqual(makeData([
                        { id: 'number', value: 42 },
                        { id: 'numeric-string', value: '42' }
                    ]));
                });
            });

            it('preserves logical conditions and piped filters', function () {
                const result = applyDataTransform([
                    { type: 'filter', config: {
                        or: [
                            { dimension: 'value', reg: '^(null|undefined)$' },
                            { dimension: 'value', reg: /^42$/ }
                        ]
                    } },
                    { type: 'filter', config: {
                        and: [
                            { dimension: 'id', ne: 'number' },
                            { not: { dimension: 'value', eq: 'other' } }
                        ]
                    } }
                ], [makeSource()], { datasetIndex: 1 });

                expect(result[0].data).toEqual(makeData([
                    { id: 'literal-null', value: 'null' },
                    { id: 'literal-undefined', value: 'undefined' },
                    { id: 'numeric-string', value: '42' }
                ]));
            });
        });
    });
});
