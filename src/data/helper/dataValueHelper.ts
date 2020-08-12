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




export interface UnaryExpression {
    evaluate(val: unknown): unknown;
}
export interface BinaryExpression {
    evaluate(lval: unknown, rval: unknown): unknown;
}

class OrderComparatorUnary implements UnaryExpression {
    _rval: unknown;
    _rvalTypeof: string; // typeof rval
    _rvalFloat: number;
    _rvalIsNumeric: boolean;
    _opFn: (lval: unknown, rval: unknown) => boolean;
    // Performance sensitive.
    evaluate(lval: unknown): boolean {
        // Most cases is 'number', and typeof maybe 10 times faseter than parseFloat.
        const lvalIsNumber = typeof lval === 'number';
        return (lvalIsNumber && this._rvalIsNumeric)
            ? this._opFn(lval, this._rvalFloat)
            : (lvalIsNumber || this._rvalTypeof === 'number')
            ? this._opFn(numericToNumber(lval), this._rvalFloat)
            : false;
    }
}
class OrderComparatorBinary implements BinaryExpression {
    _opFn: (lval: unknown, rval: unknown) => boolean;
    // Performance sensitive.
    evaluate(lval: unknown, rval: unknown): boolean {
        // Most cases is 'number', and typeof maybe 10 times faseter than parseFloat.
        const lvalIsNumber = typeof lval === 'number';
        const rvalIsNumber = typeof rval === 'number';
        return (lvalIsNumber && rvalIsNumber)
            ? this._opFn(lval, rval)
            : (lvalIsNumber || rvalIsNumber)
            ? this._opFn(numericToNumber(lval), numericToNumber(rval))
            : false;
    }
}

class EqualityComparatorUnary implements UnaryExpression {
    _rval: unknown;
    _rvalTypeof: string; // typeof rval
    _rvalFloat: number;
    _rvalIsNumeric: boolean;
    _isEq: boolean;
    // Performance sensitive.
    evaluate(lval: unknown): boolean {
        let eqResult = lval === this._rval;
        if (!eqResult) {
            const lvalTypeof = typeof lval;
            if (lvalTypeof !== this._rvalTypeof && (lvalTypeof === 'number' || this._rvalTypeof === 'number')) {
                eqResult = numericToNumber(lval) === this._rvalFloat;
            }
        }
        return this._isEq ? eqResult : !eqResult;
    }
}

class EqualityComparatorBinary implements BinaryExpression {
    _isEq: boolean;
    // Performance sensitive.
    evaluate(lval: unknown, rval: unknown): boolean {
        let eqResult = lval === rval;
        if (!eqResult) {
            const lvalTypeof = typeof lval;
            const rvalTypeof = typeof rval;
            if (lvalTypeof !== rvalTypeof && (lvalTypeof === 'number' || rvalTypeof === 'number')) {
                eqResult = numericToNumber(lval) === numericToNumber(rval);
            }
        }
        return this._isEq ? eqResult : !eqResult;
    }
}

const ORDER_COMPARISON_OP_MAP = {
    lt: (tarVal: unknown, condVal: unknown) => tarVal < condVal,
    lte: (tarVal: unknown, condVal: unknown) => tarVal <= condVal,
    gt: (tarVal: unknown, condVal: unknown) => tarVal > condVal,
    gte: (tarVal: unknown, condVal: unknown) => tarVal >= condVal
} as const;

export type RelationalOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';

/**
 * [COMPARISON_RULE]
 * `lt`, `lte`, `gt`, `gte`:
 * + If two "number" or a "number" and a "numeric": convert to number and compare.
 * + Else return `false`.
 * `eq`:
 * + If same type, compare with ===.
 * + If two "number" or a "number" and a "numeric": convert to number and compare.
 * + Else return `false`.
 * `ne`:
 * + Not `eq`.
 *
 * Definition of "numeric": see `util/number.ts#numericToNumber`.
 *
 * [MEMO]
 * + Do not support string comparison until required. And also need to consider the
 *   misleading of "2" > "12".
 * + JS bad case considered: null <= 0, [] <= 0, ' ' <= 0, ...
 */
export function createRelationalComparator(op: RelationalOperator): BinaryExpression;
export function createRelationalComparator(op: RelationalOperator, isUnary: true, rval: unknown): UnaryExpression;
export function createRelationalComparator(
    op: RelationalOperator,
    isUnary?: true,
    rval?: unknown
): UnaryExpression | BinaryExpression {
    let comparator;
    if (op === 'eq' || op === 'ne') {
        comparator = isUnary ? new EqualityComparatorUnary() : new EqualityComparatorBinary();
        comparator._isEq = op === 'eq';
    }
    else {
        comparator = isUnary ? new OrderComparatorUnary() : new OrderComparatorBinary();
        comparator._opFn = ORDER_COMPARISON_OP_MAP[op];
    }
    if (isUnary) {
        const unaryComp = comparator as OrderComparatorUnary | EqualityComparatorUnary;
        unaryComp._rval = rval;
        unaryComp._rvalTypeof = typeof rval;
        const rvalFloat = unaryComp._rvalFloat = numericToNumber(rval);
        unaryComp._rvalIsNumeric = !isNaN(rvalFloat); // eslint-disable-line eqeqeq
    }
    return comparator;
}

export function isRelationalOperator(op: string): op is RelationalOperator {
    return hasOwn(ORDER_COMPARISON_OP_MAP, op) || op === 'eq' || op === 'ne';
}
