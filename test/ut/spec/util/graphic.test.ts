
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

import {
    subPixelOptimize, subPixelOptimizeLine, subPixelOptimizeRect
} from 'zrender/src/graphic/helper/subPixelOptimize';
import {
    lineLineIntersect,
    expandOrShrinkRect
} from '@/src/util/graphic';


describe('util/graphic', function () {

    describe('subPixelOptimize', function () {

        it('subPixelOptimize_base', function () {
            expect(subPixelOptimize(5, 1)).toEqual(4.5);
            expect(subPixelOptimize(5, 2)).toEqual(5);
            expect(subPixelOptimize(5, 43)).toEqual(4.5);
            expect(subPixelOptimize(7.5, 1)).toEqual(7.5);
            expect(subPixelOptimize(7.5, 2)).toEqual(7);
            expect(subPixelOptimize(14, 1, true)).toEqual(14.5);
            expect(subPixelOptimize(14, 2, true)).toEqual(14);
            expect(subPixelOptimize(-11, 1)).toEqual(-11.5);
            expect(subPixelOptimize(-11, 2)).toEqual(-11);
            expect(subPixelOptimize(0, 2)).toEqual(0);
            expect(subPixelOptimize(0, 1)).toEqual(-0.5);
            expect(subPixelOptimize(5, 0)).toEqual(5);
        });

        it('subPixelOptimize_line', function () {
            function doSubPixelOptimizeLine(x: number, y: number, width: number, height: number, lineWidth: number) {
                const params = makeParam(x, y, width, height, lineWidth);
                return subPixelOptimizeLine(params.shape, params.shape, params.style);
            }
            function makeParam(x1: number, y1: number, x2: number, y2: number, lineWidth: number) {
                return {
                    shape: {x1: x1, y1: y1, x2: x2, y2: y2},
                    style: {lineWidth: lineWidth}
                };
            }
            expect(doSubPixelOptimizeLine(5, 11, 3, 7, 1)).toEqual(makeParam(5, 11, 3, 7, 1).shape);
            expect(doSubPixelOptimizeLine(5, 11, 5, 7, 1)).toEqual(makeParam(5.5, 11, 5.5, 7, 1).shape);
            expect(doSubPixelOptimizeLine(5, 11, 5, 7, 2)).toEqual(makeParam(5, 11, 5, 7, 2).shape);
            expect(doSubPixelOptimizeLine(5, 11, 15, 11, 1)).toEqual(makeParam(5, 11.5, 15, 11.5, 1).shape);
            expect(doSubPixelOptimizeLine(5, 11, 15, 11, 2)).toEqual(makeParam(5, 11, 15, 11, 2).shape);
            expect(doSubPixelOptimizeLine(5, 11, 15, 11, 3)).toEqual(makeParam(5, 11.5, 15, 11.5, 3).shape);
            expect(doSubPixelOptimizeLine(5, 11, 15, 11.5, 3)).toEqual(makeParam(5, 11, 15, 11.5, 3).shape);
            expect(doSubPixelOptimizeLine(5, 11.5, 15, 11.5, 3)).toEqual(makeParam(5, 11.5, 15, 11.5, 3).shape);
            expect(doSubPixelOptimizeLine(5, 11.5, 15, 11.5, 4)).toEqual(makeParam(5, 12, 15, 12, 4).shape);
        });

        it('subPixelOptimize_rect', function () {
            function doSubPixelOptimizeRect(x: number, y: number, width: number, height: number, lineWidth: number) {
                const params = makeParam(x, y, width, height, lineWidth);
                return subPixelOptimizeRect(params.shape, params.shape, params.style);
            }
            function makeParam(x: number, y: number, width: number, height: number, lineWidth: number) {
                return {
                    shape: {x: x, y: y, width: width, height: height},
                    style: {lineWidth: lineWidth}
                };
            }
            expect(doSubPixelOptimizeRect(5, 11, 3, 7, 1)).toEqual(makeParam(5.5, 11.5, 2, 6, 1).shape);
            expect(doSubPixelOptimizeRect(5, 11, 3, 7, 2)).toEqual(makeParam(5, 11, 3, 7, 2).shape);
            expect(doSubPixelOptimizeRect(5, 11, 3, 7, 3)).toEqual(makeParam(5.5, 11.5, 2, 6, 3).shape);
            // Boundary value tests
            expect(doSubPixelOptimizeRect(5, 11, 1, 7, 1)).toEqual(makeParam(5.5, 11.5, 1, 6, 1).shape);
            expect(doSubPixelOptimizeRect(5, 11, 1, 0, 1)).toEqual(makeParam(5.5, 11.5, 1, 0, 1).shape);
        });

    });

    describe('lineLineIntersect', function () {

        it('extreme', function () {
            expect(lineLineIntersect(10, 10, 30, 30, 10, 10, 10, 10)).toEqual(false);
        });

        it('parallel and colinear', function () {
            expect(lineLineIntersect(10, 20, 30, 40, 100, 220, 120, 240)).toEqual(false);
            expect(lineLineIntersect(10, 10, 30, 30, 40, 40, 50, 50)).toEqual(false);
            expect(lineLineIntersect(10, 10, 30, 30, 10, 10, 30, 30)).toEqual(false);
            expect(lineLineIntersect(10, 10, 30, 30, 20, 20, 30, 30)).toEqual(false);
            expect(lineLineIntersect(10, 10, 30, 30, 20, 20, 22, 22)).toEqual(false);
        });

        it('intersect', function () {
            expect(lineLineIntersect(10, 20, 30, 40, 12, 20, 30, 40)).toEqual(true);
            expect(lineLineIntersect(10, 20, 30, 40, 12, 20, 20, 42)).toEqual(true);
        });
    });

    describe('expandOrShrinkRect', function () {

        it('expandOrShrinkRect', function () {

            const rect1 = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1, [10, 20, 30, 40], false, true);
            expect(rect1).toEqual({x: 60, y: 190, width: 360, height: 440});

            const rect1b = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1b, [-10, -20, -30, -40], false, true);
            expect(rect1b).toEqual({x: 100, y: 200, width: 300, height: 400});

            const rect1c = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1c, [-10, -20, -30, -40], true, true);
            expect(rect1c).toEqual({x: 100, y: 200, width: 300, height: 400});

            const rect1d = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1d, [10, 20, 30, 40], true, true);
            expect(rect1d).toEqual({x: 140, y: 210, width: 240, height: 360});

            const rect1e = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1e, [10, 200, 30, 120], true, true);
            expect(rect1e).toEqual({x: 212.5, y: 210, width: 0, height: 360});

            const rect1f = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect1f, [200, 20, 300, 40], true, true);
            expect(rect1f).toEqual({x: 140, y: 360, width: 240, height: 0});

            const rect2 = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect2, [0, 0, 0, 0], false, true);
            expect(rect2).toEqual({x: 100, y: 200, width: 300, height: 400});

            const rect3 = {x: 0, y: 100, width: 200, height: 300};
            expandOrShrinkRect(rect3, [-10, -20, -30, -40], false, false);
            expect(rect3).toEqual({x: 40, y: 110, width: 140, height: 260});

            const rect4 = {x: 0, y: 100, width: 5, height: 30};
            expandOrShrinkRect(rect4, [-10, 0, -40, -10], false, false);
            expect(rect4).toEqual({x: 5, y: 106, width: 0, height: 0});

            const rect5 = {x: 10, y: 100, width: 5, height: 0};
            expandOrShrinkRect(rect5, [-10, -10, -40, 0], false, false);
            expect(rect5).toEqual({x: 10, y: 100, width: 0, height: 0});

            const rect6 = {x: 5, y: 0, width: 0, height: 0};
            expandOrShrinkRect(rect6, [10, -10, 40, 20], false, false);
            expect(rect6).toEqual({x: -15, y: -10, width: 10, height: 50});

            const rect7 = {x: 5, y: 0, width: 15, height: 20};
            expandOrShrinkRect(rect7, [-45, -50, 10, 20], false, false);
            expect(rect7).toEqual({x: -15, y: 30, width: 0, height: 0});

            const rect8 = {x: 100, y: NaN, width: 300, height: NaN};
            expandOrShrinkRect(rect8, [10, 20, 30, 40], false, true);
            expect(rect8).toEqual({x: 60, y: NaN, width: 360, height: NaN});

            const rect8b = {x: NaN, y: 200, width: NaN, height: 400};
            expandOrShrinkRect(rect8b, [10, 20, 30, 40], false, true);
            expect(rect8b).toEqual({x: NaN, y: 190, width: NaN, height: 440});

            const rect9 = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect9, 10, false, true);
            expect(rect9).toEqual({x: 90, y: 190, width: 320, height: 420});

            const rect10 = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect10, 10, true, true);
            expect(rect10).toEqual({x: 110, y: 210, width: 280, height: 380});

            const rect11 = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect11, -10, false, true);
            expect(rect11).toEqual({x: 100, y: 200, width: 300, height: 400});

            const rect11b = {x: 100, y: 200, width: 300, height: 400};
            expandOrShrinkRect(rect11b, -10, true, true);
            expect(rect11b).toEqual({x: 100, y: 200, width: 300, height: 400});
        });

    });

});