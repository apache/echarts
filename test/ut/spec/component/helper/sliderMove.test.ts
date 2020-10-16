
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

import sliderMove from '../../../../../src/component/helper/sliderMove';


describe('component/helper/sliderMove', function () {

    describe('sliderMove', function () {

        it('normalize', function () {
            // Return input handleEnds
            const inputHandleEnds = [22, 50];
            const outputHandleEnds = sliderMove(0, inputHandleEnds, [20, 50], 0);
            expect(inputHandleEnds === outputHandleEnds).toEqual(true);
            expect(outputHandleEnds).toEqual([22, 50]);

            // delta 0 and normalize
            expect(sliderMove(0, [-10, 70], [20, 50], 0)).toEqual([20, 50]);

            // normalize by minSpec
            expect(sliderMove(0, [20, 22], [20, 50], 0, 10)).toEqual([20, 30]);

            // normalize by maxSpec
            expect(sliderMove(0, [20, 42], [20, 50], 0, null, 10)).toEqual([20, 30]);

            // minSpan bigger than extent
            expect(sliderMove(4, [20, 25], [10, 50], 0, 300)).toEqual([10, 50]);

            // maxSpan smaller than minSpan
            expect(sliderMove(4, [20, 25], [10, 50], 0, 6, 3)).toEqual([24, 30]);

            // extent small then input range
            expect(sliderMove(0, [-10, 70], [20, 50], 'all')).toEqual([20, 50]);

            expect(sliderMove(0, [-10, 14], [1, 101], 'all')).toEqual([1, 25]);
            expect(sliderMove(0, [99, 110], [1, 101], 'all')).toEqual([90, 101]);
            expect(sliderMove(0, [-10, 14], [1, 101], 'all', null, 16)).toEqual([1, 17]);
            expect(sliderMove(0, [-10, 14], [1, 101], 'all', 15, 16)).toEqual([1, 17]);
            expect(sliderMove(0, [-10, 14], [1, 101], 'all', 50, null)).toEqual([1, 51]);
            expect(sliderMove(0, [-10, 14], [1, 101], 'all', 50, 55)).toEqual([1, 51]);
            expect(sliderMove(0, [-10, 14], [1, 101], 'all', 10, 55)).toEqual([1, 25]);
        });

        it('rigid_move', function () {

            expect(sliderMove(2, [20, 30], [10, 50], 'all')).toEqual([22, 32]);
            expect(sliderMove(200, [20, 30], [10, 50], 'all')).toEqual([40, 50]);
            expect(sliderMove(-2, [30, 40], [10, 50], 'all')).toEqual([28, 38]);
            expect(sliderMove(-2, [10, 20], [10, 50], 'all')).toEqual([10, 20]);

        });

        it('cross', function () {

            expect(sliderMove(2, [20, 25], [10, 50], 0)).toEqual([22, 25]);
            expect(sliderMove(200, [20, 25], [10, 50], 0)).toEqual([50, 25]);
            expect(sliderMove(-2, [20, 25], [10, 50], 0)).toEqual([18, 25]);
            expect(sliderMove(-200, [20, 25], [10, 50], 0)).toEqual([10, 25]);

            expect(sliderMove(2, [20, 25], [10, 50], 1)).toEqual([20, 27]);
            expect(sliderMove(200, [20, 25], [10, 50], 1)).toEqual([20, 50]);
            expect(sliderMove(-2, [20, 25], [10, 50], 1)).toEqual([20, 23]);
            expect(sliderMove(-200, [20, 25], [10, 50], 1)).toEqual([20, 10]);

        });

        it('minSpan_push', function () {

            expect(sliderMove(1, [20, 25], [10, 50], 0, 3)).toEqual([21, 25]);
            expect(sliderMove(4, [20, 25], [10, 50], 0, 3)).toEqual([24, 27]);
            expect(sliderMove(200, [20, 25], [10, 50], 0, 3)).toEqual([47, 50]);
            expect(sliderMove(-200, [20, 25], [10, 50], 0, 3)).toEqual([10, 25]);

            expect(sliderMove(-1, [20, 25], [10, 50], 1, 3)).toEqual([20, 24]);
            expect(sliderMove(-4, [20, 25], [10, 50], 1, 3)).toEqual([18, 21]);
            expect(sliderMove(-200, [20, 25], [10, 50], 1, 3)).toEqual([10, 13]);
            expect(sliderMove(200, [20, 25], [10, 50], 1, 3)).toEqual([20, 50]);

            // minSpan is 0.
            expect(sliderMove(10, [20, 25], [10, 50], 0, 0)).toEqual([30, 30]);
            expect(sliderMove(-10, [20, 25], [10, 50], 1, 0)).toEqual([15, 15]);

            // Input handleEnds[0] === handleEnds[1], should not cross.
            expect(sliderMove(10, [20, 20], [10, 50], 0, 0)).toEqual([30, 30]);
            expect(sliderMove(-5, [20, 20], [10, 50], 1, 0)).toEqual([15, 15]);
        });

        it('maxSpan_pull', function () {

            expect(sliderMove(-8, [20, 25], [10, 50], 0, null, 4)).toEqual([12, 16]);
            expect(sliderMove(14, [20, 25], [10, 50], 0, null, 4)).toEqual([34, 30]);
            expect(sliderMove(200, [20, 25], [10, 50], 0, null, 4)).toEqual([50, 46]);
            expect(sliderMove(-200, [20, 25], [10, 50], 0, null, 4)).toEqual([10, 14]);

            expect(sliderMove(8, [20, 25], [10, 50], 1, null, 4)).toEqual([29, 33]);
            expect(sliderMove(-15, [20, 25], [10, 50], 1, null, 4)).toEqual([14, 10]);
            expect(sliderMove(-200, [20, 25], [10, 50], 1, null, 4)).toEqual([14, 10]);
            expect(sliderMove(200, [20, 25], [10, 50], 1, null, 4)).toEqual([46, 50]);

        });

    });

});
