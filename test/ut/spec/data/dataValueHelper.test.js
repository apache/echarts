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

const NO_SUCH_CASE = 'NO_SUCH_CASE';

// Tags for relational comparison cases.
// LT: less than, GT: greater than, INCMPR: incomparable
const TAG = {
    ONE_OR_TWO_NUMBER_L_LT_R: 'ONE_OR_TWO_NUMBER_L_LT_R',
    ONE_OR_TWO_NUMBER_L_GT_R: 'ONE_OR_TWO_NUMBER_L_GT_R',
    TWO_STRING_L_LT_R: 'TWO_STRING_L_LT_R',
    TWO_STRING_L_GT_R: 'TWO_STRING_L_GT_R',
    TWO_STRING_ONLY_NUMERIC_EQ: 'TWO_STRING_ONLY_NUMERIC_EQ',
    STRICT_EQ: 'STRICT_EQ',
    ONE_NUMBER_NUMERIC_EQ: 'ONE_NUMBER_NUMERIC_EQ',
    BOTH_INCMPR_NOT_EQ: 'BOTH_INCMPR_NOT_EQ',
    ONLY_L_INCMPR: 'ONLY_L_INCMPR',
    ONLY_R_INCMPR: 'ONLY_R_INCMPR'
};
const tagRevertPairs = [
    ['ONE_OR_TWO_NUMBER_L_LT_R', 'ONE_OR_TWO_NUMBER_L_GT_R'],
    ['TWO_STRING_L_LT_R', 'TWO_STRING_L_GT_R'],
    ['TWO_STRING_ONLY_NUMERIC_EQ', 'TWO_STRING_ONLY_NUMERIC_EQ'],
    ['STRICT_EQ', 'STRICT_EQ'],
    ['ONE_NUMBER_NUMERIC_EQ', 'ONE_NUMBER_NUMERIC_EQ'],
    ['BOTH_INCMPR_NOT_EQ', 'BOTH_INCMPR_NOT_EQ'],
    ['ONLY_L_INCMPR', 'ONLY_R_INCMPR']
];

const filterResultMap = {
    ONE_OR_TWO_NUMBER_L_LT_R: {
        lt: true,
        lte: true,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    ONE_OR_TWO_NUMBER_L_GT_R: {
        lt: false,
        lte: false,
        gt: true,
        gte: true,
        eq: false,
        ne: true
    },
    TWO_STRING_L_LT_R: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    TWO_STRING_L_GT_R: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    TWO_STRING_ONLY_NUMERIC_EQ: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    STRICT_EQ: {
        lt: false,
        lte: true,
        gt: false,
        gte: true,
        eq: true,
        ne: false
    },
    ONE_NUMBER_NUMERIC_EQ: {
        lt: false,
        lte: true,
        gt: false,
        gte: true,
        eq: true,
        ne: false
    },
    BOTH_INCMPR_NOT_EQ: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    ONLY_L_INCMPR: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    ONLY_R_INCMPR: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    }
};

const sortResultMap = {
    ONE_OR_TWO_NUMBER_L_LT_R: {
        asc_incmprmin: -1,
        asc_incmprmax: -1,
        desc_incmprmin: 1,
        desc_incmprmax: 1
    },
    ONE_OR_TWO_NUMBER_L_GT_R: {
        asc_incmprmin: 1,
        asc_incmprmax: 1,
        desc_incmprmin: -1,
        desc_incmprmax: -1
    },
    TWO_STRING_L_LT_R: {
        asc_incmprmin: -1,
        asc_incmprmax: -1,
        desc_incmprmin: 1,
        desc_incmprmax: 1
    },
    TWO_STRING_L_GT_R: {
        asc_incmprmin: 1,
        asc_incmprmax: 1,
        desc_incmprmin: -1,
        desc_incmprmax: -1
    },
    TWO_STRING_ONLY_NUMERIC_EQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    STRICT_EQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    ONE_NUMBER_NUMERIC_EQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    BOTH_INCMPR_NOT_EQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    ONLY_L_INCMPR: {
        asc_incmprmin: -1,
        asc_incmprmax: 1,
        desc_incmprmin: 1,
        desc_incmprmax: -1
    },
    ONLY_R_INCMPR: {
        asc_incmprmin: 1,
        asc_incmprmax: -1,
        desc_incmprmin: -1,
        desc_incmprmax: 1
    }
};

/**
 * @param {(lval: unknown, rval: unknown, caseTag: TAG) => void} evalFn
 */
function eachRelationalComparisonCase(evalFn) {

    const FULL_WIDTH_SPACE = String.fromCharCode(12288);

    const testerMap = {
        notEqualAndHasOrder: function () {
            expectDual(123, 555, TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual(-123, -555, TAG.ONE_OR_TWO_NUMBER_L_GT_R);
            expectDual(-123, 123, TAG.ONE_OR_TWO_NUMBER_L_LT_R);

            expectDual(Infinity, 123, TAG.ONE_OR_TWO_NUMBER_L_GT_R);
            expectDual(-Infinity, -123, TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual('Infinity', 123, TAG.ONE_OR_TWO_NUMBER_L_GT_R);
            expectDual('-Infinity', 123, TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual(123, '555', TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual(555, '555.6', TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual('-555', -555.6, TAG.ONE_OR_TWO_NUMBER_L_GT_R);
            expectDual(123, ' 555 ', TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual(' -555 ', 123, TAG.ONE_OR_TWO_NUMBER_L_LT_R);
            expectDual(123, ' \r \n 555 \t ' + FULL_WIDTH_SPACE, TAG.ONE_OR_TWO_NUMBER_L_LT_R);
        },

        notEqualAndNoOrder: function () {
            const makeDate = () => new Date(2012, 5, 12);
            const makeFn = () => function () {};

            expectDual(NaN, NaN, TAG.BOTH_INCMPR_NOT_EQ);
            expectDual(NaN, -NaN, TAG.BOTH_INCMPR_NOT_EQ);
            expectDual(NaN, 0, TAG.ONLY_L_INCMPR);
            expectDual(NaN, 2, TAG.ONLY_L_INCMPR);
            expectDual('NaN', NaN, TAG.BOTH_INCMPR_NOT_EQ);
            expectDual('NaN', 0, TAG.ONLY_L_INCMPR);
            expectDual('NaN', 2, TAG.ONLY_L_INCMPR);
            expectDual('-NaN', -NaN, TAG.BOTH_INCMPR_NOT_EQ);
            expectDual('-NaN', 0, TAG.ONLY_L_INCMPR);
            expectDual('-NaN', 2, TAG.ONLY_L_INCMPR);
            expectDual(true, 0, TAG.ONLY_L_INCMPR);
            expectDual(false, 1, TAG.ONLY_L_INCMPR);
            expectDual('true', 0, TAG.ONLY_L_INCMPR);
            expectDual('false', 1, TAG.ONLY_L_INCMPR);
            expectDual(undefined, 2, TAG.ONLY_L_INCMPR);
            expectDual(undefined, 0, TAG.ONLY_L_INCMPR);
            expectDual(null, 2, TAG.ONLY_L_INCMPR);
            expectDual(null, 0, TAG.ONLY_L_INCMPR);
            expectDual(makeDate(), 0, TAG.ONLY_L_INCMPR);
            expectDual(makeDate(), makeDate(), TAG.BOTH_INCMPR_NOT_EQ);
            expectDual(makeDate(), +makeDate(), TAG.ONLY_L_INCMPR);
            expectDual([], 1, TAG.ONLY_L_INCMPR);
            expectDual([], 0, TAG.ONLY_L_INCMPR);
            expectDual({}, 1, TAG.ONLY_L_INCMPR);
            expectDual([], '0', TAG.ONLY_L_INCMPR);
            expectDual({}, '1', TAG.ONLY_L_INCMPR);
            expectDual({}, 0, TAG.ONLY_L_INCMPR);
            expectDual({}, '1', TAG.ONLY_L_INCMPR);
            expectDual({}, '0', TAG.ONLY_L_INCMPR);
            expectDual(/1/, 0, TAG.ONLY_L_INCMPR);
            expectDual(/0/, 0, TAG.ONLY_L_INCMPR);
            expectDual('555a', 123, TAG.ONLY_L_INCMPR);
            expectDual('abc', 123, TAG.ONLY_L_INCMPR);
            expectDual('abc', '123', TAG.ONLY_L_INCMPR);
            expectDual('abc', 'abcde', TAG.TWO_STRING_L_LT_R);
            expectDual('abc', 'abc', TAG.STRICT_EQ);
            expectDual('2', '12', TAG.TWO_STRING_L_LT_R); // '2' > '12' in JS but should not happen here.
            expectDual(' ', '', TAG.TWO_STRING_L_GT_R);
            expectDual(0.5, '0. 5', TAG.ONLY_R_INCMPR);
            expectDual('0.5', '0. 5', TAG.ONLY_R_INCMPR);
            expectDual('- 5', -5, TAG.ONLY_L_INCMPR);
            expectDual('-123.5', ' -123.5 ', TAG.TWO_STRING_ONLY_NUMERIC_EQ);
            expectDual('0x11', 17, TAG.ONLY_L_INCMPR); // not 17 in int16.
            expectDual('0x11', 0, TAG.ONLY_L_INCMPR);
            expectDual('0x0', 0, TAG.ONLY_L_INCMPR);
            expectDual('0. 5', 0.5, TAG.ONLY_L_INCMPR);
            expectDual('0 .5', 0.5, TAG.ONLY_L_INCMPR);
            expectDual('', 2, TAG.ONLY_L_INCMPR);
            expectDual('', 0, TAG.ONLY_L_INCMPR);
            expectDual(' ', 2, TAG.ONLY_L_INCMPR);
            expectDual(' ', 0, TAG.ONLY_L_INCMPR);
            expectDual(' \n', '\n', TAG.TWO_STRING_L_GT_R);
            expectDual('\n', 0, TAG.ONLY_L_INCMPR);
            expectDual('\n', 2, TAG.ONLY_L_INCMPR);
            expectDual({}, {}, TAG.BOTH_INCMPR_NOT_EQ);
            expectDual({}, [], TAG.BOTH_INCMPR_NOT_EQ);
            expectDual(makeFn(), makeFn(), TAG.BOTH_INCMPR_NOT_EQ);
            expectDual(makeFn(), 0, TAG.ONLY_L_INCMPR);
            expectDual(makeFn(), 1, TAG.ONLY_L_INCMPR);
            expectDual(makeFn(), makeFn().toString(), TAG.BOTH_INCMPR_NOT_EQ);
        },

        equalNumeric: function () {
            expectDual(123, 123, TAG.STRICT_EQ);
            expectDual(1e3, 1000, TAG.STRICT_EQ);
            expectDual(-1e3, -1000, TAG.STRICT_EQ);
            expectDual('1e3', 1000, TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual('-1e3', -1000, TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual(123, '123', TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual(123, ' 123 ', TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual(123.5, ' \n \r 123.5 \t ', TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual(123.5, 123.5 + FULL_WIDTH_SPACE, TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual(' -123.5 ', -123.5, TAG.ONE_NUMBER_NUMERIC_EQ);
            expectDual('011', 11, TAG.ONE_NUMBER_NUMERIC_EQ); // not 9 in int8.
        },

        equalOtherTypes: function () {
            const emptyObj = {};
            const emptyArr = [];
            const date = new Date(2012, 5, 12);
            const fn = function () {};
            expectDual(emptyObj, emptyObj, TAG.STRICT_EQ);
            expectDual(emptyArr, emptyArr, TAG.STRICT_EQ);
            expectDual(date, date, TAG.STRICT_EQ);
            expectDual(fn, fn, TAG.STRICT_EQ);
        }
    };

    function expectDual(lval, rval, caseTag) {
        validateCaseTag(caseTag);
        evalFn(lval, rval, caseTag);

        const revertedCaseTag = findRevertTag(caseTag);
        validateCaseTag(revertedCaseTag);
        evalFn(rval, lval, revertedCaseTag);
    }

    function validateCaseTag(caseTag) {
        expect(TAG.hasOwnProperty(caseTag)).toEqual(true);
    }

    function findRevertTag(caseTag) {
        for (let i = 0; i < tagRevertPairs.length; i++) {
            const item = tagRevertPairs[i];
            if (item[0] === caseTag) {
                return item[1];
            }
            else if (item[1] === caseTag) {
                return item[0];
            }
        }
    }

    Object.keys(testerMap).forEach(name => testerMap[name]());
}


describe('data/helper/dataValueHelper', function () {

    describe('filter_relational_comparison', function () {
        function testFilterComparator(op) {
            it(op + '_filter_comparator', () => {
                eachRelationalComparisonCase((lval, rval, caseTag) => {
                    expect(filterResultMap.hasOwnProperty[caseTag]);
                    expect(filterResultMap[caseTag].hasOwnProperty[op]);
                    const expectedResult = filterResultMap[caseTag][op];

                    if ((op === 'lt' || op === 'lte' || op === 'gt' || op === 'gte')
                        && typeof rval !== 'number'
                    ) {
                        expect(() => {
                            dataValueHelper.createFilterComparator(op, rval);
                        }).toThrow();
                    }
                    else {
                        const comparator = dataValueHelper.createFilterComparator(op, rval);
                        expect(comparator.evaluate(lval, rval)).toEqual(expectedResult);
                    }
                });
            });
        }
        testFilterComparator('lt');
        testFilterComparator('lte');
        testFilterComparator('gt');
        testFilterComparator('gte');
        testFilterComparator('eq');
        testFilterComparator('ne');
    });

    describe('sort_relational_comparison', function () {
        function testSortComparator(order, incomparable) {
            const key = order + '_incmpr' + incomparable;
            const SortOrderComparator = dataValueHelper.SortOrderComparator;
            const sortOrderComparator = new SortOrderComparator(order, incomparable);
            it(key + '_sort_comparator', () => {
                eachRelationalComparisonCase((lval, rval, caseTag) => {
                    expect(sortResultMap.hasOwnProperty[caseTag]);
                    expect(sortResultMap[caseTag].hasOwnProperty[key]);
                    const expectedResult = sortResultMap[caseTag][key];
                    expect(sortOrderComparator.evaluate(lval, rval)).toEqual(expectedResult);
                });
            });
        }
        testSortComparator('asc', 'min');
        testSortComparator('asc', 'max');
        testSortComparator('desc', 'min');
        testSortComparator('desc', 'max');
    });

});

