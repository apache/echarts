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
import { createChart } from '../../core/utHelper';

describe('aria label text', function () {
    let chart: EChartsType;

    afterEach(function () {
        chart.dispose();
    });

    ['EN', 'ZH'].forEach(locale => {
        describe(locale, function () {
            beforeEach(function () {
                chart = createChart({ opts: { locale } });
            });

            it.each(['$&', '$$', '$`', '$\'', 'ordinary text'])('preserves %s in names and titles', text => {
                const title = 'Title ' + text;
                const seriesName = 'Series ' + text;
                const itemName = 'Item ' + text;
                chart.setOption({
                    animation: false,
                    title: { text: title },
                    aria: { enabled: true },
                    series: [{
                        type: 'pie',
                        name: seriesName,
                        data: [{ name: itemName, value: 42 }]
                    }]
                });

                const expected = locale === 'EN'
                    ? 'This is a chart about "' + title + '" with type Pie chart named '
                        + seriesName + '.The data is as follows: the data for ' + itemName + ' is 42. '
                    : '这是一个关于“' + title + '”的图表。图表类型是饼图，表示'
                        + seriesName + '。其数据是——' + itemName + '的数据是42。';
                expect(chart.getDom().getAttribute('aria-label')).toBe(expected);
            });
        });
    });

    it('replaces repeated and whitespace-padded placeholders, including numeric values', function () {
        chart = createChart({ opts: { locale: 'EN' } });
        chart.setOption({
            animation: false,
            title: { text: 'Title $&' },
            aria: {
                enabled: true,
                label: {
                    general: { withTitle: '{title}|{ title }' },
                    series: {
                        multiple: {
                            prefix: '|{seriesCount}|{ seriesCount }|',
                            withName: '{seriesId}:{ seriesId }:{seriesName}:{ seriesName }:',
                            separator: { middle: ';', end: '.' }
                        }
                    },
                    data: {
                        allData: '',
                        withName: '{name}:{ name }:{value}:{ value }',
                        separator: { middle: ',', end: '' }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Series $$',
                data: [{ name: 'Item $`', value: 0 }]
            }, {
                type: 'pie',
                name: 'Series $\'',
                data: [{ name: 'Item $&', value: 42 }]
            }]
        });

        expect(chart.getDom().getAttribute('aria-label')).toBe(
            'Title $&|Title $&|2|2|'
            + '0:0:Series $$:Series $$:Item $`:Item $`:0:0;'
            + '1:1:Series $\':Series $\':Item $&:Item $&:42:42.'
        );
    });
});
