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


const dataValueHelper = require('../../../../lib/data/helper/dataValueHelper');

describe('data/helper/dataValueHelper', function () {

    describe('relational_comparison', function () {

        function expectDual(evalFn, lval, rval, resultLR, resultRL) {
            expect(evalFn(lval, rval)).toEqual(resultLR);
            expect(evalFn(rval, lval)).toEqual(resultRL);
        }

        const testerMap = {

            notEqualAndHasOrder: function (evalFn, op) {
                let asc;
                let desc;
                if (op === 'lt' || op === 'lte') {
                    asc = true;
                    desc = false;
                }
                else if (op === 'gt' || op === 'gte') {
                    asc = false;
                    desc = true;
                }
                else if (op === 'eq') {
                    asc = desc = false;
                }
                else if (op === 'ne') {
                    asc = desc = true;
                }

                expectDual(evalFn, 123, 555, asc, desc);
                expectDual(evalFn, -123, -555, desc, asc);
                expectDual(evalFn, -123, 123, asc, desc);

                expectDual(evalFn, Infinity, 123, desc, asc);
                expectDual(evalFn, -Infinity, -123, asc, desc);
                expectDual(evalFn, 'Infinity', 123, desc, asc);
                expectDual(evalFn, '-Infinity', 123, asc, desc);
                expectDual(evalFn, 123, '555', asc, desc);
                expectDual(evalFn, 555, '555.6', asc, desc);
                expectDual(evalFn, '-555', -555.6, desc, asc);
                expectDual(evalFn, 123, ' 555 ', asc, desc);
                expectDual(evalFn, ' -555 ', 123, asc, desc);
                expectDual(evalFn, 123, ' \r \n 555 \t ' + String.fromCharCode(12288), asc, desc);
            },

            notEqualAndNoOrder: function (evalFn, op) {
                const result = op === 'ne';
                const makeDate = () => new Date(2012, 5, 12);
                const makeFn = () => function () {};

                expectDual(evalFn, NaN, NaN, result, result);
                expectDual(evalFn, NaN, -NaN, result, result);
                expectDual(evalFn, NaN, 0, result, result);
                expectDual(evalFn, NaN, 2, result, result);
                expectDual(evalFn, 'NaN', NaN, result, result);
                expectDual(evalFn, 'NaN', 0, result, result);
                expectDual(evalFn, 'NaN', 2, result, result);
                expectDual(evalFn, '-NaN', -NaN, result, result);
                expectDual(evalFn, '-NaN', 0, result, result);
                expectDual(evalFn, '-NaN', 2, result, result);
                expectDual(evalFn, true, 0, result, result);
                expectDual(evalFn, false, 1, result, result);
                expectDual(evalFn, 'true', 0, result, result);
                expectDual(evalFn, 'false', 1, result, result);
                expectDual(evalFn, undefined, 2, result, result);
                expectDual(evalFn, undefined, 0, result, result);
                expectDual(evalFn, null, 2, result, result);
                expectDual(evalFn, null, 0, result, result);
                expectDual(evalFn, makeDate(), 0, result, result);
                expectDual(evalFn, makeDate(), makeDate(), result, result);
                expectDual(evalFn, makeDate(), +makeDate(), result, result);
                expectDual(evalFn, [], 1, result, result);
                expectDual(evalFn, [], 0, result, result);
                expectDual(evalFn, {}, 1, result, result);
                expectDual(evalFn, [], '0', result, result);
                expectDual(evalFn, {}, '1', result, result);
                expectDual(evalFn, {}, 0, result, result);
                expectDual(evalFn, {}, '1', result, result);
                expectDual(evalFn, {}, '0', result, result);
                expectDual(evalFn, /1/, 0, result, result);
                expectDual(evalFn, /0/, 0, result, result);
                expectDual(evalFn, '555a', 123, result, result);
                expectDual(evalFn, '2', '12', result, result); // '2' > '12' in JS but should not happen here.
                expectDual(evalFn, ' ', '', result, result);
                expectDual(evalFn, 0.5, '0. 5', result, result);
                expectDual(evalFn, '0.5', '0. 5', result, result);
                expectDual(evalFn, '- 5', -5, result, result);
                expectDual(evalFn, '-123.5', ' -123.5 ', result, result);
                expectDual(evalFn, '0x11', 17, result, result); // not 17 in int16.
                expectDual(evalFn, '0x11', 0, result, result);
                expectDual(evalFn, '0x0', 0, result, result);
                expectDual(evalFn, '0. 5', 0.5, result, result);
                expectDual(evalFn, '0 .5', 0.5, result, result);
                expectDual(evalFn, '', 2, result, result);
                expectDual(evalFn, '', 0, result, result);
                expectDual(evalFn, ' ', 2, result, result);
                expectDual(evalFn, ' ', 0, result, result);
                expectDual(evalFn, ' \n', '\n', result, result);
                expectDual(evalFn, '\n', 0, result, result);
                expectDual(evalFn, '\n', 2, result, result);
                expectDual(evalFn, {}, {}, result, result);
                expectDual(evalFn, {}, [], result, result);
                expectDual(evalFn, makeFn(), makeFn(), result, result);
                expectDual(evalFn, makeFn(), 0, result, result);
                expectDual(evalFn, makeFn(), 1, result, result);
                expectDual(evalFn, makeFn(), makeFn().toString(), result, result);
            },

            numericEqual: function (evalFn, op) {
                const result = op === 'eq' || op === 'lte' || op === 'gte';

                expectDual(evalFn, 123, 123, result, result);
                expectDual(evalFn, 1e3, 1000, result, result);
                expectDual(evalFn, -1e3, -1000, result, result);
                expectDual(evalFn, '1e3', 1000, result, result);
                expectDual(evalFn, '-1e3', -1000, result, result);
                expectDual(evalFn, 123, '123', result, result);
                expectDual(evalFn, 123, ' 123 ', result, result);
                expectDual(evalFn, 123.5, ' \n \r 123.5 \t ', result, result);
                expectDual(evalFn, 123.5, 123.5 + String.fromCharCode(12288), result, result);
                expectDual(evalFn, ' -123.5 ', -123.5, result, result);
                expectDual(evalFn, '011', 11, result, result); // not 9 in int8.
            },

            otherTypesEqual: function (evalFn, op) {
                const result = op === 'eq';

                const emptyObj = {};
                const emptyArr = [];
                const date = new Date(2012, 5, 12);
                const fn = function () {};
                expectDual(evalFn, emptyObj, emptyObj, result, result);
                expectDual(evalFn, emptyArr, emptyArr, result, result);
                expectDual(evalFn, date, date, result, result);
                expectDual(evalFn, fn, fn, result, result);
            }
        };

        function doTest(op) {
            expect(['lt', 'lte', 'gt', 'gte', 'eq', 'ne'].indexOf(op) >= 0).toEqual(true);
            it(op, () => {
                const comparator0 = dataValueHelper.createRelationalComparator(op);
                Object.keys(testerMap).forEach(name => {
                    const evalFn = (lVal, rVal) => {
                        return comparator0.evaluate(lVal, rVal);
                    };
                    testerMap[name](evalFn, op);
                });

                Object.keys(testerMap).forEach(name => {
                    const evalFn = (lVal, rVal) => {
                        const comparator1 = dataValueHelper.createRelationalComparator(op, true, rVal);
                        return comparator1.evaluate(lVal);
                    };
                    testerMap[name](evalFn, op);
                });
            });
        }

        doTest('lt');
        doTest('lte');
        doTest('gt');
        doTest('gte');
        doTest('eq');
        doTest('ne');

        it('isRelationalOperator', function () {
            expect(dataValueHelper.isRelationalOperator('lt')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('lte')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('gt')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('gte')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('eq')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('ne')).toEqual(true);
            expect(dataValueHelper.isRelationalOperator('')).toEqual(false);

            expect(dataValueHelper.isRelationalOperator(null)).toEqual(false);
            expect(dataValueHelper.isRelationalOperator(undefined)).toEqual(false);
            expect(dataValueHelper.isRelationalOperator(NaN)).toEqual(false);
            expect(dataValueHelper.isRelationalOperator('neq')).toEqual(false);
            expect(dataValueHelper.isRelationalOperator('ge')).toEqual(false);
            expect(dataValueHelper.isRelationalOperator('le')).toEqual(false);
        });

    });

});

