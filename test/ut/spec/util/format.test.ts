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

import { formatTpl, formatTplSimple, encodeHTML } from '@/src/util/format';
import { createChart } from '../../core/utHelper';

describe('template values', function () {
    const values = ['Price $&', 'Price $$', 'Price $\'', 'Price $`', '<b>$&</b>'];

    it('preserves replacement characters in series values', function () {
        for (const value of values) {
            for (const encode of [false, true]) {
                const text = encode ? encodeHTML(value) : value;
                expect(formatTpl('before {a} after', {
                    $vars: ['seriesName'], seriesName: value
                }, encode)).toBe('before ' + text + ' after');
            }
        }
    });

    it('preserves replacement characters in simple values', function () {
        for (const value of values) {
            for (const encode of [false, true]) {
                const text = encode ? encodeHTML(value) : value;
                expect(formatTplSimple('before {name} after', {name: value}, encode))
                    .toBe('before ' + text + ' after');
            }
        }
    });

    it('keeps indexed series and numeric values', function () {
        expect(formatTpl('{a0}: {c0}; {a1}: {c1}', [
            {$vars: ['seriesName', 'name', 'value'], seriesName: '$$', value: 12},
            {$vars: ['seriesName', 'name', 'value'], seriesName: '$&', value: 34}
        ])).toBe('$$: 12; $&: 34');
        expect(formatTplSimple('{value}', {value: 12})).toBe('12');
    });
});

describe('repeated template variables', function () {
    const $vars = ['seriesName', 'name', 'value'];

    it('replaces every occurrence of a variable', function () {
        const params = {$vars, seriesName: 'Sales', name: 'Mon', value: 120};
        expect(formatTpl('{b}: {c} | {b}: {c}', params)).toBe('Mon: 120 | Mon: 120');
        expect(formatTpl('{a} {a0} {a} {a0}', params)).toBe('Sales Sales Sales Sales');
        expect(formatTpl('<b>{b}</b> {b}', {$vars, seriesName: 'S', name: '<i>', value: 1}, true))
            .toBe('<b>&lt;i&gt;</b> &lt;i&gt;');
        expect(formatTpl('{b} {b}', {$vars, seriesName: 'S', name: 'Price $&', value: 1}))
            .toBe('Price $& Price $&');
    });

    it('replaces every occurrence of an indexed variable', function () {
        expect(formatTpl('{a0}={c0}, {a1}={c1}; {a0}={c0}, {a1}={c1}', [
            {$vars, seriesName: 'A', name: 'Mon', value: 1},
            {$vars, seriesName: 'B', name: 'Mon', value: 2}
        ])).toBe('A=1, B=2; A=1, B=2');
    });

    it('keeps unknown variables', function () {
        expect(formatTpl('{a} {d} {a2} {d}', {$vars: ['seriesName'], seriesName: 'S'}))
            .toBe('S {d} {a2} {d}');
    });

    it('replaces every occurrence of a simple key', function () {
        expect(formatTplSimple('{name}-{value}-{name}', {name: 'x', value: 1})).toBe('x-1-x');
    });

    it('replaces repeated variables in series label formatter', function () {
        const chart = createChart();
        try {
            chart.setOption({
                animation: false,
                xAxis: {type: 'category', data: ['Mon', 'Tue']},
                yAxis: {},
                series: [{
                    type: 'bar',
                    name: 'Sales',
                    data: [120, 200],
                    label: {show: true, formatter: '{b}: {c} | {b}: {c}'}
                }]
            });
            const series = (chart as any).getModel().getSeriesByIndex(0);
            expect(series.getFormattedLabel(0, 'normal')).toBe('Mon: 120 | Mon: 120');
            expect(series.getFormattedLabel(1, 'normal')).toBe('Tue: 200 | Tue: 200');
        }
        finally {
            chart.dispose();
        }
    });
});
