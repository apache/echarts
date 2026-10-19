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

import { cubicAt } from 'zrender/src/core/curve';
import PathProxy from 'zrender/src/core/PathProxy';
import { ECPolyline, ECPolygon } from '@/src/chart/line/poly';
import {
    monotoneCubicSegments,
    monotoneTangentScale,
    monotoneTangents,
    CubicBezierSegment
} from '@/src/chart/line/monotoneCubic';

describe('chart/line/monotoneCubic', function () {

    it('uses the Fritsch–Butland slopes on equal and unequal spacing', function () {
        // x = [0, 1, 2, 3], y = [0, 1, 2, 4]
        // interior harmonic means are 1 and 4/3; ends are 1 and 2.5
        const equal = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 1);
        expect(equal[0]).toBeCloseTo(1, 10);
        expect(equal[1]).toBeCloseTo(1, 10);
        expect(equal[2]).toBeCloseTo(4 / 3, 10);
        expect(equal[3]).toBeCloseTo(2.5, 10);

        // h = [1, 2], delta = [1, 3]
        // interior (w1 + w2) / (w1/d0 + w2/d1) with w1 = 5, w2 = 4 is 27/19
        // ends are 1/3 and 13/3
        const unequal = monotoneTangents([0, 1, 3], [0, 1, 7], 1);
        expect(unequal[0]).toBeCloseTo(1 / 3, 10);
        expect(unequal[1]).toBeCloseTo(27 / 19, 10);
        expect(unequal[2]).toBeCloseTo(13 / 3, 10);
    });

    it('clamps an endpoint slope into the monotone region', function () {
        // delta = [1, -11]. The raw start slope is 7, which is outside
        // the region, so it becomes 3. The other end stays at -17.
        const slopes = monotoneTangents([0, 1, 2], [0, 1, -10], 1);
        expect(slopes[0]).toBeCloseTo(3, 10);
        expect(slopes[1]).toBeCloseTo(0, 10);
        expect(slopes[2]).toBeCloseTo(-17, 10);
    });

    it('keeps the same slopes when the independent coordinate decreases', function () {
        const forward = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 1);
        const backward = monotoneTangents([3, 2, 1, 0], [4, 2, 1, 0], 1);
        expect(backward[0]).toBeCloseTo(forward[3], 10);
        expect(backward[1]).toBeCloseTo(forward[2], 10);
        expect(backward[2]).toBeCloseTo(forward[1], 10);
        expect(backward[3]).toBeCloseTo(forward[0], 10);
    });

    it('scales tangents toward zero and clamps the scale to 1', function () {
        expect(monotoneTangentScale(true)).toBe(1);
        expect(monotoneTangentScale(false)).toBe(0);
        expect(monotoneTangentScale(0.4)).toBe(0.4);
        expect(monotoneTangentScale(3)).toBe(1);
        expect(monotoneTangentScale(-2)).toBe(0);

        const full = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 1);
        const half = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 0.5);
        const above = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 2);
        for (let i = 0; i < full.length; i++) {
            expect(half[i]).toBeCloseTo(full[i] * 0.5, 10);
            expect(Math.abs(half[i])).toBeLessThanOrEqual(Math.abs(full[i]) + 1e-10);
            expect(above[i]).toBeCloseTo(full[i], 10);
        }
    });

    it('does not leave the range of a monotone segment', function () {
        const points = [0, 0, 1, 1, 3, 7, 6, 8];
        for (let s = 0; s < 2; s++) {
            const segments = monotoneCubicSegments(points, 'x', s === 0 ? 1 : 0.35);
            expect(segments.length).toBe(3);
            for (let i = 0; i < segments.length; i++) {
                expectDependentInRange(segments[i], 'x');
            }
        }
    });

    it('places a zero tangent on a local peak and does not pass it', function () {
        const slopes = monotoneTangents([0, 1, 2], [0, 1, 0], 1);
        expect(slopes[1]).toBeCloseTo(0, 10);

        const segments = monotoneCubicSegments([0, 0, 1, 1, 2, 0], 'x', 1);
        expect(segments.length).toBe(2);
        for (let i = 0; i < segments.length; i++) {
            expectDependentInRange(segments[i], 'x');
            for (let step = 0; step <= 16; step++) {
                const y = sampleDependent(segments[i], 'x', step / 16);
                expect(y).toBeLessThanOrEqual(1 + 1e-8);
                expect(y).toBeGreaterThanOrEqual(-1e-8);
            }
        }
    });

    it('stays flat when the samples are flat', function () {
        const slopes = monotoneTangents([0, 1, 3], [5, 5, 5], 1);
        expect(slopes).toEqual([0, 0, 0]);

        const segments = monotoneCubicSegments([0, 5, 1, 5, 3, 5], 'x', 1);
        for (let i = 0; i < segments.length; i++) {
            for (let step = 0; step <= 8; step++) {
                expect(sampleDependent(segments[i], 'x', step / 8)).toBeCloseTo(5, 10);
            }
        }
    });

    it('draws a straight segment through two points at full strength', function () {
        const segments = monotoneCubicSegments([0, 0, 2, 4], 'x', 1);
        expect(segments.length).toBe(1);
        for (let step = 0; step <= 8; step++) {
            const t = step / 8;
            expect(sampleDependent(segments[0], 'x', t)).toBeCloseTo(4 * t, 8);
        }
    });

    it('keeps monotoneY inside the x range of each segment', function () {
        // Same samples as the equal-spacing slope case, with the axes swapped.
        const slopes = monotoneTangents([0, 1, 2, 3], [0, 1, 2, 4], 1);
        const segments = monotoneCubicSegments([0, 0, 1, 1, 2, 2, 4, 3], 'y', 1);
        expect(segments.length).toBe(3);
        for (let i = 0; i < segments.length; i++) {
            expectDependentInRange(segments[i], 'y');
        }
        expect(slopes[2]).toBeCloseTo(4 / 3, 10);
    });

    it('builds the polyline from those cubics and leaves flat tangents unchanged', function () {
        const points = [0, 0, 1, 1, 2, 2, 3, 4];
        const expected = monotoneCubicSegments(points, 'x', 1);
        const cubics = readCubics(new ECPolyline({
            shape: {
                points: points,
                smooth: 1,
                smoothMonotone: 'monotoneX'
            }
        }));
        expect(cubics.length).toBe(expected.length);
        for (let i = 0; i < expected.length; i++) {
            expectSegmentClose(cubics[i], expected[i]);
        }

        const flat = readCubics(new ECPolyline({
            shape: {
                points: [0, 0, 10, 5, 20, 8],
                smooth: 1,
                smoothMonotone: 'x'
            }
        }));
        expect(flat.length).toBeGreaterThan(0);
        for (let i = 0; i < flat.length; i++) {
            expect(near(flat[i].cpy1, flat[i].y0) || near(flat[i].cpy1, flat[i].y1)).toBe(true);
            expect(near(flat[i].cpy2, flat[i].y0) || near(flat[i].cpy2, flat[i].y1)).toBe(true);
        }
    });

    it('splits a turnaround and a repeated x into monotone pieces', function () {
        const turn = [0, 0, 1, 1, 2, 3, 1, 2, 0, 0];
        const turnCubics = readCubics(new ECPolyline({
            shape: {
                points: turn,
                smooth: 1,
                smoothMonotone: 'monotoneX'
            }
        }));
        const rising = monotoneCubicSegments([0, 0, 1, 1, 2, 3], 'x', 1);
        const falling = monotoneCubicSegments([2, 3, 1, 2, 0, 0], 'x', 1);
        expect(turnCubics.length).toBe(rising.length + falling.length);
        for (let i = 0; i < rising.length; i++) {
            expectSegmentClose(turnCubics[i], rising[i]);
        }
        for (let i = 0; i < falling.length; i++) {
            expectSegmentClose(turnCubics[rising.length + i], falling[i]);
            expectDependentInRange(turnCubics[rising.length + i], 'x');
        }

        const repeated = readCubics(new ECPolyline({
            shape: {
                points: [0, 0, 1, 2, 1, 5, 2, 3],
                smooth: 1,
                smoothMonotone: 'monotoneX'
            }
        }));
        expectSegmentClose(repeated[0], monotoneCubicSegments([0, 0, 1, 2], 'x', 1)[0]);
        expect(near(repeated[1].x0, 1)).toBe(true);
        expect(near(repeated[1].x1, 1)).toBe(true);
        expect(near(repeated[1].cpx1, 1)).toBe(true);
        expect(near(repeated[1].cpx2, 1)).toBe(true);
        expectSegmentClose(repeated[2], monotoneCubicSegments([1, 5, 2, 3], 'x', 1)[0]);
    });

    it('breaks on nulls unless connectNulls is set', function () {
        const points = [0, 0, 1, 1, NaN, NaN, 3, 2, 4, 2];
        const broken = readPath(new ECPolyline({
            shape: {
                points: points,
                smooth: 1,
                smoothMonotone: 'monotoneX',
                connectNulls: false
            }
        }));
        const joined = readPath(new ECPolyline({
            shape: {
                points: points,
                smooth: 1,
                smoothMonotone: 'monotoneX',
                connectNulls: true
            }
        }));
        expect(broken.moves).toBe(2);
        expect(joined.moves).toBe(1);
        expect(joined.cubics.length).toBe(3);
    });

    it('smooths a stacked area in both directions without leaving the sample range', function () {
        const polygon = new ECPolygon({
            shape: {
                points: [0, 1, 1, 2, 2, 2, 3, 4],
                stackedOnPoints: [0, 0, 1, 0, 2, 0, 3, 0],
                smooth: 1,
                stackedOnSmooth: 1,
                smoothMonotone: 'monotoneX'
            }
        });
        const read = readPath(polygon);
        expect(read.moves).toBe(1);
        expect(read.cubics.length).toBeGreaterThan(0);
        for (let i = 0; i < read.cubics.length; i++) {
            const seg = read.cubics[i];
            for (let step = 0; step <= 8; step++) {
                const y = sampleDependent(seg, 'x', step / 8);
                expect(y).toBeGreaterThanOrEqual(-1e-4);
                expect(y).toBeLessThanOrEqual(4 + 1e-4);
            }
        }
    });
});

function sampleDependent(segment: CubicBezierSegment, axis: 'x' | 'y', t: number): number {
    if (axis === 'x') {
        return cubicAt(segment.y0, segment.cpy1, segment.cpy2, segment.y1, t);
    }
    return cubicAt(segment.x0, segment.cpx1, segment.cpx2, segment.x1, t);
}

function expectDependentInRange(segment: CubicBezierSegment, axis: 'x' | 'y') {
    const dep0 = axis === 'x' ? segment.y0 : segment.x0;
    const dep1 = axis === 'x' ? segment.y1 : segment.x1;
    const lo = Math.min(dep0, dep1) - 1e-6;
    const hi = Math.max(dep0, dep1) + 1e-6;
    for (let step = 0; step <= 16; step++) {
        const value = sampleDependent(segment, axis, step / 16);
        expect(value).toBeGreaterThanOrEqual(lo);
        expect(value).toBeLessThanOrEqual(hi);
    }
}

function expectSegmentClose(actual: CubicBezierSegment, expected: CubicBezierSegment) {
    expect(actual.x0).toBeCloseTo(expected.x0, 4);
    expect(actual.y0).toBeCloseTo(expected.y0, 4);
    expect(actual.cpx1).toBeCloseTo(expected.cpx1, 4);
    expect(actual.cpy1).toBeCloseTo(expected.cpy1, 4);
    expect(actual.cpx2).toBeCloseTo(expected.cpx2, 4);
    expect(actual.cpy2).toBeCloseTo(expected.cpy2, 4);
    expect(actual.x1).toBeCloseTo(expected.x1, 4);
    expect(actual.y1).toBeCloseTo(expected.y1, 4);
}

function near(actual: number, expected: number): boolean {
    return Math.abs(actual - expected) < 1e-4;
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
