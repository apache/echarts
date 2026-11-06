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
import { EChartsOption } from '../../../../src/export/option';


const RADIAN = Math.PI / 180;

interface SectorLayout {
    // The full span reserved for the sector, including its padAngle share.
    span: number;
    // The actually drawn sector angle (span minus padAngle).
    angle: number;
}

function getSectorLayouts(option: EChartsOption): SectorLayout[] {
    const chart = createChart({width: 400, height: 300});
    try {
        chart.setOption(option);
        const seriesModel = (chart as any).getModel().getSeriesByIndex(0);
        const data = seriesModel.getData();
        const layouts: SectorLayout[] = [];
        data.each(function (idx: number) {
            const layout = data.getItemLayout(idx);
            layouts.push({
                span: layout.angle / RADIAN,
                angle: Math.abs(layout.endAngle - layout.startAngle) / RADIAN
            });
        });
        return layouts;
    }
    finally {
        chart.dispose();
    }
}

function makePieOption(seriesOption: object): EChartsOption {
    return {
        animation: false,
        series: [Object.assign({
            type: 'pie',
            radius: ['30%', '60%'],
            data: []
        }, seriesOption)]
    } as EChartsOption;
}

function expectAngles(layouts: SectorLayout[], expectedAngles: number[], expectedSpans?: number[]) {
    expect(layouts.length).toEqual(expectedAngles.length);
    layouts.forEach(function (layout, idx) {
        expect(layout.angle).toBeCloseTo(expectedAngles[idx], 5);
        if (expectedSpans) {
            expect(layout.span).toBeCloseTo(expectedSpans[idx], 5);
        }
    });
}


describe('pie', function () {

    describe('padAngle and minAngle', function () {

        it('should proportion sector angles over the range left after reserving padAngle', function () {
            // Issue #20603: values 2 and 10 with padAngle 15.
            // 360 - 15 * 2 = 330 degrees are left for the sectors themselves,
            // so the sector angles should be 330 * 2 / 12 = 55 and 330 * 10 / 12 = 275.
            const layouts = getSectorLayouts(makePieOption({
                padAngle: 15,
                data: [{value: 2}, {value: 10}]
            }));
            expectAngles(layouts, [55, 275], [70, 290]);
        });

        it('should not shrink a sector to minAngle when its fair angle is larger (issue #20603)', function () {
            // Same configuration as the issue demo, with minAngle 45 set.
            // The fair angle of the first sector (55) is larger than minAngle,
            // so minAngle must not change anything.
            const layouts = getSectorLayouts(makePieOption({
                padAngle: 15,
                minAngle: 45,
                data: [{value: 2}, {value: 10}]
            }));
            expectAngles(layouts, [55, 275], [70, 290]);
        });

        it('should keep plain proportions when neither padAngle nor minAngle is set', function () {
            const layouts = getSectorLayouts(makePieOption({
                data: [{value: 2}, {value: 10}]
            }));
            expectAngles(layouts, [60, 300], [60, 300]);
        });

        it('should raise sectors below minAngle and redistribute the rest', function () {
            const layouts = getSectorLayouts(makePieOption({
                minAngle: 45,
                data: [{value: 1}, {value: 100}]
            }));
            expectAngles(layouts, [45, 315], [45, 315]);
        });

        it('should raise sectors below minAngle when padAngle is also set', function () {
            const layouts = getSectorLayouts(makePieOption({
                padAngle: 10,
                minAngle: 45,
                data: [{value: 1}, {value: 100}]
            }));
            expectAngles(layouts, [45, 295], [55, 305]);
        });

        it('should still respect minAngle for sectors pushed below it by redistribution', function () {
            // The fair angle of the second sector (about 88.2) is above minAngle 80,
            // but after the first sector is raised to minAngle its redistributed
            // angle would drop below 80, so it must be raised to minAngle as well.
            const layouts = getSectorLayouts(makePieOption({
                minAngle: 80,
                data: [{value: 8}, {value: 11.5}, {value: 30}]
            }));
            expectAngles(layouts, [80, 80, 200], [80, 80, 200]);
        });

        it('should average the angles when minAngle cannot be satisfied for all sectors', function () {
            const layouts = getSectorLayouts(makePieOption({
                minAngle: 150,
                data: [{value: 1}, {value: 1}, {value: 1}]
            }));
            expectAngles(layouts, [120, 120, 120], [120, 120, 120]);
        });

        it('should split evenly for zero sum data when stillShowZeroSum is set', function () {
            const layouts = getSectorLayouts(makePieOption({
                stillShowZeroSum: true,
                data: [{value: 0}, {value: 0}]
            }));
            expectAngles(layouts, [180, 180], [180, 180]);
        });

    });

});
