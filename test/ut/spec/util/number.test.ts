
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
    linearMap, parseDate, reformIntervals, getPrecisionSafe,
    getPercentWithPrecision, quantityExponent, quantity, nice,
    isNumeric, numericToNumber
} from '../../../../src/util/number';


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


    describe('getPrecisionSafe', function () {
        it('basic', function () {
            expect(getPrecisionSafe(10)).toEqual(0);
            expect(getPrecisionSafe(1)).toEqual(0);
            expect(getPrecisionSafe(0)).toEqual(0);
            expect(getPrecisionSafe(100000000000000000000000000000)).toEqual(0);
            expect(getPrecisionSafe(1e+100)).toEqual(0);
            expect(getPrecisionSafe(0.1)).toEqual(1);
            expect(getPrecisionSafe(0.100)).toEqual(1);
            expect(getPrecisionSafe(0.0032)).toEqual(4);
            expect(getPrecisionSafe(0.0000000000034)).toEqual(12);
            expect(getPrecisionSafe(3.4e-10)).toEqual(10);
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