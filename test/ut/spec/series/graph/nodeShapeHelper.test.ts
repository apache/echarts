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

import { getSymbolBoundaryDistance } from '@/src/chart/graph/nodeShapeHelper';

// Convenience: distance from center to outline for a symbol probed along a unit direction.
function dist(
    symbolType: string,
    size: number[],
    rotateDeg: number,
    dirX: number,
    dirY: number
): number {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    return getSymbolBoundaryDistance(
        symbolType, size, rotateDeg * Math.PI / 180, false, null, dirX / len, dirY / len
    );
}

const SQRT1_2 = Math.SQRT1_2;

describe('chart/graph/nodeShapeHelper', function () {

    describe('getSymbolBoundaryDistance', function () {

        it('circle is angle-independent (fast path)', function () {
            for (let deg = 0; deg < 360; deg += 23) {
                const rad = deg * Math.PI / 180;
                expect(dist('circle', [20, 20], 0, Math.cos(rad), Math.sin(rad))).toBeCloseTo(10, 5);
            }
        });

        it('axis-aligned rect uses half-extents on the axes', function () {
            expect(dist('rect', [40, 20], 0, 1, 0)).toBeCloseTo(20, 1);
            expect(dist('rect', [40, 20], 0, -1, 0)).toBeCloseTo(20, 1);
            expect(dist('rect', [40, 20], 0, 0, 1)).toBeCloseTo(10, 1);
            expect(dist('rect', [40, 20], 0, 0, -1)).toBeCloseTo(10, 1);
        });

        it('rect diagonal follows the box (min of axis crossings)', function () {
            // (0.6, 0.8): x-limit 20/0.6 = 33.3, y-limit 10/0.8 = 12.5 -> exits at y = 10.
            expect(dist('rect', [40, 20], 0, 0.6, 0.8)).toBeCloseTo(12.5, 1);
            // 45deg on a 40x40 square exits at the corner: sqrt(20^2 + 20^2).
            expect(dist('rect', [40, 40], 0, SQRT1_2, SQRT1_2)).toBeCloseTo(Math.sqrt(800), 1);
        });

        it('diamond is smaller on the diagonal than on the axes', function () {
            // |x| + |y| = 10 scaled shape.
            expect(dist('diamond', [20, 20], 0, 1, 0)).toBeCloseTo(10, 1);
            expect(dist('diamond', [20, 20], 0, 0, 1)).toBeCloseTo(10, 1);
            // Diagonal: t*(|dx| + |dy|) = 10 -> 10 / sqrt(2).
            expect(dist('diamond', [20, 20], 0, SQRT1_2, SQRT1_2)).toBeCloseTo(10 * SQRT1_2, 1);
        });

        it('rotation swaps the rect axes (90 degrees)', function () {
            // Rotating a 40x20 rect by 90deg puts its short axis horizontal.
            expect(dist('rect', [40, 20], 90, 1, 0)).toBeCloseTo(10, 1);
            expect(dist('rect', [40, 20], 90, 0, 1)).toBeCloseTo(20, 1);
        });

        it('non-uniform circle is treated as an ellipse', function () {
            // Ellipse x^2/20^2 + y^2/10^2 = 1 (fast path skipped: half-extents differ).
            expect(dist('circle', [40, 20], 0, 1, 0)).toBeCloseTo(20, 1);
            expect(dist('circle', [40, 20], 0, 0, 1)).toBeCloseTo(10, 1);
            // Diagonal: t^2/2 * (1/400 + 1/100) = 1 -> t = sqrt(160).
            expect(dist('circle', [40, 20], 0, SQRT1_2, SQRT1_2)).toBeCloseTo(Math.sqrt(160), 1);
        });

        it('triangle exits at apex, base and slanted sides', function () {
            // verts (0,-1),(1,1),(-1,1) scaled by 20.
            expect(dist('triangle', [40, 40], 0, 0, -1)).toBeCloseTo(20, 3); // apex
            expect(dist('triangle', [40, 40], 0, 0, 1)).toBeCloseTo(20, 3);  // base
            expect(dist('triangle', [40, 40], 0, 1, 0)).toBeCloseTo(10, 3);  // right side at y=0
        });

        it('roundRect exits flat edges and corner arcs', function () {
            // Half-extent 20, corner radius 10.
            expect(dist('roundRect', [40, 40], 0, 1, 0)).toBeCloseTo(20, 3);  // flat edge
            expect(dist('roundRect', [40, 40], 0, 0, 1)).toBeCloseTo(20, 3);  // flat edge
            // Diagonal meets the corner arc (closer than the sharp corner at sqrt(800) ~ 28.28).
            expect(dist('roundRect', [40, 40], 0, SQRT1_2, SQRT1_2)).toBeCloseTo(24.142, 2);
        });

        it('empty variants share the base outline', function () {
            expect(dist('emptyRect', [40, 20], 0, 1, 0)).toBeCloseTo(20, 1);
            expect(dist('emptyCircle', [20, 20], 0, 1, 0)).toBeCloseTo(10, 3);
        });

        it('scales with symbol size', function () {
            expect(dist('rect', [80, 40], 0, 1, 0)).toBeCloseTo(40, 1);
            expect(dist('rect', [80, 40], 0, 0, 1)).toBeCloseTo(20, 1);
        });

        it('degenerate sizes do not throw', function () {
            expect(dist('rect', [0, 0], 0, 1, 0)).toBe(0);
        });

    });

});
