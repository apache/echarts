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

import { createChart } from '../../core/utHelper';

describe('pie-label', function () {
    it('should not inflate label background width when both backgroundColor and lineHeight are set with overflow break', function () {
        const chart = createChart({ width: 800, height: 600 });

        chart.setOption({
            animation: false,
            series: [{
                type: 'pie',
                radius: '60%',
                center: ['50%', '50%'],
                data: [
                    { value: 40, name: '这是一段需要自动换行的超长文本标签' },
                    { value: 30, name: '另一段长文本标签内容' },
                    { value: 20, name: '短文本' }
                ],
                label: {
                    show: true,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    overflow: 'break',
                    lineHeight: 40,
                    padding: [5, 10, 5, 10],
                    fontSize: 14
                },
                labelLayout: {
                    hideOverlap: false
                }
            }]
        });

        const model = (chart as any).getModel();
        const series = model.getSeriesByIndex(0);
        expect(series).not.toBeNull();

        // Force layout to complete.
        chart.getZr().refreshImmediately();

        // Verify that each label's bounding rect width is constrained to the
        // label text, not inflated to the full available width by the lineHeight
        // background rect. The chart is 800px wide, so a correctly-sized label
        // background should be well under 400px.
        const data = series.getData();
        data.each(function (idx) {
            const sector = data.getItemGraphicEl(idx);
            const label = sector && sector.getTextContent();
            if (label) {
                const rect = label.getBoundingRect();
                expect(rect.width).toBeLessThan(400);
            }
        });
    });
});