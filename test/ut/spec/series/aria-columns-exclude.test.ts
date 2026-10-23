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

// Introduced in #20218
describe('aria, omit data', function () {
    let chart: EChartsType;
    const option = {
        aria: {
            enabled: true,
            label: {
                data: {
                    excludeDimensionId: [0, 1, 2]
                }
            }
        },
        dataset: [
            {
                dimensions: [
                    'lng',
                    'lat',
                    'name',
                    'value',
                    'capacity',
                ],
                source: [
                    [
                        1.58285827,
                        42.099784969,
                        'Llosa del Cavall (Navès)',
                        17.945,
                        80,
                    ],
                    [
                        0.960270444,
                        41.134931354,
                        'Riudecanyes',
                        0.401,
                        5.32,
                    ],
                ]

            }
        ],
        series: [
            {
                coordinateSystem: 'geo',
                encode: {
                    itemName: 'name'
                },
                type: 'scatter',
            }
        ],
    };
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('specified columns should be omitted from Aria (geolocation and name)', () => {
        chart.setOption(option);
        const el = chart.getDom();
        const ariaValue = el.getAttribute('aria-label');
        expect(ariaValue).toContain('Llosa del Cavall (Navès) is 17.945, 80');
        expect(ariaValue).toContain('Riudecanyes is 0.401, 5.32');
        expect(ariaValue).not.toContain(1.58285827);
        expect(ariaValue).not.toContain(42.099784969);
        expect(ariaValue).not.toContain(0.960270444);
        expect(ariaValue).not.toContain(41.134931354);
    });

    it('should not modify the data of the chart', async () => {
        chart.setOption(option);
        const listData = getECModel(chart).getSeries()[0].getData();
        expect(listData.getValues(0)).toEqual([1.58285827, 42.099784969, 'Llosa del Cavall (Navès)', 17.945, 80]);
        expect(listData.getValues(1)).toEqual([0.960270444, 41.134931354, 'Riudecanyes', 0.401, 5.32]);
    });

});

describe('aria label lifecycle', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    function enableLabel(description = 'Generated description') {
        chart.setOption({ aria: { enabled: true, label: { enabled: true, description } } });
    }

    it.each(['aria', 'label', 'notMerge'])('removes generated attributes after disabling %s', function (mode) {
        enableLabel();
        const dom = chart.getDom();
        expect(dom.getAttribute('role')).toBe('img');
        expect(dom.getAttribute('aria-label')).toBe('Generated description');

        if (mode === 'aria') {
            chart.setOption({ aria: { enabled: false } });
        }
        else if (mode === 'label') {
            chart.setOption({ aria: { label: { enabled: false } } });
        }
        else {
            chart.setOption({}, { notMerge: true });
        }

        expect(dom.hasAttribute('role')).toBe(false);
        expect(dom.hasAttribute('aria-label')).toBe(false);
    });

    it('removes an automatically generated series description when disabled', function () {
        chart.setOption({
            aria: { enabled: true },
            series: [{ type: 'pie', data: [{ name: 'Item', value: 1 }] }]
        });
        const dom = chart.getDom();
        expect(dom.getAttribute('aria-label')).toContain('Item');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.hasAttribute('role')).toBe(false);
        expect(dom.hasAttribute('aria-label')).toBe(false);
    });

    it('restores host attributes that existed before generation', function () {
        const dom = chart.getDom();
        dom.setAttribute('role', 'application');
        dom.setAttribute('aria-label', 'Host description');
        enableLabel();
        enableLabel('Updated generated description');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.getAttribute('role')).toBe('application');
        expect(dom.getAttribute('aria-label')).toBe('Host description');
    });

    it('leaves host attributes alone when ECharts never generated a label', function () {
        const dom = chart.getDom();
        dom.setAttribute('role', 'application');
        dom.setAttribute('aria-label', 'Host description');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.getAttribute('role')).toBe('application');
        expect(dom.getAttribute('aria-label')).toBe('Host description');
    });

    it('preserves an application override while removing the other generated attribute', function () {
        const dom = chart.getDom();
        enableLabel();
        dom.setAttribute('role', 'group');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.getAttribute('role')).toBe('group');
        expect(dom.hasAttribute('aria-label')).toBe(false);
    });

    it('preserves host changes made after label generation', function () {
        const dom = chart.getDom();
        enableLabel();
        dom.setAttribute('role', 'group');
        dom.setAttribute('aria-label', 'Replacement host description');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.getAttribute('role')).toBe('group');
        expect(dom.getAttribute('aria-label')).toBe('Replacement host description');
    });

    it('restores host changes captured by a later generated update', function () {
        const dom = chart.getDom();
        enableLabel();
        dom.setAttribute('role', 'group');
        dom.setAttribute('aria-label', 'Replacement host description');
        enableLabel('Updated generated description');
        chart.setOption({}, { notMerge: true });
        expect(dom.getAttribute('role')).toBe('group');
        expect(dom.getAttribute('aria-label')).toBe('Replacement host description');
    });

    it('generates the current label again after re-enabling', function () {
        const dom = chart.getDom();
        enableLabel();
        chart.setOption({ aria: { label: { enabled: false } } });
        enableLabel('Current description');
        expect(dom.getAttribute('role')).toBe('img');
        expect(dom.getAttribute('aria-label')).toBe('Current description');
        chart.setOption({ aria: { enabled: false } });
        expect(dom.hasAttribute('role')).toBe(false);
        expect(dom.hasAttribute('aria-label')).toBe(false);
    });
});
