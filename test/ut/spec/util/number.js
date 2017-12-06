describe('util/number', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/src/util/number']);

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
        });
    });

    describe('parseDate', function () {
        testCase('parseDate', function (numberUtil) {

            // Invalid Date
            expect('' + numberUtil.parseDate(null)).toEqual('Invalid Date');
            expect('' + numberUtil.parseDate(void 0)).toEqual('Invalid Date');
            expect('' + numberUtil.parseDate('asdf')).toEqual('Invalid Date');
            expect('' + numberUtil.parseDate(NaN)).toEqual('Invalid Date');
            expect('' + numberUtil.parseDate('-')).toEqual('Invalid Date');
            expect('' + numberUtil.parseDate('20120304')).toEqual('Invalid Date');

            // Input instance of Date or timestamp
            expect(+numberUtil.parseDate(new Date('2012-03-04'))).toEqual(1330819200000);
            expect(+numberUtil.parseDate(1330819200000)).toEqual(1330819200000);
            expect(+numberUtil.parseDate(1330819199999.99)).toEqual(1330819200000);
            expect(+numberUtil.parseDate(1330819200000.01)).toEqual(1330819200000);

            // ISO string
            expect(+numberUtil.parseDate('2012-03')).toEqual(1330531200000);
            expect(+numberUtil.parseDate('2012-03-04')).toEqual(1330790400000);
            expect(+numberUtil.parseDate('2012-03-04 05')).toEqual(1330808400000);
            expect(+numberUtil.parseDate('2012-03-04T05')).toEqual(1330808400000);
            expect(+numberUtil.parseDate('2012-03-04 05:06')).toEqual(1330808760000);
            expect(+numberUtil.parseDate('2012-03-04T05:06')).toEqual(1330808760000);
            expect(+numberUtil.parseDate('2012-03-04 05:06:07')).toEqual(1330808767000);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07')).toEqual(1330808767000);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.123')).toEqual(1330808767123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07,123')).toEqual(1330808767123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.12')).toEqual(1330808767012);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.1')).toEqual(1330808767001);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07,123Z')).toEqual(1330837567123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.123+0800')).toEqual(1330808767123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.123+08:00')).toEqual(1330808767123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.123-0700')).toEqual(1330862767123);
            expect(+numberUtil.parseDate('2012-03-04T05:06:07.123-07:00')).toEqual(1330862767123);

            // Other string
            expect(+numberUtil.parseDate('2012')).toEqual(1325347200000);
            expect(+numberUtil.parseDate('2012/03')).toEqual(1330531200000);
            expect(+numberUtil.parseDate('2012/03/04')).toEqual(1330790400000);
            expect(+numberUtil.parseDate('2012-3-4')).toEqual(1330790400000);
            expect(+numberUtil.parseDate('2012/3')).toEqual(1330531200000);
            expect(+numberUtil.parseDate('2012/3/4')).toEqual(1330790400000);
            expect(+numberUtil.parseDate('2012/3/4 2:05')).toEqual(1330797900000);
            expect(+numberUtil.parseDate('2012/03/04 2:05')).toEqual(1330797900000);
            expect(+numberUtil.parseDate('2012/3/4 2:05:08')).toEqual(1330797908000);
            expect(+numberUtil.parseDate('2012/03/04 2:05:08')).toEqual(1330797908000);
            expect(+numberUtil.parseDate('2012/3/4 2:05:08.123')).toEqual(1330797908123);
            expect(+numberUtil.parseDate('2012/03/04 2:05:08.123')).toEqual(1330797908123);
        });
    });


    describe('reformIntervals', function () {

        testCase('basic', function (numberUtil) {
            // all
            expect(numberUtil.reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [-Infinity, -70], close: [0, 0]},
                {interval: [-70, -26], close: [1, 1]},
                {interval: [-26, 18], close: [1, 1]},
                {interval: [62, 150], close: [1, 1]},
                {interval: [106, 150], close: [1, 1]},
                {interval: [150, Infinity], close: [0, 0]}
            ])).toEqual([
                {interval: [-Infinity, -70], close: [0, 0]},
                {interval: [-70, -26], close: [1, 1]},
                {interval: [-26, 18], close: [0, 1]},
                {interval: [18, 62], close: [0, 1]},
                {interval: [62, 150], close: [0, 1]},
                {interval: [150, Infinity], close: [0, 0]}
            ]);

            // remove overlap
            expect(numberUtil.reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [50, 150], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [0, 1]}
            ]);

            // remove overlap on edge
            expect(numberUtil.reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [0, 1]}
            ]);

            // remove included interval
            expect(numberUtil.reformIntervals([
                {interval: [30, 40], close: [1, 1]},
                {interval: [42, 54], close: [1, 1]},
                {interval: [45, 60], close: [1, 1]},
                {interval: [18, 62], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]}
            ]);

            // remove edge
            expect(numberUtil.reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [30, 62], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]}
            ]);
        });
    });


    describe('getPrecisionSafe', function () {
        testCase('basic', function (numberUtil) {
            expect(numberUtil.getPrecisionSafe(10)).toEqual(0);
            expect(numberUtil.getPrecisionSafe(1)).toEqual(0);
            expect(numberUtil.getPrecisionSafe(0)).toEqual(0);
            expect(numberUtil.getPrecisionSafe(100000000000000000000000000000)).toEqual(0);
            expect(numberUtil.getPrecisionSafe(1e+100)).toEqual(0);
            expect(numberUtil.getPrecisionSafe(0.1)).toEqual(1);
            expect(numberUtil.getPrecisionSafe(0.100)).toEqual(1);
            expect(numberUtil.getPrecisionSafe(0.0032)).toEqual(4);
            expect(numberUtil.getPrecisionSafe(0.0000000000034)).toEqual(12);
            expect(numberUtil.getPrecisionSafe(3.4e-10)).toEqual(10);
        });
    });

    describe('getPercentWithPrecision', function () {
        testCase('basic', function (numberUtil) {

            // console.log(numberUtil.getPercentWithPrecision([-1.678, -4.783, -2.664, -0.875], 0, 2));

            // var arr = [49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5];
            var arr = [49.5, NaN];
            var result = [];
            for (var i = 0; i < arr.length; i++) {
                result.push(
                    numberUtil.getPercentWithPrecision(arr, i, 0)
                );
            }
            console.log(result);
            var sum = 0;
            for (var i = 0; i < result.length; i++) {
                sum += result[i];
            }
            console.log(sum);

            expect(numberUtil.getPercentWithPrecision([50.5, 49.5], 0, 0)).toEqual(51);
            expect(numberUtil.getPercentWithPrecision([50.5, 49.5], 1, 0)).toEqual(49);

            expect(numberUtil.getPercentWithPrecision([12.34, 34.56, 53.1], 0, 1)).toEqual(12.3);
            expect(numberUtil.getPercentWithPrecision([12.34, 34.56, 53.1], 1, 1)).toEqual(34.6);
            expect(numberUtil.getPercentWithPrecision([12.34, 34.56, 53.1], 2, 1)).toEqual(53.1);

            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 0, 0)).toEqual(17);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 1, 0)).toEqual(48);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 2, 0)).toEqual(26);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 3, 0)).toEqual(9);
        });

        testCase('NaN data', function (numberUtil) {
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-'], 0, 0)).toEqual(17);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-'], 1, 0)).toEqual(48);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-'], 2, 0)).toEqual(26);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-'], 3, 0)).toEqual(9);
            expect(numberUtil.getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-'], 4, 0)).toEqual(0);

            expect(numberUtil.getPercentWithPrecision([0, undefined, '-', null, NaN], 0, 0)).toEqual(0);
            expect(numberUtil.getPercentWithPrecision([0, undefined, '-', null, NaN], 1, 0)).toEqual(0);
            expect(numberUtil.getPercentWithPrecision([0, undefined, '-', null, NaN], 2, 0)).toEqual(0);
            expect(numberUtil.getPercentWithPrecision([0, undefined, '-', null, NaN], 3, 0)).toEqual(0);
            expect(numberUtil.getPercentWithPrecision([0, undefined, '-', null, NaN], 4, 0)).toEqual(0);
        });
    });


    describe('nice', function () {
        testCase('extreme', function (numberUtil) {
            // Should not be 0.30000000000000004
            expect(numberUtil.nice(0.3869394696651766, true)).toEqual(0.3);
            expect(numberUtil.nice(0.3869394696651766)).toEqual(0.5);
            expect(numberUtil.nice(0.00003869394696651766, true)).toEqual(0.00003);
            expect(numberUtil.nice(0.00003869394696651766, false)).toEqual(0.00005);
            expect(numberUtil.nice(0, true)).toEqual(0);
            expect(numberUtil.nice(0)).toEqual(0);
            expect(numberUtil.nice(13, true)).toEqual(10);
            expect(numberUtil.nice(13)).toEqual(20);
            expect(numberUtil.nice(3900000000000000000021, true)).toEqual(3000000000000000000000);
            expect(numberUtil.nice(3900000000000000000021)).toEqual(5000000000000000000000);
            expect(numberUtil.nice(0.00000000000000000656939, true)).toEqual(0.000000000000000005);
            expect(numberUtil.nice(0.00000000000000000656939)).toEqual(0.00000000000000001);
            expect(numberUtil.nice(0.10000000000000000656939, true)).toEqual(0.1);
            expect(numberUtil.nice(0.10000000000000000656939)).toEqual(0.2);
        });
    });

});