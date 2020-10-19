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


import * as dataValueHelper from '../../../../src/data/helper/dataValueHelper';


const NO_SUCH_CASE = 'NO_SUCH_CASE';

// Tags for relational comparison cases.
// LT: less than, GT: greater than, INCMPR: incomparable
const TAG = {
    BothNumeric_AtLeastOneNumber_L_LT_R: 'BothNumeric_AtLeastOneNumber_L_LT_R',
    BothNumeric_AtLeastOneNumber_L_GT_R: 'BothNumeric_AtLeastOneNumber_L_GT_R',
    BothString_L_LT_R: 'BothString_L_LT_R',
    BothString_L_GT_R: 'BothString_L_GT_R',
    BothNumericString_NotStrictEQ_BeNumericEQ: 'BothNumericString_NotStrictEQ_BeNumericEQ',
    Strict_EQ: 'Strict_EQ',
    BothNumeric_OneNumber_NumericEQ: 'BothNumeric_OneNumber_NumericEQ',
    BothIncmpr_NotEQ: 'BothIncmpr_NotEQ',
    L_Incmpr_R_NumberOrString: 'L_Incmpr_R_NumberOrString',
    R_Incmpr_L_NumberOrString: 'R_Incmpr_L_NumberOrString'
} as const;

type CaseTag = typeof TAG[keyof typeof TAG];

type Operation = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
type Order = 'asc' | 'desc';
type Incomparable = 'min' | 'max';


const tagRevertPairs = [
    ['BothNumeric_AtLeastOneNumber_L_LT_R', 'BothNumeric_AtLeastOneNumber_L_GT_R'],
    ['BothString_L_LT_R', 'BothString_L_GT_R'],
    ['BothNumericString_NotStrictEQ_BeNumericEQ', 'BothNumericString_NotStrictEQ_BeNumericEQ'],
    ['Strict_EQ', 'Strict_EQ'],
    ['BothNumeric_OneNumber_NumericEQ', 'BothNumeric_OneNumber_NumericEQ'],
    ['BothIncmpr_NotEQ', 'BothIncmpr_NotEQ'],
    ['L_Incmpr_R_NumberOrString', 'R_Incmpr_L_NumberOrString']
] as const;

const filterResultMap = {
    BothNumeric_AtLeastOneNumber_L_LT_R: {
        lt: true,
        lte: true,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    BothNumeric_AtLeastOneNumber_L_GT_R: {
        lt: false,
        lte: false,
        gt: true,
        gte: true,
        eq: false,
        ne: true
    },
    BothString_L_LT_R: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    BothString_L_GT_R: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    BothNumericString_NotStrictEQ_BeNumericEQ: {
        lt: NO_SUCH_CASE,
        lte: NO_SUCH_CASE,
        gt: NO_SUCH_CASE,
        gte: NO_SUCH_CASE,
        eq: false,
        ne: true
    },
    Strict_EQ: {
        lt: false,
        lte: true,
        gt: false,
        gte: true,
        eq: true,
        ne: false
    },
    BothNumeric_OneNumber_NumericEQ: {
        lt: false,
        lte: true,
        gt: false,
        gte: true,
        eq: true,
        ne: false
    },
    BothIncmpr_NotEQ: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    L_Incmpr_R_NumberOrString: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    },
    R_Incmpr_L_NumberOrString: {
        lt: false,
        lte: false,
        gt: false,
        gte: false,
        eq: false,
        ne: true
    }
} as const;

const sortResultMap = {
    BothNumeric_AtLeastOneNumber_L_LT_R: {
        asc_incmprmin: -1,
        asc_incmprmax: -1,
        desc_incmprmin: 1,
        desc_incmprmax: 1
    },
    BothNumeric_AtLeastOneNumber_L_GT_R: {
        asc_incmprmin: 1,
        asc_incmprmax: 1,
        desc_incmprmin: -1,
        desc_incmprmax: -1
    },
    BothString_L_LT_R: {
        asc_incmprmin: -1,
        asc_incmprmax: -1,
        desc_incmprmin: 1,
        desc_incmprmax: 1
    },
    BothString_L_GT_R: {
        asc_incmprmin: 1,
        asc_incmprmax: 1,
        desc_incmprmin: -1,
        desc_incmprmax: -1
    },
    BothNumericString_NotStrictEQ_BeNumericEQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    Strict_EQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    BothNumeric_OneNumber_NumericEQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    BothIncmpr_NotEQ: {
        asc_incmprmin: 0,
        asc_incmprmax: 0,
        desc_incmprmin: 0,
        desc_incmprmax: 0
    },
    L_Incmpr_R_NumberOrString: {
        asc_incmprmin: -1,
        asc_incmprmax: 1,
        desc_incmprmin: 1,
        desc_incmprmax: -1
    },
    R_Incmpr_L_NumberOrString: {
        asc_incmprmin: 1,
        asc_incmprmax: -1,
        desc_incmprmin: -1,
        desc_incmprmax: 1
    }
} as const;

type EvaluateFunction = (lval: unknown, rval: unknown, caseTag: CaseTag) => void;

function eachRelationalComparisonCase(evalFn: EvaluateFunction) {

    const FULL_WIDTH_SPACE = String.fromCharCode(12288);

    const testerMap = {
        notEqualAndHasOrder: function () {
            expectDual(123, 555, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual(-123, -555, TAG.BothNumeric_AtLeastOneNumber_L_GT_R);
            expectDual(-123, 123, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);

            expectDual(Infinity, 123, TAG.BothNumeric_AtLeastOneNumber_L_GT_R);
            expectDual(-Infinity, -123, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual('Infinity', 123, TAG.BothNumeric_AtLeastOneNumber_L_GT_R);
            expectDual('-Infinity', 123, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual(123, '555', TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual(555, '555.6', TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual('-555', -555.6, TAG.BothNumeric_AtLeastOneNumber_L_GT_R);
            expectDual(123, ' 555 ', TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual(' -555 ', 123, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
            expectDual(123, ' \r \n 555 \t ' + FULL_WIDTH_SPACE, TAG.BothNumeric_AtLeastOneNumber_L_LT_R);
        },

        notEqualAndNoOrder: function () {
            const makeDate = () => new Date(2012, 5, 12);
            const makeFn = () => function () {};

            expectDual(NaN, NaN, TAG.BothIncmpr_NotEQ);
            expectDual(NaN, -NaN, TAG.BothIncmpr_NotEQ);
            expectDual(NaN, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(NaN, 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual('NaN', NaN, TAG.R_Incmpr_L_NumberOrString);
            expectDual('NaN', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('NaN', 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual('-NaN', -NaN, TAG.R_Incmpr_L_NumberOrString);
            expectDual('-NaN', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('-NaN', 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual(true, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(false, 1, TAG.L_Incmpr_R_NumberOrString);
            expectDual('true', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('false', 1, TAG.L_Incmpr_R_NumberOrString);
            expectDual(undefined, 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual(undefined, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(null, 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual(null, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(makeDate(), 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(makeDate(), makeDate(), TAG.BothIncmpr_NotEQ);
            expectDual(makeDate(), +makeDate(), TAG.L_Incmpr_R_NumberOrString);
            expectDual([], 1, TAG.L_Incmpr_R_NumberOrString);
            expectDual([], 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, 1, TAG.L_Incmpr_R_NumberOrString);
            expectDual([], '0', TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, '1', TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, '1', TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, '0', TAG.L_Incmpr_R_NumberOrString);
            expectDual(/1/, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(/0/, 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('555a', 123, TAG.L_Incmpr_R_NumberOrString);
            expectDual('abc', 123, TAG.L_Incmpr_R_NumberOrString);
            expectDual('abc', null, TAG.R_Incmpr_L_NumberOrString); // See [SORT_COMPARISON_RULE]
            expectDual('abc', '123', TAG.L_Incmpr_R_NumberOrString);
            expectDual('abc', 'abcde', TAG.BothString_L_LT_R);
            expectDual('abc', 'abc', TAG.Strict_EQ);
            expectDual('2', '12', TAG.BothString_L_LT_R); // '2' > '12' in JS but should not happen here.
            expectDual(' ', '', TAG.BothString_L_GT_R);
            expectDual(0.5, '0. 5', TAG.R_Incmpr_L_NumberOrString);
            expectDual('0.5', '0. 5', TAG.R_Incmpr_L_NumberOrString);
            expectDual('- 5', -5, TAG.L_Incmpr_R_NumberOrString);
            expectDual('-123.5', ' -123.5 ', TAG.BothNumericString_NotStrictEQ_BeNumericEQ);
            expectDual('0x11', 17, TAG.L_Incmpr_R_NumberOrString); // not 17 in int16.
            expectDual('0x11', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('0x0', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('0. 5', 0.5, TAG.L_Incmpr_R_NumberOrString);
            expectDual('0 .5', 0.5, TAG.L_Incmpr_R_NumberOrString);
            expectDual('', 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual('', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(' ', 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual(' ', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(' \n', '\n', TAG.BothString_L_GT_R);
            expectDual('\n', 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual('\n', 2, TAG.L_Incmpr_R_NumberOrString);
            expectDual({}, {}, TAG.BothIncmpr_NotEQ);
            expectDual({}, [], TAG.BothIncmpr_NotEQ);
            expectDual(makeFn(), makeFn(), TAG.BothIncmpr_NotEQ);
            expectDual(makeFn(), 0, TAG.L_Incmpr_R_NumberOrString);
            expectDual(makeFn(), 1, TAG.L_Incmpr_R_NumberOrString);
            expectDual(makeFn(), makeFn().toString(), TAG.L_Incmpr_R_NumberOrString);
        },

        equalNumeric: function () {
            expectDual(123, 123, TAG.Strict_EQ);
            expectDual(1e3, 1000, TAG.Strict_EQ);
            expectDual(-1e3, -1000, TAG.Strict_EQ);
            expectDual('1e3', 1000, TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual('-1e3', -1000, TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual(123, '123', TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual(123, ' 123 ', TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual(123.5, ' \n \r 123.5 \t ', TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual(123.5, 123.5 + FULL_WIDTH_SPACE, TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual(' -123.5 ', -123.5, TAG.BothNumeric_OneNumber_NumericEQ);
            expectDual('011', 11, TAG.BothNumeric_OneNumber_NumericEQ); // not 9 in int8.
        },

        equalOtherTypes: function () {
            const emptyObj = {};
            const emptyArr = [] as unknown[];
            const date = new Date(2012, 5, 12);
            const fn = function () {};
            expectDual(emptyObj, emptyObj, TAG.Strict_EQ);
            expectDual(emptyArr, emptyArr, TAG.Strict_EQ);
            expectDual(date, date, TAG.Strict_EQ);
            expectDual(fn, fn, TAG.Strict_EQ);
        }
    };

    function expectDual(lval: unknown, rval: unknown, caseTag: CaseTag) {
        validateCaseTag(caseTag);
        evalFn(lval, rval, caseTag);

        const revertedCaseTag = findRevertTag(caseTag);
        validateCaseTag(revertedCaseTag);
        evalFn(rval, lval, revertedCaseTag);
    }

    function validateCaseTag(caseTag: CaseTag) {
        expect(TAG.hasOwnProperty(caseTag)).toEqual(true);
    }

    function findRevertTag(caseTag: CaseTag) {
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

    Object.keys(testerMap).forEach((name: keyof typeof testerMap) => testerMap[name]());
}


describe('data/helper/dataValueHelper', function () {

    describe('filter_relational_comparison', function () {

        function testFilterComparator(op: Operation) {
            it(op + '_filter_comparator', () => {
                eachRelationalComparisonCase((lval, rval, caseTag) => {
                    expect(filterResultMap.hasOwnProperty(caseTag));
                    expect(filterResultMap[caseTag].hasOwnProperty(op));
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
                        expect(comparator.evaluate(lval)).toEqual(expectedResult);
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

        function testSortComparator(order: Order, incomparable: Incomparable) {
            const key = order + '_incmpr' + incomparable;
            const SortOrderComparator = dataValueHelper.SortOrderComparator;
            const sortOrderComparator = new SortOrderComparator(order, incomparable);
            it(key + '_sort_comparator', () => {
                eachRelationalComparisonCase((lval, rval, caseTag) => {
                    expect(sortResultMap.hasOwnProperty(caseTag));
                    expect(sortResultMap[caseTag].hasOwnProperty(key));
                    const expectedResult = (sortResultMap[caseTag] as any)[key];
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

