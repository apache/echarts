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

import PathProxy from 'zrender/src/core/PathProxy';
import { ECPolygon, ECPolyline } from '@/src/chart/line/poly';
import { createChart } from '../../../core/utHelper';

const points = [0, 0, 30, 80, 60, 10, 90, 70, 120, 5];
const seamAt = 2;

interface CubicBezierSegment {
    x0: number
    y0: number
    cpx1: number
    cpy1: number
    cpx2: number
    cpy2: number
    x1: number
    y1: number
}

describe('chart/line/smoothBreak', function () {

    it('restarts Bézier smoothing at the seam without lifting the pen', function () {
        const seamed = readPath(polyline(points, [false, false, true, false, false]));
        const left = readCubics(polyline(points.slice(0, (seamAt + 1) * 2), null));
        const right = readCubics(polyline(points.slice(seamAt * 2), null));
        const plain = readCubics(polyline(points, null));

        expect(seamed.moves).toBe(1);
        expect(seamed.cubics.length).toBe(left.length + right.length);
        expectCubicsClose(seamed.cubics.slice(0, left.length), left);
        expectCubicsClose(seamed.cubics.slice(left.length), right);
        expect(cubicsDiffer(seamed.cubics, plain)).toBe(true);
        expectConnected(seamed.cubics);
    });

    it('keeps a null as a gap when another sample is a seam', function () {
        const broken = readPath(new ECPolyline({
            shape: {
                points: [0, 0, 30, 80, NaN, NaN, 90, 70, 120, 5],
                smooth: 0.5,
                smoothBreaks: [false, true, false, false, false],
                connectNulls: false
            }
        }));
        expect(broken.moves).toBe(2);
    });

    it('seams this series only, and leaves the stacked baseline alone', function () {
        const breaks = [false, false, true, false, false];
        const stacked = [0, 0, 30, 0, 60, 0, 90, 0, 120, 0];
        const seamedPoly = readCubics(polygon(points, stacked, breaks));
        const plainPoly = readCubics(polygon(points, stacked, null));
        const seamedTop = readCubics(polyline(points, breaks));
        const plainTop = readCubics(polyline(points, null));

        expect(seamedPoly.length).toBe(plainPoly.length);
        expect(seamedTop.length).toBe(plainTop.length);
        expectCubicsClose(seamedPoly.slice(0, seamedTop.length), seamedTop);
        expect(cubicsDiffer(seamedTop, plainTop)).toBe(true);
        expectCubicsClose(seamedPoly.slice(seamedTop.length), plainPoly.slice(plainTop.length));
    });

    it('reads smoothBreak from the datum and ignores it while step is set', function () {
        const chart = createChart({ width: 400, height: 300 });
        try {
            chart.setOption(lineOption(false, [
                10, 40, { value: 90, smoothBreak: true }, 20, 70
            ]));
            const view = lineView(chart);
            expect(view._polyline.shape.smoothBreaks).toEqual([false, false, true, false, false]);
            const read = readPath(view._polyline);
            expect(read.moves).toBe(1);

            chart.setOption(lineOption(false, [
                10, 40, { value: 90, smoothBreak: true }, 20, 70
            ], 'end'));
            expect(lineView(chart)._polyline.shape.smoothBreaks).toBeNull();
        }
        finally {
            chart.dispose();
        }
    });

    it('keeps the target seam on the morphed vertex during an update', function () {
        const chart = createChart({ width: 400, height: 300 });
        try {
            chart.setOption(lineOption(true, [10, 40, 90, 20, 70]));
            chart.setOption(lineOption(true, [
                12, 42, { value: 88, smoothBreak: true }, 22, 68
            ]));
            const breaks = lineView(chart)._polyline.shape.smoothBreaks;
            expect(breaks).toEqual([false, false, true, false, false]);
            expect(breaks.length).toBe(lineView(chart)._polyline.shape.points.length / 2);
        }
        finally {
            chart.dispose();
        }
    });
});

function lineOption(
    animation: boolean,
    data: (number | { value: number, smoothBreak?: boolean })[],
    step?: 'end'
) {
    return {
        animation: animation,
        xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
        yAxis: { type: 'value' },
        series: [{
            type: 'line',
            smooth: true,
            step: step || false,
            showSymbol: false,
            data: data
        }]
    };
}

function lineView(chart: ReturnType<typeof createChart>) {
    const api = chart as any;
    const seriesModel = api.getModel().getSeriesByIndex(0);
    return api.getViewOfSeriesModel(seriesModel);
}

function polyline(pts: number[], breaks: boolean[] | null) {
    return new ECPolyline({
        shape: {
            points: pts,
            smooth: 0.5,
            smoothBreaks: breaks
        }
    });
}

function polygon(pts: number[], stacked: number[], breaks: boolean[] | null) {
    return new ECPolygon({
        shape: {
            points: pts,
            stackedOnPoints: stacked,
            smooth: 0.5,
            stackedOnSmooth: 0.5,
            smoothBreaks: breaks
        }
    });
}

function expectConnected(cubics: CubicBezierSegment[]) {
    for (let i = 1; i < cubics.length; i++) {
        expect(cubics[i].x0).toBeCloseTo(cubics[i - 1].x1, 6);
        expect(cubics[i].y0).toBeCloseTo(cubics[i - 1].y1, 6);
    }
}

function expectCubicsClose(actual: CubicBezierSegment[], expected: CubicBezierSegment[]) {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i++) {
        expect(actual[i].x0).toBeCloseTo(expected[i].x0, 4);
        expect(actual[i].y0).toBeCloseTo(expected[i].y0, 4);
        expect(actual[i].cpx1).toBeCloseTo(expected[i].cpx1, 4);
        expect(actual[i].cpy1).toBeCloseTo(expected[i].cpy1, 4);
        expect(actual[i].cpx2).toBeCloseTo(expected[i].cpx2, 4);
        expect(actual[i].cpy2).toBeCloseTo(expected[i].cpy2, 4);
        expect(actual[i].x1).toBeCloseTo(expected[i].x1, 4);
        expect(actual[i].y1).toBeCloseTo(expected[i].y1, 4);
    }
}

function cubicsDiffer(actual: CubicBezierSegment[], expected: CubicBezierSegment[]): boolean {
    if (actual.length !== expected.length) {
        return true;
    }
    for (let i = 0; i < actual.length; i++) {
        const a = actual[i];
        const b = expected[i];
        if (Math.abs(a.cpx1 - b.cpx1) > 1e-4
            || Math.abs(a.cpy1 - b.cpy1) > 1e-4
            || Math.abs(a.cpx2 - b.cpx2) > 1e-4
            || Math.abs(a.cpy2 - b.cpy2) > 1e-4
        ) {
            return true;
        }
    }
    return false;
}

function readCubics(path: ECPolyline | ECPolygon): CubicBezierSegment[] {
    return readPath(path).cubics;
}

function readPath(path: ECPolyline | ECPolygon) {
    const data = path.getUpdatedPathProxy().data;
    const CMD = PathProxy.CMD;
    const cubics: CubicBezierSegment[] = [];
    let moves = 0;
    let x0 = 0;
    let y0 = 0;
    for (let i = 0; i < data.length;) {
        const cmd = data[i++];
        if (cmd === CMD.M) {
            moves++;
            x0 = data[i++];
            y0 = data[i++];
        }
        else if (cmd === CMD.L) {
            x0 = data[i++];
            y0 = data[i++];
        }
        else if (cmd === CMD.C) {
            const cpx1 = data[i++];
            const cpy1 = data[i++];
            const cpx2 = data[i++];
            const cpy2 = data[i++];
            const x1 = data[i++];
            const y1 = data[i++];
            cubics.push({
                x0: x0,
                y0: y0,
                cpx1: cpx1,
                cpy1: cpy1,
                cpx2: cpx2,
                cpy2: cpy2,
                x1: x1,
                y1: y1
            });
            x0 = x1;
            y0 = y1;
        }
        else if (cmd === CMD.Z) {
            // closePath stores no coordinates.
        }
        else {
            throw new Error('Unexpected path command ' + cmd);
        }
    }
    return { cubics: cubics, moves: moves };
}
