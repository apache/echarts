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
import SeriesModel from '@/src/model/Series';
import { createChart, getECModel } from '../../core/utHelper';

type LabelLineLayout = {
    side: 'left' | 'right'
    labelX: number
    linePoints: number[][]
};


describe('pie', function () {

    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            width: 600,
            height: 400
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    function getLabelLineLayouts(position: 'outer' | 'outside'): LabelLineLayout[] {
        chart.setOption({
            animation: false,
            series: [{
                type: 'pie',
                radius: 120,
                center: ['50%', '50%'],
                label: {
                    show: true,
                    position: position,
                    alignTo: 'labelLine',
                    distanceToLabelLine: 5
                },
                labelLine: {
                    show: true,
                    length: 20,
                    length2: 20
                },
                data: [
                    { value: 3, name: 'Alpha' },
                    { value: 2, name: 'Bravo' },
                    { value: 4, name: 'Charlie' },
                    { value: 3, name: 'Delta' },
                    { value: 5, name: 'Echo' },
                    { value: 2, name: 'Foxtrot' }
                ]
            }]
        }, true);

        const seriesModel = getECModel(chart).getComponent('series', 0) as SeriesModel;
        const data = seriesModel.getData();
        const cx = data.getLayout('cx') as number;
        const layouts: LabelLineLayout[] = [];

        data.each(function (idx) {
            const sector = data.getItemGraphicEl(idx) as any;
            const label = sector.getTextContent();
            const labelLine = sector.getTextGuideLine();
            layouts.push({
                side: label.x < cx ? 'left' : 'right',
                labelX: label.x,
                linePoints: (labelLine.shape.points as number[][]).map(function (point) {
                    return [point[0], point[1]];
                })
            });
        });

        return layouts;
    }

    it('aligns labelLine labels for outside position alias', function () {
        const outerLayouts = getLabelLineLayouts('outer');
        const outsideLayouts = getLabelLineLayouts('outside');

        expect(outsideLayouts).toEqual(outerLayouts);

        ['left', 'right'].forEach(function (side) {
            const sideLayouts = outsideLayouts.filter(function (layout) {
                return layout.side === side;
            });

            expect(sideLayouts.length).toBeGreaterThan(1);
            sideLayouts.forEach(function (layout) {
                expect(layout.labelX).toEqual(sideLayouts[0].labelX);
            });
        });
    });
});
