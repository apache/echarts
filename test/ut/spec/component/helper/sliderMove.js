describe('component/helper/sliderMove', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/src/component/helper/sliderMove']);

    describe('sliderMove', function () {

        testCase('normalize', function (sliderMove) {
            // Return input handleEnds
            var inputHandleEnds = [22, 50];
            var outputHandleEnds = sliderMove(0, inputHandleEnds, [20, 50], 0);
            expect(inputHandleEnds === outputHandleEnds).toEqual(true);
            expect(outputHandleEnds).toEqual([22, 50]);

            // delta 0 and normalize
            expect(sliderMove(0, [-10, 70], [20, 50], 0)).toEqual([20, 50]);

            // normalize by minSpec
            expect(sliderMove(0, [20, 22], [20, 50], 0, 10)).toEqual([20, 30]);

            // normalize by maxSpec
            expect(sliderMove(0, [20, 42], [20, 50], 0, null, 10)).toEqual([20, 30]);

            // Do not move
            expect(sliderMove(0, [-10, 70], [20, 50], 'all')).toEqual([20, 50]);

            // minSpan bigger than extent
            expect(sliderMove(4, [20, 25], [10, 50], 0, 300)).toEqual([10, 50]);

            // maxSpan smaller than minSpan
            expect(sliderMove(4, [20, 25], [10, 50], 0, 6, 3)).toEqual([24, 30]);
        });

        testCase('rigid_move', function (sliderMove) {

            expect(sliderMove(2, [20, 30], [10, 50], 'all')).toEqual([22, 32]);
            expect(sliderMove(200, [20, 30], [10, 50], 'all')).toEqual([40, 50]);
            expect(sliderMove(-2, [30, 40], [10, 50], 'all')).toEqual([28, 38]);
            expect(sliderMove(-2, [10, 20], [10, 50], 'all')).toEqual([10, 20]);

        });

        testCase('cross', function (sliderMove) {

            expect(sliderMove(2, [20, 25], [10, 50], 0)).toEqual([22, 25]);
            expect(sliderMove(200, [20, 25], [10, 50], 0)).toEqual([50, 25]);
            expect(sliderMove(-2, [20, 25], [10, 50], 0)).toEqual([18, 25]);
            expect(sliderMove(-200, [20, 25], [10, 50], 0)).toEqual([10, 25]);

            expect(sliderMove(2, [20, 25], [10, 50], 1)).toEqual([20, 27]);
            expect(sliderMove(200, [20, 25], [10, 50], 1)).toEqual([20, 50]);
            expect(sliderMove(-2, [20, 25], [10, 50], 1)).toEqual([20, 23]);
            expect(sliderMove(-200, [20, 25], [10, 50], 1)).toEqual([20, 10]);

        });

        testCase('minSpan_push', function (sliderMove) {

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

        testCase('maxSpan_pull', function (sliderMove) {

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