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

import { ParsedValue, DimensionType } from '../../util/types';
import OrdinalMeta from '../OrdinalMeta';
import { parseDate, numericToNumber } from '../../util/number';
import { createHashMap, trim, hasOwn } from 'zrender/src/core/util';
import { throwError } from '../../util/log';


/**
 * Convert raw the value in to inner value in List.
 *
 * [Performance sensitive]
 *
 * [Caution]: this is the key logic of user value parser.
 * For backward compatibiliy, do not modify it until have to!
 */
export function parseDataValue(
    value: any,
    // For high performance, do not omit the second param.
    opt: {
        // Default type: 'number'. There is no 'unknown' type. That is, a string
        // will be parsed to NaN if do not set `type` as 'ordinal'. It has been
        // the logic in `List.ts` for long time. Follow the same way if you need
        // to get same result as List did from a raw value.
        type?: DimensionType,
        ordinalMeta?: OrdinalMeta
    }
): ParsedValue {
    // Performance sensitive.
    const dimType = opt && opt.type;
    if (dimType === 'ordinal') {
        // If given value is a category string
        const ordinalMeta = opt && opt.ordinalMeta;
        return ordinalMeta
            ? ordinalMeta.parseAndCollect(value)
            : value;
    }

    if (dimType === 'time'
        // spead up when using timestamp
        && typeof value !== 'number'
        && value != null
        && value !== '-'
    ) {
        value = +parseDate(value);
    }

    // dimType defaults 'number'.
    // If dimType is not ordinal and value is null or undefined or NaN or '-',
    // parse to NaN.
    // number-like string (like ' 123 ') can be converted to a number.
    // where null/undefined or other string will be converted to NaN.
    return (value == null || value === '')
        ? NaN
        // If string (like '-'), using '+' parse to NaN
        // If object, also parse to NaN
        : +value;
};




export type RawValueParserType = 'number' | 'time' | 'trim';
type RawValueParser = (val: unknown) => unknown;
const valueParserMap = createHashMap<RawValueParser, RawValueParserType>({
    'number': function (val): number {
        return numericToNumber(val);
    },
    'time': function (val): number {
        // return timestamp.
        return +parseDate(val);
    },
    'trim': function (val) {
        return typeof val === 'string' ? trim(val) : val;
    }
});

export function getRawValueParser(type: RawValueParserType): RawValueParser {
    return valueParserMap.get(type);
}




export interface FilterComparator {
    evaluate(val: unknown): boolean;
}

const ORDER_COMPARISON_OP_MAP: {
    [key in OrderRelationOperator]: ((lval: unknown, rval: unknown) => boolean)
} = {
    lt: (lval, rval) => lval < rval,
    lte: (lval, rval) => lval <= rval,
    gt: (lval, rval) => lval > rval,
    gte: (lval, rval) => lval >= rval
};

class FilterOrderComparator implements FilterComparator {
    private _rvalFloat: number;
    private _opFn: (lval: unknown, rval: unknown) => boolean;
    constructor(op: OrderRelationOperator, rval: unknown) {
        if (typeof rval !== 'number') {
            let errMsg = '';
            if (__DEV__) {
                errMsg = 'rvalue of "<", ">", "<=", ">=" can only be number in filter.';
            }
            throwError(errMsg);
        }
        this._opFn = ORDER_COMPARISON_OP_MAP[op];
        this._rvalFloat = numericToNumber(rval);
    }
    // Performance sensitive.
    evaluate(lval: unknown): boolean {
        // Most cases is 'number', and typeof maybe 10 times faseter than parseFloat.
        return typeof lval === 'number'
            ? this._opFn(lval, this._rvalFloat)
            : this._opFn(numericToNumber(lval), this._rvalFloat);
    }
}

export class SortOrderComparator {
    private _incomparable: number;
    private _resultLT: -1 | 1;
    /**
     * @param order by defualt: 'asc'
     * @param incomparable by defualt: Always on the tail.
     *        That is, if 'asc' => 'max', if 'desc' => 'min'
     */
    constructor(order: 'asc' | 'desc', incomparable: 'min' | 'max') {
        const isDesc = order === 'desc';
        this._resultLT = isDesc ? 1 : -1;
        if (incomparable == null) {
            incomparable = isDesc ? 'min' : 'max';
        }
        this._incomparable = incomparable === 'min' ? -Infinity : Infinity;
    }
    // Performance sensitive.
    evaluate(lval: unknown, rval: unknown): -1 | 0 | 1 {
        // Most cases is 'number', and typeof maybe 10 times faseter than parseFloat.
        const lvalTypeof = typeof lval;
        const rvalTypeof = typeof rval;
        let lvalFloat = lvalTypeof === 'number' ? lval : numericToNumber(lval);
        let rvalFloat = rvalTypeof === 'number' ? rval : numericToNumber(rval);
        const lvalIncmpr = isNaN(lvalFloat as number);
        const rvalIncmpr = isNaN(rvalFloat as number);
        if (lvalIncmpr) {
            lvalFloat = this._incomparable;
        }
        if (rvalIncmpr) {
            rvalFloat = this._incomparable;
        }
        // In most cases, pure string sort has no meanings. But it can exists when need to
        // group two categories (and order by anthor dimension meanwhile).
        // But if we support string sort, we still need to avoid the misleading of `'2' > '12'`,
        // and support '-' means empty, and trade `'abc' > 2` as incomparable.
        // So we support string comparison only if both lval and rval are string and not numeric.
        if (lvalIncmpr && rvalIncmpr && lvalTypeof === 'string' && rvalTypeof === 'string') {
            lvalFloat = lval;
            rvalFloat = rval;
        }
        return lvalFloat < rvalFloat ? this._resultLT
            : lvalFloat > rvalFloat ? (-this._resultLT as -1 | 1)
            : 0;
    }
}

class FilterEqualityComparator implements FilterComparator {
    private _isEQ: boolean;
    private _rval: unknown;
    private _rvalTypeof: string;
    private _rvalFloat: number;
    constructor(isEq: boolean, rval: unknown) {
        this._rval = rval;
        this._isEQ = isEq;
        this._rvalTypeof = typeof rval;
        this._rvalFloat = numericToNumber(rval);
    }
    // Performance sensitive.
    evaluate(lval: unknown): boolean {
        let eqResult = lval === this._rval;
        if (!eqResult) {
            const lvalTypeof = typeof lval;
            if (lvalTypeof !== this._rvalTypeof && (lvalTypeof === 'number' || this._rvalTypeof === 'number')) {
                eqResult = numericToNumber(lval) === this._rvalFloat;
            }
        }
        return this._isEQ ? eqResult : !eqResult;
    }
}

type OrderRelationOperator = 'lt' | 'lte' | 'gt' | 'gte';
export type RelationalOperator = OrderRelationOperator | 'eq' | 'ne';

/**
 * [FILTER_COMPARISON_RULE]
 * `lt`|`lte`|`gt`|`gte`:
 * + rval must be a number. And lval will be converted to number (`numericToNumber`) to compare.
 * `eq`:
 * + If same type, compare with `===`.
 * + If there is one number, convert to number (`numericToNumber`) to compare.
 * + Else return `false`.
 * `ne`:
 * + Not `eq`.
 *
 * [SORT_COMPARISON_RULE]
 * Only `lt`|`gt`.
 * Always convert to number (`numericToNumer`) to compare.
 * (e.g., consider case: [12, " 13 ", " 14 ", null, 15])
 *
 * [CHECK_LIST_OF_THE_RULE_DESIGN]
 * + Do not support string comparison until required. And also need to
 *   void the misleading of "2" > "12".
 * + Should avoid the misleading case:
 *   `" 22 " gte "22"` is `true` but `" 22 " eq "22"` is `false`.
 * + JS bad case should be avoided: null <= 0, [] <= 0, ' ' <= 0, ...
 * + Only "numeric" can be converted to comparable number, otherwise converted to NaN.
 *   See `util/number.ts#numericToNumber`.
 *
 * @return If `op` is not `RelationalOperator`, return null;
 */
export function createFilterComparator(
    op: string,
    rval?: unknown
): FilterComparator {
    return (op === 'eq' || op === 'ne')
        ? new FilterEqualityComparator(op === 'eq', rval)
        : hasOwn(ORDER_COMPARISON_OP_MAP, op)
        ? new FilterOrderComparator(op as OrderRelationOperator, rval)
        : null;
}
