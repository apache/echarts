
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
    linearMap, parseDate, reformIntervals, getPrecisionSafe, getPrecision,
    getPercentWithPrecision, quantityExponent, quantity, nice,
    isNumeric, numericToNumber, addSafe
} from '@/src/util/number';


describe('util/number', function () {

    describe('linearMap', function () {

        it('accuracyError', function () {
            let range;
            let result;

            range = [-15918.3, 17724.9];
            result = linearMap(100, [0, 100], range, true);
            // Should not be 17724.899999999998.
            expect(result).toEqual(range[1]);

            range = [-62.83, 83.56];
            result = linearMap(100, [0, 100], range, true);
            // Should not be 83.55999999999999.
            expect(result).toEqual(range[1]);
        });

        it('clamp', function () {
            let range;
            let result;

            // (1) normal order.
            range = [-15918.3, 17724.9];
            // bigger than max
            result = linearMap(100.1, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // smaller than min
            result = linearMap(-2, [0, 100], range, true);
            expect(result).toEqual(range[0]);
            // equals to max
            result = linearMap(100, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // equals to min
            result = linearMap(0, [0, 100], range, true);
            expect(result).toEqual(range[0]);

            // (2) inverse range
            range = [17724.9, -15918.3];
            // bigger than max
            result = linearMap(102, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // smaller than min
            result = linearMap(-0.001, [0, 100], range, true);
            expect(result).toEqual(range[0]);
            // equals to max
            result = linearMap(100, [0, 100], range, true);
            expect(result).toEqual(range[1]);
            // equals to min
            result = linearMap(0, [0, 100], range, true);
            expect(result).toEqual(range[0]);

            // (2) inverse domain
            // bigger than max, inverse domain
            range = [-15918.3, 17724.9];
            // bigger than max
            result = linearMap(102, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // smaller than min
            result = linearMap(-0.001, [100, 0], range, true);
            expect(result).toEqual(range[1]);
            // equals to max
            result = linearMap(100, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // equals to min
            result = linearMap(0, [100, 0], range, true);
            expect(result).toEqual(range[1]);

            // (3) inverse domain, inverse range
            range = [17724.9, -15918.3];
            // bigger than max
            result = linearMap(100.1, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // smaller than min
            result = linearMap(-2, [100, 0], range, true);
            expect(result).toEqual(range[1]);
            // equals to max
            result = linearMap(100, [100, 0], range, true);
            expect(result).toEqual(range[0]);
            // equals to min
            result = linearMap(0, [100, 0], range, true);
            expect(result).toEqual(range[1]);
        });

        it('noClamp', function () {
            let range;
            let result;

            // (1) normal order.
            range = [-15918.3, 17724.9];
            // bigger than max
            result = linearMap(100.1, [0, 100], range, false);
            expect(result).toEqual(17758.543199999996);
            // smaller than min
            result = linearMap(-2, [0, 100], range, false);
            expect(result).toEqual(-16591.164);
            // equals to max
            result = linearMap(100, [0, 100], range, false);
            expect(result).toEqual(17724.9);
            // equals to min
            result = linearMap(0, [0, 100], range, false);
            expect(result).toEqual(-15918.3);

            // (2) inverse range
            range = [17724.9, -15918.3];
            // bigger than max
            result = linearMap(102, [0, 100], range, false);
            expect(result).toEqual(-16591.163999999997);
            // smaller than min
            result = linearMap(-0.001, [0, 100], range, false);
            expect(result).toEqual(17725.236432);
            // equals to max
            result = linearMap(100, [0, 100], range, false);
            expect(result).toEqual(-15918.3);
            // equals to min
            result = linearMap(0, [0, 100], range, false);
            expect(result).toEqual(17724.9);

            // (2) inverse domain
            // bigger than max, inverse domain
            range = [-15918.3, 17724.9];
            // bigger than max
            result = linearMap(102, [100, 0], range, false);
            expect(result).toEqual(-16591.164);
            // smaller than min
            result = linearMap(-0.001, [100, 0], range, false);
            expect(result).toEqual(17725.236432);
            // equals to max
            result = linearMap(100, [100, 0], range, false);
            expect(result).toEqual(-15918.3);
            // equals to min
            result = linearMap(0, [100, 0], range, false);
            expect(result).toEqual(17724.9);

            // (3) inverse domain, inverse range
            range = [17724.9, -15918.3];
            // bigger than max
            result = linearMap(100.1, [100, 0], range, false);
            expect(result).toEqual(17758.5432);
            // smaller than min
            result = linearMap(-2, [100, 0], range, false);
            expect(result).toEqual(-16591.163999999997);
            // equals to max
            result = linearMap(100, [100, 0], range, false);
            expect(result).toEqual(17724.9);
            // equals to min
            result = linearMap(0, [100, 0], range, false);
            expect(result).toEqual(-15918.3);
        });

        it('normal', function () {

            doTest(true);
            doTest(false);

            function doTest(clamp: boolean) {
                let range;
                let result;

                // normal
                range = [444, 555];
                result = linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(488.4);

                // inverse range
                range = [555, 444];
                result = linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(510.6);

                // inverse domain and range
                range = [555, 444];
                result = linearMap(40, [100, 0], range, clamp);
                expect(result).toEqual(488.4);

                // inverse domain
                range = [444, 555];
                result = linearMap(40, [100, 0], range, clamp);
                expect(result).toEqual(510.6);
            }
        });

        it('zeroInterval', function () {

            doTest(true);
            doTest(false);

            function doTest(clamp: boolean) {
                let range;
                let result;

                // zero domain interval
                range = [444, 555];
                result = linearMap(40, [1212222223.2323232, 1212222223.2323232], range, clamp);
                expect(result).toEqual(499.5); // half of range.

                // zero range interval
                range = [1221212.1221372238, 1221212.1221372238];
                result = linearMap(40, [0, 100], range, clamp);
                expect(result).toEqual(1221212.1221372238);

                // zero domain interval and range interval
                range = [1221212.1221372238, 1221212.1221372238];
                result = linearMap(40, [43.55454545, 43.55454545], range, clamp);
                expect(result).toEqual(1221212.1221372238);
            }
        });
    });

    describe('parseDate', function () {
        it('parseDate', function () {

            // Invalid Date
            expect('' + parseDate(null)).toEqual('Invalid Date');
            expect('' + parseDate(void 0)).toEqual('Invalid Date');
            expect('' + parseDate('asdf')).toEqual('Invalid Date');
            expect('' + parseDate(NaN)).toEqual('Invalid Date');
            expect('' + parseDate('-')).toEqual('Invalid Date');
            expect('' + parseDate('20120304')).toEqual('Invalid Date');

            // Input instance of Date or timestamp
            expect(+parseDate(new Date('2012-03-04'))).toEqual(1330819200000);
            expect(+parseDate(1330819200000)).toEqual(1330819200000);
            expect(+parseDate(1330819199999.99)).toEqual(1330819200000);
            expect(+parseDate(1330819200000.01)).toEqual(1330819200000);

            // ISO string
            expect(+parseDate('2012-03')).toEqual(+new Date('2012-03-01T00:00:00'));
            expect(+parseDate('2012-03-04')).toEqual(+new Date('2012-03-04T00:00:00'));
            expect(+parseDate('2012-03-04 05')).toEqual(+new Date('2012-03-04T05:00:00'));
            expect(+parseDate('2012-03-04T05')).toEqual(+new Date('2012-03-04T05:00:00'));
            expect(+parseDate('2012-03-04 05:06')).toEqual(+new Date('2012-03-04T05:06:00'));
            expect(+parseDate('2012-03-04T05:06')).toEqual(+new Date('2012-03-04T05:06:00'));
            expect(+parseDate('2012-03-04 05:06:07')).toEqual(+new Date('2012-03-04T05:06:07'));
            expect(+parseDate('2012-03-04T05:06:07')).toEqual(+new Date('2012-03-04T05:06:07'));
            expect(+parseDate('2012-03-04T05:06:07.123')).toEqual(+new Date('2012-03-04T05:06:07.123'));
            expect(+parseDate('2012-03-04T05:06:07,123')).toEqual(+new Date('2012-03-04T05:06:07.123'));
            // TODO new Date('2012-03-04T05:06:07.12') is same to '2012-03-04T05:06:07.120', not '2012-03-04T05:06:07.012'
            expect(+parseDate('2012-03-04T05:06:07.12')).toEqual(+new Date('2012-03-04T05:06:07.012'));
            expect(+parseDate('2012-03-04T05:06:07.1')).toEqual(+new Date('2012-03-04T05:06:07.001'));
            expect(+parseDate('2012-03-04T05:06:07,123Z')).toEqual(+new Date('2012-03-04T05:06:07.123Z'));
            expect(+parseDate('2012-03-04T05:06:07.123+0800')).toEqual(1330808767123);
            expect(+parseDate('2012-03-04T05:06:07.123+08:00')).toEqual(1330808767123);
            expect(+parseDate('2012-03-04T05:06:07.123-0700')).toEqual(1330862767123);
            expect(+parseDate('2012-03-04T05:06:07.123-07:00')).toEqual(1330862767123);
            expect(+parseDate('2012-03-04T5:6:7.123-07:00')).toEqual(1330862767123);
            expect(+parseDate('2012-03-04T05:06:07.123000Z')).toEqual(+new Date('2012-03-04T05:06:07.123Z'));

            // Other string
            expect(+parseDate('2012')).toEqual(+new Date('2012-01-01T00:00:00'));
            expect(+parseDate('2012/03')).toEqual(+new Date('2012-03-01T00:00:00'));
            expect(+parseDate('2012/03/04')).toEqual(+new Date('2012-03-04T00:00:00'));
            expect(+parseDate('2012-3-4')).toEqual(+new Date('2012-03-04T00:00:00'));
            expect(+parseDate('2012/3')).toEqual(+new Date('2012-03-01T00:00:00'));
            expect(+parseDate('2012/3/4')).toEqual(+new Date('2012-03-04T00:00:00'));
            expect(+parseDate('2012/3/4 2:05')).toEqual(+new Date('2012-03-04T02:05:00'));
            expect(+parseDate('2012/03/04 2:05')).toEqual(+new Date('2012-03-04T02:05:00'));
            expect(+parseDate('2012/3/4 2:05:08')).toEqual(+new Date('2012-03-04T02:05:08'));
            expect(+parseDate('2012/03/04 2:05:08')).toEqual(+new Date('2012-03-04T02:05:08'));
            expect(+parseDate('2012/3/4 2:05:08.123')).toEqual(+new Date('2012-03-04T02:05:08.123'));
            expect(+parseDate('2012/03/04 2:05:08.123')).toEqual(+new Date('2012-03-04T02:05:08.123'));
        });
    });


    describe('reformIntervals', function () {

        it('basic', function () {
            // all
            expect(reformIntervals([
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
            expect(reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [50, 150], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [0, 1]}
            ]);

            // remove overlap on edge
            expect(reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]},
                {interval: [62, 150], close: [0, 1]}
            ]);

            // remove included interval
            expect(reformIntervals([
                {interval: [30, 40], close: [1, 1]},
                {interval: [42, 54], close: [1, 1]},
                {interval: [45, 60], close: [1, 1]},
                {interval: [18, 62], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]}
            ]);

            // remove edge
            expect(reformIntervals([
                {interval: [18, 62], close: [1, 1]},
                {interval: [30, 62], close: [1, 1]}
            ])).toEqual([
                {interval: [18, 62], close: [1, 1]}
            ]);
        });
    });


    describe('getPrecision', function () {
        function basicCases(fn: (val: number) => number): void {
            expect(fn(10)).toEqual(0);
            expect(fn(1)).toEqual(0);
            expect(fn(0)).toEqual(0);
            expect(fn(100000000000000000000000000000)).toEqual(0);
            expect(fn(0.1)).toEqual(1);
            expect(fn(0.100)).toEqual(1);
            expect(fn(0.0032)).toEqual(4);
            expect(fn(0.0000000000034)).toEqual(13);
            expect(fn(1e+100)).toEqual(0);
            expect(fn(3.456E100)).toEqual(0);
            expect(fn(3.456E-100)).toEqual(103);
            expect(fn(3.4e-10)).toEqual(11);
            expect(fn(3.4e-0)).toEqual(1);
            expect(fn(3e-0)).toEqual(0);
            expect(fn(3e-1)).toEqual(1);
            expect(fn(3.4e0)).toEqual(1);
            expect(fn(3.45e1)).toEqual(1);
            expect(fn(3.45e-1)).toEqual(3);
            expect(fn(3.45e2)).toEqual(0);
            expect(fn(.456e2)).toEqual(1);
            expect(fn(.456e-2)).toEqual(5);
            expect(fn(.4e2)).toEqual(0);
            expect(fn(.4e-2)).toEqual(3);
        }

        it('getPrecision_basisc', function () {
            basicCases(getPrecision);
        });
        it('getPrecisionSafe_basisc', function () {
            basicCases(getPrecisionSafe);
        });
        it('getPrecision_equal_random', function () {
            function makeRandomNumber(): number {
                const p1 = Math.round(Math.random() * 100) + '';
                const p2 = Math.round(Math.random() * 10000) + '';
                const p3 = (Math.round(Math.random() * 20) - 100) + '';

                return +(p1 + '.' + p2 + 'e' + p3);
            }

            for (let i = 0; i < 500; i++) {
                const num = makeRandomNumber();
                const precision1 = getPrecision(num);
                const precision2 = getPrecisionSafe(num);

                expect(precision1).toEqual(precision2);
            }
        });

    });

    describe('getPrecisionSafe', function () {
        it('basic', function () {
            expect(getPrecisionSafe(10)).toEqual(0);
            expect(getPrecisionSafe(1)).toEqual(0);
            expect(getPrecisionSafe(0)).toEqual(0);
            expect(getPrecisionSafe(100000000000000000000000000000)).toEqual(0);
            expect(getPrecisionSafe(0.1)).toEqual(1);
            expect(getPrecisionSafe(0.100)).toEqual(1);
            expect(getPrecisionSafe(0.0032)).toEqual(4);
            expect(getPrecisionSafe(0.0000000000034)).toEqual(13);
            expect(getPrecisionSafe(1e+100)).toEqual(0);
            expect(getPrecisionSafe(3.456E100)).toEqual(0);
            expect(getPrecisionSafe(3.456E-100)).toEqual(103);
            expect(getPrecisionSafe(3.4e-10)).toEqual(11);
            expect(getPrecisionSafe(3.456e-100)).toEqual(103);
            expect(getPrecisionSafe(3.4e-0)).toEqual(1);
            expect(getPrecisionSafe(3e-0)).toEqual(0);
            expect(getPrecisionSafe(3e-1)).toEqual(1);
            expect(getPrecisionSafe(3.4e0)).toEqual(1);
            expect(getPrecisionSafe(3.45e1)).toEqual(1);
            expect(getPrecisionSafe(3.45e-1)).toEqual(3);
            expect(getPrecisionSafe(3.45e2)).toEqual(0);
            expect(getPrecisionSafe(.456e2)).toEqual(1);
            expect(getPrecisionSafe(.456e-2)).toEqual(5);
            expect(getPrecisionSafe(.4e2)).toEqual(0);
            expect(getPrecisionSafe(.4e-2)).toEqual(3);
        });
    });


    describe('addSafe', function () {
        it('basic', function () {
            // Most of the test cases copied from
            // https://github.com/MikeMcl/bignumber.js/blob/v9.0.0/test/methods/plus.js (MIT)
            // https://github.com/MikeMcl/decimal.js/blob/v5.0.3/test/modules/plus.js (MIT)

            function test(val0: number, val1: number, expected: number): void {
                expect(addSafe(val0, val1)).toEqual(expected);
            }

            test(1, 0, 1);
            test(1, -0, 1);
            test(-1, 0, -1);
            test(-1, -0, -1);
            test(1, NaN, NaN);
            test(-1, NaN, NaN);
            test(0, NaN, NaN);
            test(-0, NaN, NaN);
            test(NaN, NaN, NaN);
            test(1, Infinity, Infinity);
            test(1, -Infinity, -Infinity);
            test(-1, Infinity, Infinity);
            test(-1, -Infinity, -Infinity);
            test(0, Infinity, Infinity);
            test(0, -Infinity, -Infinity);
            test(-0, Infinity, Infinity);
            test(-0, -Infinity, -Infinity);
            test(0, 1, 1);
            test(0, -1, -1);
            test(-0, 1, 1);
            test(-0, -1, -1);
            test(NaN, 4534534.45435435, NaN);
            test(NaN, 99999.999, NaN);
            test(Infinity, 354.345341, Infinity);
            test(-Infinity, -Infinity, -Infinity);
            test(Infinity, -999e99, Infinity);
            test(1.21123e43, -Infinity, -Infinity);
            test(-999.0, Infinity, Infinity);
            test(657.342e-45, -Infinity, -Infinity);
            test(1, Number.POSITIVE_INFINITY, Infinity);
            test(1, Number.NEGATIVE_INFINITY, -Infinity);
            test(NaN, 4534534.45435435, NaN);
            test(NaN, 99999.999, NaN);
            test(Infinity, 354.345341, Infinity);
            test(1.21123e43, -Infinity, -Infinity);
            test(657.342e-45, -Infinity, -Infinity);
            test(Infinity, NaN, NaN);
            test(-Infinity, NaN, NaN);
            test(Infinity, Infinity, Infinity);
            test(Infinity, -Infinity, NaN);
            test(-Infinity, Infinity, NaN);
            test(-Infinity, -Infinity, -Infinity);

            test(0.1, 0.2, 0.3);
            test(2.3, -0.3, 2);
            test(33643.2, -15918.3, 17724.9);
            test(146.39, -62.83, 83.56);
            test(1.09, -0.13, 0.96);
            test(1, 0, 1);
            test(1, 1, 2);
            test(1, -45, -44);
            test(1, 22, 23);
            test(1, 6.1915, 7.1915);
            test(1, -1.02, -0.02);
            test(1, 0.09, 1.09);
            test(1, -0.0001, 0.9999);
            test(1, 8e5, 800001);
            test(1, 9E12, 9000000000001);
            test(1, 1e-14, 1.00000000000001);
            test(1, 3.345E-9, 1.000000003345);
            test(1, -345.43e+4, -3454299);
            test(1, -94.12E+0, -93.12);
            test(0, 0, 0);
            test(0, 0, 0);
            test(3, -0, 3);
            test(9.654, 0, 9.654);
            test(0, 0.001, 0.001);
            test(0, 111.1111111110000, 111.111111111);
            test(-1, 1, 0);
            test(-0.01, 0.01, 0);
            test(54, -54, 0);
            test(9.99, -9.99, 0);
            test(0.00000, -0.000001, -0.000001);
            test(0.0000023432495704937, -0.0000023432495704937, 0);
            test(100, 100, 200);
            test(-999.99, 0.01, -999.98);
            test(10, 4, 14);
            test(3.333, -4, -0.667);
            test(-1, -0.1, -1.1);
            test(43534.5435, 0.054645, 43534.598145);
            test(99999, 1, 100000);

            test(1, 0, 1);
            test(1, 1, 2);
            test(1, -45, -44);
            test(1, 22, 23);
            test(1, 6.1915, 7.1915);
            test(1, -1.02, -0.02);
            test(1, 0.09, 1.09);
            test(1, -0.0001, 0.9999);
            test(1, 8e5, 800001);
            test(1, 9E12, 9000000000001);
            test(1, 1e-14, 1.00000000000001);
            test(1, 3.345E-9, 1.000000003345);
            test(1, -345.43e+4, -3454299);
            test(1, -94.12E+0, -93.12);
            test(1, 4.001, 5.001);
            test(0, 0, 0);
            test(0, +0, 0);
            test(0, 0, 0);
            test(3, -0, 3);
            test(9.654, 0, 9.654);
            test(0, 0.001, 0.001);
            test(0, 111.1111111110000, 111.111111111);
            test(-1, 1, 0);
            test(-0.01, 0.01, 0);
            test(54, -54, 0);
            test(9.99, -9.99, 0);
            test(0.0000023432495704937, -0.0000023432495704937, 0);
            test(100, 100, 200);
            test(-999.99, 0.01, -999.98);
            test(3.333, -4, -0.667);
            test(-1, -0.1, -1.1);
            test(43534.5435, 0.054645, 43534.598145);
            test(99999, 1, 100000);
            test(+3e0, 4, 7);

            test(-0.000000046, 0, -4.6e-8);
            test(0, -5.1, -5.1);
            test(1.3, 2, 3.3);
            test(1.02, 1.2, 2.22);
            test(3.0, 0, 3);
            test(3, 31.9, 34.9);
            test(0, -0.0000000000000712, -7.12e-14);
            test(1.10, 5, 6.1);
            test(4.2, -0.000000062, 4.199999938);
            test(1, 0, 1);
            test(-5.1, 1, -4.1);
            test(0, -1, -1);
            test(699, -4, 695);
            test(0, -1, -1);
            test(1.6, -27.2, -25.6);
            test(0, -7, -7);
            test(3.0, -4, -1);
            test(0, -2.0, -2);
            test(0, -3, -3);
            test(-2, 1, -1);
            test(-9, -1, -10);
            test(2, -1.1, 0.9);
            test(-5, -3, -8);
            test(7, -37, -30);
            test(-3, -5.0, -8);
            test(1.2, -0.0000194, 1.1999806);
            test(0, 5, 5);
            test(0, 1, 1);
            test(-0.000000000000214, 0, -2.14e-13);
            test(0, 0, 0);
            test(0, -1, -1);
            test(-3, 156, 153);
            test(231, 0.00000000408, 231.00000000408);
            test(0, -1.7, -1.7);
            test(-4.16, 0, -4.16);
            test(0, 5.8, 5.8);
            test(1.5, 5, 6.5);
            test(4.0, -6.19, -2.19);
            test(-1.46, -5.04, -6.5);
            test(5.11, 6, 11.11);
            test(-2.11, 0, -2.11);
            test(0.0067, -5, -4.9933);
            test(0, 2, 2);
            test(1.0, -24.4, -23.4);
            test(-0.000015, -6, -6.000015);
            test(1.5, 0, 1.5);
            test(4.1, -3, 1.1);
            test(-2, -1, -3);
            test(3, 1.5, 4.5);
            test(-7.8, -3, -10.8);
            test(-32, 17.6, -14.4);
            test(0, 0, 0);
            test(-47.4, -1, -48.4);
            test(15.4, 0.000014, 15.400014);
            test(7.2, 2.9, 10.1);
            test(-86.5, -47.2, -133.7);
            test(1.1, -31.4, -30.3);
            test(-121, 3, -118);
            test(-4, 3, -1);
            test(-3.98, 1.2, -2.78);
            test(-4.90, 0, -4.9);
            test(2.28, 0, 2.28);
            test(-0.0000000000051, -0.0000000000000000236, -5.1000236e-12);
            test(1, -28, -27);
            test(0, -3.12, -3.12);
            test(7, 24.9, 31.9);
            test(-7.8, 17, 9.2);
            test(1, 1, 2);
            test(0.00000000000000000016, -2, -1.99999999999999999984);
            test(6, 8.5, 14.5);
            test(1.10, -1, 0.1);
            test(-1, 3.3, 2.3);
            test(4, -1.3, 2.7);
            test(0, 2.09, 2.09);
            test(-1, 0, -1);
            test(-1, 0, -1);
            test(0, 8.1, 8.1);
            test(-3, -4.96, -7.96);
            test(9.73, 0, 9.73);
            test(1, 0, 1);
            test(-1, -3, -4);
            test(3, -3.0, 0);
            test(-2.78, -403, -405.78);
            test(1, -0.00063, 0.99937);
            test(2, 0, 2);
            test(3, 7, 10);
            test(-1, 0, -1);
            test(-4.1, -4, -8.1);
            test(-5, 7, 2);
            test(-7, -0.00000000000000000511, -7.00000000000000000511);
            test(0, 0.000000000000000000233, 2.33e-19);
            test(1.2, -8.5, -7.3);
            test(2, -2, 0);
            test(-24, -5, -29);
            test(-2.1, 0.0114, -2.0886);
            test(8, -5, 3);
            test(0.061, 12.1, 12.161);
            test(0, 2.7, 2.7);
            test(-0.00000871, 0, -0.00000871);
            test(0, 0, 0);
            test(2, -6.0, -4);
            test(9, -1.2, 7.8);
            test(7, 0, 7);
            test(0, 0.000000000000000213, 2.13e-16);
            test(2.5, 0, 2.5);
            test(0, 0.00211, 0.00211);
            test(6.4, -15.7, -9.3);
            test(1.5, 0, 1.5);
            test(-41, 0.113, -40.887);
            test(-7.1, 2, -5.1);
            test(6, -1.6, 4.4);
            test(-1.2, 0, -1.2);
            test(-3, 13.3, 10.3);
            test(0, 0, 0);
            test(0, -105, -105);
            test(-0.52, -40.9, -41.42);
            test(1, 0, 1);
            test(0, 0, 0);
            test(-5.1, -0.00024, -5.10024);
            test(-0.000000000000027, 6, 5.999999999999973);
            test(125, -2, 123);
            test(2, -365, -363);
            test(6.2, -55.1, -48.9);
            test(4.9, -6, -1.1);
            test(0.0000000482, 0.0000000019, 5.01e-8);
            test(0, 1.7, 1.7);
            test(78.3, 2.2, 80.5);
            test(-53.9, 4.0, -49.9);
            test(0, 2.1, 2.1);
            test(-1.0, -143, -144);
            test(-1, 2.2, 1.2);
            test(1, 84.9, 85.9);
            test(0, 26, 26);
            test(51, 0.000000000000000757, 51.000000000000000757);
            test(1.1, -3.67, -2.57);
            test(-1.2, 1.30, 0.1);
            test(-0.00000000000021, 0.0000000013, 1.29979e-9);
            test(-1.6, -1, -2.6);
            test(-2.0, 63, 61);
            test(-3, 7, 4);
            test(-221, 38, -183);
            test(-1, 0, -1);
            test(46.4, 2, 48.4);
            test(0, 0, 0);
            test(-1, -0.0000000853, -1.0000000853);
            test(79, 0.000190, 79.00019);
            test(0, -8.59, -8.59);
            test(1, -1, 0);
            test(0.000000000000000000110, -5.8, -5.79999999999999999989);
            test(6, 3.86, 9.86);
            test(-9, 8, -1);
            test(-1.0, -45.9, -46.9);
            test(-2, 1, -1);
            test(17.3, 1, 18.3);
            test(0, 0.23, 0.23);
            test(1.14, 0, 1.14);
            test(-1.99, -1, -2.99);
            test(9, 0.0000000000000000000157, 9.0000000000000000000157);
            test(-11, 89, 78);
            test(0, -13.9, -13.9);
            test(0.00000000000015, 86, 86.00000000000015);
            test(278, -2, 276);
            test(0, -2.18, -2.18);
            test(0, -0.000000029, -2.9e-8);
            test(-6, -0.0000000045, -6.0000000045);
            test(0, -24.7, -24.7);
            test(6.0, 124, 130);
            test(0.00089, -0.117, -0.11611);
            test(-0.94, 44, 43.06);
            test(52.1, -4, 48.1);
            test(0, -0.00000062, -6.2e-7);
            test(2, -0.000000000242, 1.999999999758);
            test(-6.2, 1, -5.2);
            test(3.4, 1, 4.4);
            test(-1.5, 3.8, 2.3);
            test(3, -1.27, 1.73);
            test(-1, 7, 6);
            test(-2.29, -4.8, -7.09);
            test(0, 0, 0);
            test(-5, -0.0000000000000016, -5.0000000000000016);
            test(2.0, -1.5, 0.5);
            test(94.2, -1.4, 92.8);
            test(37, -0.000000000000000000028, 36.999999999999999999972);
            test(-0.00000000000000000750, 1, 0.9999999999999999925);
            test(1.5, -1.7, -0.2);
            test(-1, 20.0, 19);
            test(2.6, 0, 2.6);
            test(0, -28.4, -28.4);
            test(-12.1, -14, -26.1);
            test(1.7, 0.000000041, 1.700000041);
            test(9.5, 4, 13.5);
            test(2.8, 101, 103.8);
            test(0.000000022, 0, 2.2e-8);
            test(6, 28, 34);
            test(7, -97, -90);
            test(-1.7, -3, -4.7);
            test(107, 6.2, 113.2);
            test(-0.000000000000000118, -2, -2.000000000000000118);
            test(-0.000000000000000451, -5.3, -5.300000000000000451);
            test(0, -1, -1);
            test(0.0000055, 145, 145.0000055);
            test(0, -8, -8);
            test(0, -2.7, -2.7);
            test(-3, 0, -3);
            test(-7, 7, 0);
            test(-1.1, 0, -1.1);
            test(-92, -1.4, -93.4);
            test(-2.7, -3.25, -5.95);
            test(68.5, 509, 577.5);
            test(0, 0, 0);
            test(22.6, -1, 21.6);
            test(373, 0, 373);
            test(0, -5, -5);
            test(32.2, -7, 25.2);
            test(-1, -1.7, -2.7);
            test(-1.3, 0.0000000048, -1.2999999952);
            test(5, -5, 0);
            test(0, 11.9, 11.9);
            test(-0.82, 25, 24.18);
            test(0, 3.1, 3.1);
            test(0.000024, 6, 6.000024);
            test(10, -0.000000116, 9.999999884);
            test(977, 0, 977);
            test(13, -0.00000205, 12.99999795);
            test(-7, -9.0, -16);
            test(0, 1.05, 1.05);
            test(1, 0, 1);
            test(-10.1, 0, -10.1);
            test(2.2, -0.000000000000061, 2.199999999999939);
            test(0, -0.0000085, -0.0000085);
            test(3, 3.5, 6.5);
            test(1, 2.8, 3.8);
            test(-2, -8.60, -10.6);
            test(223, 9, 232);
            test(-20.4, -213, -233.4);
            test(0, 2, 2);
            test(-2.9, -1.3, -4.2);
            test(3.0, 0, 3);
            test(-5, 0.00000000000000000011, -4.99999999999999999989);
            test(-0.000088, 70.4, 70.399912);
            test(-1, -505, -506);
            test(0, -4, -4);
            test(768, 1.1, 769.1);
            test(2, 0, 2);
            test(88, 1.4, 89.4);
            test(7.8, 0.0000000000000025, 7.8000000000000025);
            test(2.6, -3.20, -0.6);
            test(-24, -2.6, -26.6);
            test(0, -1, -1);
            test(-6, 0.00059, -5.99941);
            test(14, 4.1, 18.1);
            test(-30.5, 1.48, -29.02);
            test(-509, 5, -504);
            test(-1, 3, 2);
            test(1.3, 0.000103, 1.300103);
            test(-2.8, 19.1, 16.3);
            test(10.07, 0.581, 10.651);
            test(3, -2, 1);
            test(-29, 4, -25);
            test(-3.80, -48.2, -52);
            test(6, -21.3, -15.3);
            test(3, -1.7, 1.3);
            test(0, 0.00000000033, 3.3e-10);
            test(0.49, 0, 0.49);
            test(7, 1.1, 8.1);
            test(1, -2.73, -1.73);
            test(0, -3.89, -3.89);
            test(1.27, 9, 10.27);
            test(-0.00000000151, -25, -25.00000000151);

            // PENDING: whether to support this case?
            // test(-11.7, 0.000000000000014, -11.699999999999986);

        });
    });

    describe('getPercentWithPrecision', function () {
        it('basic', function () {

            // console.log(numberUtil.getPercentWithPrecision([-1.678, -4.783, -2.664, -0.875], 0, 2));

            // const arr = [49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5, 49.5];
            const arr = [49.5, NaN];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                result.push(
                    getPercentWithPrecision(arr, i, 0)
                );
            }
            // let sum = 0;
            // for (let i = 0; i < result.length; i++) {
            //     sum += result[i];
            // }

            expect(getPercentWithPrecision([50.5, 49.5], 0, 0)).toEqual(51);
            expect(getPercentWithPrecision([50.5, 49.5], 1, 0)).toEqual(49);

            expect(getPercentWithPrecision([12.34, 34.56, 53.1], 0, 1)).toEqual(12.3);
            expect(getPercentWithPrecision([12.34, 34.56, 53.1], 1, 1)).toEqual(34.6);
            expect(getPercentWithPrecision([12.34, 34.56, 53.1], 2, 1)).toEqual(53.1);

            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 0, 0)).toEqual(17);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 1, 0)).toEqual(48);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 2, 0)).toEqual(26);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875], 3, 0)).toEqual(9);
        });

        it('NaN data', function () {
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-' as any], 0, 0)).toEqual(17);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-' as any], 1, 0)).toEqual(48);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-' as any], 2, 0)).toEqual(26);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-' as any], 3, 0)).toEqual(9);
            expect(getPercentWithPrecision([1.678, 4.783, 2.664, 0.875, '-' as any], 4, 0)).toEqual(0);

            expect(getPercentWithPrecision([0, undefined, '-' as any, null, NaN], 0, 0)).toEqual(0);
            expect(getPercentWithPrecision([0, undefined, '-' as any, null, NaN], 1, 0)).toEqual(0);
            expect(getPercentWithPrecision([0, undefined, '-' as any, null, NaN], 2, 0)).toEqual(0);
            expect(getPercentWithPrecision([0, undefined, '-' as any, null, NaN], 3, 0)).toEqual(0);
            expect(getPercentWithPrecision([0, undefined, '-' as any, null, NaN], 4, 0)).toEqual(0);
        });
    });

    describe('quantityExponent', function () {
        it('basic', function () {
            expect(quantityExponent(1)).toEqual(0);
            expect(quantityExponent(9)).toEqual(0);
            expect(quantityExponent(12)).toEqual(1);
            expect(quantityExponent(123)).toEqual(2);
            expect(quantityExponent(1234)).toEqual(3);
            expect(quantityExponent(1234.5678)).toEqual(3);
            expect(quantityExponent(10)).toEqual(1);
            expect(quantityExponent(1000)).toEqual(3);
            expect(quantityExponent(10000)).toEqual(4);
        });

        it('decimals', function () {
            expect(quantityExponent(0.1)).toEqual(-1);
            expect(quantityExponent(0.001)).toEqual(-3);
            expect(quantityExponent(0.00123)).toEqual(-3);
        });

        it('large number', function () {
            expect(quantityExponent(3.14e100)).toEqual(100);
            expect(quantityExponent(3.14e-100)).toEqual(-100);
        });

        it('zero', function () {
            expect(quantityExponent(0)).toEqual(0);
        });
    });

    describe('quantity', function () {
        it('basic', function () {
            expect(quantity(1)).toEqual(1);
            expect(quantity(9)).toEqual(1);
            expect(quantity(12)).toEqual(10);
            expect(quantity(123)).toEqual(100);
            expect(quantity(1234)).toEqual(1000);
            expect(quantity(1234.5678)).toEqual(1000);
            expect(quantity(10)).toEqual(10);
            expect(quantity(1000)).toEqual(1000);
            expect(quantity(10000)).toEqual(10000);
        });

        it('decimals', function () {
            expect(quantity(0.2)).toEqual(0.1);
            expect(quantity(0.002)).toEqual(0.001);
            expect(quantity(0.00123)).toEqual(0.001);
        });

        it('large number', function () {
            // expect(quantity(3.14e100)).toEqual(1e100);
            // expect(quantity(3.14e-100)).toEqual(1e-100);
        });

        it('zero', function () {
            expect(quantity(0)).toEqual(1);
        });
    });


    describe('nice', function () {
        it('extreme', function () {
            // Should not be 0.30000000000000004
            expect(nice(0.3869394696651766, true)).toEqual(0.3);
            expect(nice(0.3869394696651766)).toEqual(0.5);
            expect(nice(0.00003869394696651766, true)).toEqual(0.00003);
            expect(nice(0.00003869394696651766, false)).toEqual(0.00005);
            // expect(nice(0, true)).toEqual(0);
            // expect(nice(0)).toEqual(0);
            expect(nice(13, true)).toEqual(10);
            expect(nice(13)).toEqual(20);
            expect(nice(3900000000000000000021, true)).toEqual(3000000000000000000000);
            expect(nice(3900000000000000000021)).toEqual(5000000000000000000000);
            expect(nice(0.00000000000000000656939, true)).toEqual(0.000000000000000005);
            expect(nice(0.00000000000000000656939)).toEqual(0.00000000000000001);
            expect(nice(0.10000000000000000656939, true)).toEqual(0.1);
            expect(nice(0.10000000000000000656939)).toEqual(0.2);
        });
    });

    describe('numeric', function () {

        function testNumeric(rawVal: unknown, tarVal: number, beNumeric: boolean) {
            expect(isNumeric(rawVal)).toEqual(beNumeric);
            expect(numericToNumber(rawVal)).toEqual(tarVal);
        }

        testNumeric(123, 123, true);
        testNumeric('123', 123, true);
        testNumeric(-123, -123, true);
        testNumeric('555', 555, true);
        testNumeric('555.6', 555.6, true);
        testNumeric('0555.6', 555.6, true);
        testNumeric('-555.6', -555.6, true);
        testNumeric(' 555 ', 555, true);
        testNumeric(' -555 ', -555, true);
        testNumeric(1e3, 1000, true);
        testNumeric(-1e3, -1000, true);
        testNumeric('1e3', 1000, true);
        testNumeric('-1e3', -1000, true);
        testNumeric(' \r \n 555 \t ', 555, true);
        testNumeric(' \r \n -555.6 \t ', -555.6, true);
        testNumeric(Infinity, Infinity, true);
        testNumeric(-Infinity, -Infinity, true);
        testNumeric('Infinity', Infinity, true);
        testNumeric('-Infinity', -Infinity, true);

        testNumeric(NaN, NaN, false);
        testNumeric(-NaN, NaN, false);
        testNumeric('NaN', NaN, false);
        testNumeric('-NaN', NaN, false);
        testNumeric(' NaN ', NaN, false);
        testNumeric(true, NaN, false);
        testNumeric(false, NaN, false);
        testNumeric(undefined, NaN, false);
        testNumeric(null, NaN, false);
        testNumeric(new Date(2012, 5, 12), NaN, false);
        testNumeric([], NaN, false);
        testNumeric({}, NaN, false);
        testNumeric(/1/, NaN, false);
        testNumeric(/0/, NaN, false);
        testNumeric('555a', NaN, false);
        testNumeric('- 555', NaN, false);
        testNumeric('0. 5', NaN, false);
        testNumeric('0 .5', NaN, false);
        testNumeric('0x11', NaN, false);
        testNumeric('', NaN, false);
        testNumeric('\n', NaN, false);
        testNumeric('\n\r', NaN, false);
        testNumeric('\t', NaN, false);
        testNumeric(String.fromCharCode(12288), NaN, false);
        testNumeric(function () {}, NaN, false);
    });

});