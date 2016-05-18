describe('util/number', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/util/number']);

    describe('linearMap', function () {

        testCase('accuracyError', function (numberUtil) {
            var range = [-15918.3, 17724.9];
            var result = numberUtil.linearMap(100, [0, 100], range, true);
            // Should not be 17724.899999999998.
            expect(result).toEqual(range[1]);

            var range = [-62.83, 83.56];
            var result = numberUtil.linearMap(100, [0, 100], range, true);
            // Should not be 83.55999999999999.
            expect(result).toEqual(range[1]);
        });

        testCase('clamp', function (numberUtil) {
            // (1) normal order.
            var range = [-15918.3, 17724.9];
            // bigger than max
            var result = numberUtil.linearMap(100.1, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // smaller than min
            var result = numberUtil.linearMap(-2, [0, 100], range, true);
            expect(result).toEqual(range[0]);
            // equals to max
            var result = numberUtil.linearMap(100, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // equals to min
            var result = numberUtil.linearMap(0, [0, 100], range, true);
            expect(result).toEqual(range[0]);

            // (2) inverse range
            var range = [17724.9, -15918.3];
            // bigger than max
            var result = numberUtil.linearMap(102, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // smaller than min
            var result = numberUtil.linearMap(-0.001, [0, 100], range, true);
            expect(result).toEqual(range[0]);
            // equals to max
            var result = numberUtil.linearMap(100, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // equals to min
            var result = numberUtil.linearMap(0, [0, 100], range, true);
            expect(result).toEqual(range[0]);

            // (2) inverse domain
            // bigger than max, inverse domain
            var range = [-15918.3, 17724.9];
            // bigger than max
            var result = numberUtil.linearMap(102, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // smaller than min
            var result = numberUtil.linearMap(-0.001, [100, 0], range, true);
            expect(result).toEqual(range[1]);
            // equals to max
            var result = numberUtil.linearMap(100, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // equals to min
            var result = numberUtil.linearMap(0, [100, 0], range, true);
            expect(result).toEqual(range[1]);

            // (3) inverse domain, inverse range
            var range = [17724.9, -15918.3];
            // bigger than max
            var result = numberUtil.linearMap(100.1, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // smaller than min
            var result = numberUtil.linearMap(-2, [100, 0], range, true);
            expect(result).toEqual(range[1]);
            // equals to max
            var result = numberUtil.linearMap(100, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // equals to min
            var result = numberUtil.linearMap(0, [100, 0], range, true);
            expect(result).toEqual(range[1]);
        });

        testCase('noClamp', function (numberUtil) {
            // (1) normal order.
            var range = [-15918.3, 17724.9];
            // bigger than max
            var result = numberUtil.linearMap(100.1, [0, 100], range, false);
            expect(result).toEqual(17758.543199999996);
            // smaller than min
            var result = numberUtil.linearMap(-2, [0, 100], range, false);
            expect(result).toEqual(-16591.164);
            // equals to max
            var result = numberUtil.linearMap(100, [0, 100], range, false);
            expect(result).toEqual(17724.9);
            // equals to min
            var result = numberUtil.linearMap(0, [0, 100], range, false);
            expect(result).toEqual(-15918.3);

            // (2) inverse range
            var range = [17724.9, -15918.3];
            // bigger than max
            var result = numberUtil.linearMap(102, [0, 100], range, false);
            expect(result).toEqual(-16591.163999999997);
            // smaller than min
            var result = numberUtil.linearMap(-0.001, [0, 100], range, false);
            expect(result).toEqual(17725.236432);
            // equals to max
            var result = numberUtil.linearMap(100, [0, 100], range, false);
            expect(result).toEqual(-15918.3);
            // equals to min
            var result = numberUtil.linearMap(0, [0, 100], range, false);
            expect(result).toEqual(17724.9);

            // (2) inverse domain
            // bigger than max, inverse domain
            var range = [-15918.3, 17724.9];
            // bigger than max
            var result = numberUtil.linearMap(102, [100, 0], range, false);
            expect(result).toEqual(-16591.164);
            // smaller than min
            var result = numberUtil.linearMap(-0.001, [100, 0], range, false);
            expect(result).toEqual(17725.236432);
            // equals to max
            var result = numberUtil.linearMap(100, [100, 0], range, false);
            expect(result).toEqual(-15918.3);
            // equals to min
            var result = numberUtil.linearMap(0, [100, 0], range, false);
            expect(result).toEqual(17724.9);

            // (3) inverse domain, inverse range
            var range = [17724.9, -15918.3];
            // bigger than max
            var result = numberUtil.linearMap(100.1, [100, 0], range, false);
            expect(result).toEqual(17758.5432);
            // smaller than min
            var result = numberUtil.linearMap(-2, [100, 0], range, false);
            expect(result).toEqual(-16591.163999999997);
            // equals to max
            var result = numberUtil.linearMap(100, [100, 0], range, false);
            expect(result).toEqual(17724.9);
            // equals to min
            var result = numberUtil.linearMap(0, [100, 0], range, false);
            expect(result).toEqual(-15918.3);
        });

        testCase('normal', function (numberUtil) {

            doTest(true);
            doTest(false);

            function doTest(clamp) {
                // normal
                var range = [444, 555];
                var result = numberUtil.linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(488.4);

                // inverse range
                var range = [555, 444];
                var result = numberUtil.linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(510.6);

                // inverse domain and range
                var range = [555, 444];
                var result = numberUtil.linearMap(40, [100, 0], range, clamp);
                expect(result).toEqual(488.4);

                // inverse domain
                var range = [444, 555];
                var result = numberUtil.linearMap(40, [100, 0], range, clamp);
                expect(result).toEqual(510.6);
            }
        });

        testCase('zeroInterval', function (numberUtil) {

            doTest(true);
            doTest(false);

            function doTest(clamp) {
                // zero domain interval
                var range = [444, 555];
                var result = numberUtil.linearMap(40, [1212222223.2323232, 1212222223.2323232], range, clamp);
                expect(result).toEqual(499.5); // half of range.

                // zero range interval
                var range = [1221212.1221372238, 1221212.1221372238];
                var result = numberUtil.linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(1221212.1221372238);

                // zero domain interval and range interval
                var range = [1221212.1221372238, 1221212.1221372238];
                var result = numberUtil.linearMap(40, [43.55454545, 43.55454545], range, clamp);
                expect(result).toEqual(1221212.1221372238);
            }
        })

    });

});