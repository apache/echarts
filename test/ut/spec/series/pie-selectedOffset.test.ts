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
import { createChart } from '../../core/utHelper';

const FULL = [
    { name: 'A', value: 120 },
    { name: 'B', value: 80 },
    { name: 'C', value: 60 },
    { name: 'D', value: 40 },
    { name: 'E', value: 25 }
];

function pieOption(data: {name: string, value: number, selected?: boolean}[]) {
    return {
        series: [{
            type: 'pie' as const,
            selectedMode: 'multiple' as const,
            selectedOffset: 10,
            radius: '50%',
            data: data
        }]
    };
}

function flushStates(chart: EChartsType): Promise<void> {
    return new Promise(function (resolve) {
        setTimeout(function () {
            chart.getZr().animation.update();
            resolve();
        }, 400);
    });
}

function pieceOffsets(chart: EChartsType): {x: number, y: number}[] {
    const data = (chart as any).getModel().getSeriesByIndex(0).getData();
    const offsets: {x: number, y: number}[] = [];
    data.each(function (idx: number) {
        const el = data.getItemGraphicEl(idx);
        offsets.push({
            x: el ? el.x || 0 : 0,
            y: el ? el.y || 0 : 0
        });
    });
    return offsets;
}

describe('pie selectedOffset', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should clear selectedOffset translation after setOption replaces data', async function () {
        chart.setOption(pieOption(FULL));
        chart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            dataIndex: [0, 1]
        });
        await flushStates(chart);

        const selected = pieceOffsets(chart);
        expect(Math.hypot(selected[0].x, selected[0].y)).toBeGreaterThan(1);
        expect(Math.hypot(selected[1].x, selected[1].y)).toBeGreaterThan(1);

        chart.setOption(pieOption([
            { name: 'A', value: 30 },
            { name: 'B', value: 20 }
        ]), { notMerge: true });
        chart.resize();

        const replaced = pieceOffsets(chart);
        expect(replaced.length).toBe(2);
        replaced.forEach(function (offset) {
            expect(offset.x).toBeCloseTo(0);
            expect(offset.y).toBeCloseTo(0);
        });
    });

    it('should still offset a slice that stays selected', async function () {
        chart.setOption(pieOption(FULL));
        chart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            dataIndex: 0
        });
        await flushStates(chart);

        chart.setOption(pieOption([
            { name: 'A', value: 30, selected: true },
            { name: 'C', value: 10 }
        ]), { notMerge: true });
        chart.resize();

        const offsets = pieceOffsets(chart);
        expect(Math.hypot(offsets[0].x, offsets[0].y)).toBeGreaterThan(1);
        expect(offsets[1].x).toBeCloseTo(0);
        expect(offsets[1].y).toBeCloseTo(0);

        chart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            dataIndex: 1
        });
        await flushStates(chart);
        const afterSelect = pieceOffsets(chart);
        expect(Math.hypot(afterSelect[1].x, afterSelect[1].y)).toBeGreaterThan(1);
    });
});
