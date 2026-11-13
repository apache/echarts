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

import { createChart, getGraphicElements } from '../../../core/utHelper';
import { EChartsType } from '@/src/echarts';
import Element from 'zrender/src/Element';

const AXIS_NAME = 'Axis name';
const CATEGORIES = [
    'A very long category label 0001',
    'A very long category label 0002',
    'A very long category label 0003',
    'A very long category label 0004'
];

type NameOffset = number | [number, number] | string;

function renderChart(option: {
    nameOffset?: NameOffset;
    nameGap?: number;
    nameMoveOverlap?: boolean;
    nameRotate?: number;
} = {}): EChartsType {
    const chart = createChart({
        width: 500,
        height: 400,
        opts: {renderer: 'svg'}
    });
    chart.setOption({
        animation: false,
        grid: {left: 180, right: 40, top: 30, bottom: 80},
        xAxis: {
            type: 'category',
            data: CATEGORIES,
            axisLabel: {rotate: 30}
        },
        yAxis: {
            type: 'value',
            name: AXIS_NAME,
            nameLocation: 'middle',
            nameGap: option.nameGap == null ? 10 : option.nameGap,
            nameMoveOverlap: option.nameMoveOverlap == null ? true : option.nameMoveOverlap,
            nameRotate: option.nameRotate,
            nameOffset: option.nameOffset as number | [number, number],
            axisLabel: {
                formatter: (value: number) => (value + ' very long label ').repeat(5)
            }
        },
        series: [{type: 'line', data: [10, 20, 30, 40]}]
    });
    return chart;
}

function getAxisNamePosition(chart: EChartsType): [number, number] {
    const elements = getGraphicElements(chart, 'yAxis');
    let nameElement: Element | undefined;
    for (let idx = 0; idx < elements.length; idx++) {
        const element = elements[idx];
        if (element.type === 'text' && (element as any).style.text === AXIS_NAME) {
            nameElement = element;
            break;
        }
    }
    if (!nameElement) {
        throw new Error('Axis name element not found');
    }
    const transform = nameElement.getComputedTransform();
    return [transform[4], transform[5]];
}

function withChart<T>(option: Parameters<typeof renderChart>[0], fn: (pos: [number, number]) => T): T {
    const chart = renderChart(option);
    try {
        return fn(getAxisNamePosition(chart));
    }
    finally {
        chart.dispose();
    }
}

function expectShift(actual: [number, number], base: [number, number], dx: number, dy: number): void {
    expect(actual[0] - base[0]).toBeCloseTo(dx);
    expect(actual[1] - base[1]).toBeCloseTo(dy);
}

describe('axis nameOffset', function () {
    it('moves along the outward direction after overlap resolution', function () {
        const base = withChart({nameOffset: 0}, pos => pos);
        const outward = withChart({nameOffset: 15}, pos => pos);
        const inward = withChart({nameOffset: -10}, pos => pos);

        expect(Math.hypot(outward[0] - base[0], outward[1] - base[1])).toBeCloseTo(15);
        expect(Math.hypot(inward[0] - base[0], inward[1] - base[1])).toBeCloseTo(10);
        expect(outward[0] - base[0]).toBeCloseTo(-(inward[0] - base[0]) * 1.5);
        expect(outward[1] - base[1]).toBeCloseTo(-(inward[1] - base[1]) * 1.5);
    });

    it('applies the offset after nameGap even when overlap absorbs the gap', function () {
        const baseSmallGap = withChart({nameGap: 10, nameOffset: 0}, pos => pos);
        const baseLargeGap = withChart({nameGap: 40, nameOffset: 0}, pos => pos);
        const offsetSmallGap = withChart({nameGap: 10, nameOffset: 15}, pos => pos);
        const offsetLargeGap = withChart({nameGap: 40, nameOffset: 15}, pos => pos);

        expect(baseLargeGap[0]).toBeCloseTo(baseSmallGap[0]);
        expect(baseLargeGap[1]).toBeCloseTo(baseSmallGap[1]);
        expect(Math.hypot(
            offsetSmallGap[0] - baseSmallGap[0],
            offsetSmallGap[1] - baseSmallGap[1]
        )).toBeCloseTo(15);
        expectShift(
            offsetLargeGap,
            baseLargeGap,
            offsetSmallGap[0] - baseSmallGap[0],
            offsetSmallGap[1] - baseSmallGap[1]
        );
    });

    it('applies tuple offsets in screen coordinates independent of nameRotate', function () {
        const base = withChart({nameOffset: 0, nameRotate: 30}, pos => pos);
        const offset = withChart({nameOffset: [10, -5], nameRotate: 30}, pos => pos);

        expectShift(offset, base, 10, -5);
    });

    it.each([
        'abc',
        NaN,
        [1]
    ])('treats invalid nameOffset %p as zero', function (nameOffset) {
        const base = withChart({nameOffset: 0}, pos => pos);
        const invalid = withChart({nameOffset: nameOffset as NameOffset}, pos => pos);

        expectShift(invalid, base, 0, 0);
    });

    it('adds the offset to the nameGap position when overlap movement is disabled', function () {
        const base = withChart({nameMoveOverlap: false, nameGap: 10, nameOffset: 0}, pos => pos);
        const offset = withChart({nameMoveOverlap: false, nameGap: 10, nameOffset: 20}, pos => pos);

        expect(Math.hypot(offset[0] - base[0], offset[1] - base[1])).toBeCloseTo(20);
    });
});
