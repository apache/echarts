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

import { OptionDataValue, DimensionLoose, Dictionary } from './types';
import {
    keys, isArray, map, isObject, isString, HashMap, isRegExp, isArrayLike, hasOwn, isNumber
} from 'zrender/src/core/util';
import { throwError, makePrintable } from './log';
import {
    RawValueParserType, getRawValueParser,
    RelationalOperator, FilterComparator, createFilterComparator
} from '../data/helper/dataValueHelper';


// PENDING:
// (1) Support more parser like: `parser: 'trim'`, `parser: 'lowerCase'`, `parser: 'year'`, `parser: 'dayOfWeek'`?
// (2) Support piped parser?
// (3) Support callback parser or callback condition?
// (4) At present do not support string expression yet but only structured expression.


/**
 * The structured expression considered:
 * (1) Literal simplicity
 * (2) Semantic displayed clearly
 *
 * Semantic supports:
 * (1) relational expression
 * (2) logical expression
 *
 * For example:
 * ```js
 * {
 *     and: [{
 *         or: [{
 *             dimension: 'Year', gt: 2012, lt: 2019
 *         }, {
 *             dimension: 'Year', '>': 2002, '<=': 2009
 *         }]
 *     }, {
 *         dimension: 'Product', eq: 'Tofu'
 *     }]
 * }
 *
 * { dimension: 'Product', eq: 'Tofu' }
 *
 * {
 *     or: [
 *         { dimension: 'Product', value: 'Tofu' },
 *         { dimension: 'Product', value: 'Biscuit' }
 *     ]
 * }
 *
 * {
 *     and: [true]
 * }
 * ```
 *
 * [PARSER]
 * In an relation expression object, we can specify some built-in parsers:
 * ```js
 * // Trim if string
 * {
 *     parser: 'trim',
 *     eq: 'Flowers'
 * }
 * // Parse as time and enable arithmetic relation comparison.
 * {
 *     parser: 'time',
 *     lt: '2012-12-12'
 * }
 * // Normalize number-like string and make '-' to Null.
 * {
 *     parser: 'time',
 *     lt: '2012-12-12'
 * }
 * // Normalize to number:
 * // + number-like string (like '  123  ') can be converted to a number.
 * // + where null/undefined or other string will be converted to NaN.
 * {
 *     parser: 'number',
 *     eq: 2011
 * }
 * // RegExp, include the feature in SQL: `like '%xxx%'`.
 * {
 *     reg: /^asdf$/
 * }
 * {
 *     reg: '^asdf$' // Serializable reg exp, will be `new RegExp(...)`
 * }
 * ```
 *
 *
 * [EMPTY_RULE]
 * (1) If a relational expression set value as `null`/`undefined` like:
 * `{ dimension: 'Product', lt: undefined }`,
 * The result will be `false` rather than `true`.
 * Consider the case like "filter condition", return all result when null/undefined
 * is probably not expected and even dangours.
 * (2) If a relational expression has no operator like:
 * `{ dimension: 'Product' }`,
 * An error will be thrown. Because it is probably a mistake.
 * (3) If a logical expression has no children like
 * `{ and: undefined }` or `{ and: [] }`,
 * An error will be thrown. Because it is probably an mistake.
 * (4) If intending have a condition that always `true` or always `false`,
 * Use `true` or `flase`.
 * The entire condition can be `true`/`false`,
 * or also can be `{ and: [true] }`, `{ or: [false] }`
 */


// --------------------------------------------------
// --- Relational Expression --------------------------
// --------------------------------------------------

/**
 * Date string and ordinal string can be accepted.
 */
interface RelationalExpressionOptionByOp extends Record<RelationalOperator, OptionDataValue> {
    reg?: RegExp | string; // RegExp
};
const RELATIONAL_EXPRESSION_OP_ALIAS_MAP = {
    value: 'eq',

    // PENDING: not good for literal semantic?
    '<': 'lt',
    '<=': 'lte',
    '>': 'gt',
    '>=': 'gte',
    '=': 'eq',
    '!=': 'ne',
    '<>': 'ne'

    // Might be misleading for sake of the difference between '==' and '===',
    // so don't support them.
    // '==': 'eq',
    // '===': 'seq',
    // '!==': 'sne'

    // PENDING: Whether support some common alias "ge", "le", "neq"?
    // ge: 'gte',
    // le: 'lte',
    // neq: 'ne',
} as const;
type RelationalExpressionOptionByOpAlias = Record<keyof typeof RELATIONAL_EXPRESSION_OP_ALIAS_MAP, OptionDataValue>;

interface RelationalExpressionOption extends
        RelationalExpressionOptionByOp, RelationalExpressionOptionByOpAlias {
    dimension?: DimensionLoose;
    parser?: RawValueParserType;
}

// type RelationalExpressionOpEvaluate = (tarVal: unknown, condVal: unknown) => boolean;


class RegExpEvaluator implements FilterComparator {
    private _condVal: RegExp;

    constructor(rVal: unknown) {
        // Support condVal: RegExp | string
        const condValue = this._condVal = isString(rVal) ? new RegExp(rVal)
            : isRegExp(rVal) ? rVal as RegExp
            : null;
        if (condValue == null) {
            let errMsg = '';
            if (__DEV__) {
                errMsg = makePrintable('Illegal regexp', rVal, 'in');
            }
            throwError(errMsg);
        }
    }

    evaluate(lVal: unknown): boolean {
        const type = typeof lVal;
        return isString(type) ? this._condVal.test(lVal as string)
            : isNumber(type) ? this._condVal.test(lVal + '')
            : false;
    }
}




// --------------------------------------------------
// --- Logical Expression ---------------------------
// --------------------------------------------------


interface LogicalExpressionOption {
    and?: LogicalExpressionSubOption[];
    or?: LogicalExpressionSubOption[];
    not?: LogicalExpressionSubOption;
}
type LogicalExpressionSubOption =
    LogicalExpressionOption | RelationalExpressionOption | TrueFalseExpressionOption;



// -----------------------------------------------------
// --- Conditional Expression --------------------------
// -----------------------------------------------------


export type TrueExpressionOption = true;
export type FalseExpressionOption = false;
export type TrueFalseExpressionOption = TrueExpressionOption | FalseExpressionOption;

export type ConditionalExpressionOption =
    LogicalExpressionOption
    | RelationalExpressionOption
    | TrueFalseExpressionOption;

type ValueGetterParam = Dictionary<unknown>;
export interface ConditionalExpressionValueGetterParamGetter<VGP extends ValueGetterParam = ValueGetterParam> {
    (relExpOption: RelationalExpressionOption): VGP
}
export interface ConditionalExpressionValueGetter<VGP extends ValueGetterParam = ValueGetterParam> {
    (param: VGP): OptionDataValue
}

interface ParsedConditionInternal {
    evaluate(): boolean;
}
class ConstConditionInternal implements ParsedConditionInternal {
    value: boolean;
    evaluate(): boolean {
        return this.value;
    }
}
class AndConditionInternal implements ParsedConditionInternal {
    children: ParsedConditionInternal[];
    evaluate() {
        const children = this.children;
        for (let i = 0; i < children.length; i++) {
            if (!children[i].evaluate()) {
                return false;
            }
        }
        return true;
    }
}
class OrConditionInternal implements ParsedConditionInternal {
    children: ParsedConditionInternal[];
    evaluate() {
        const children = this.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].evaluate()) {
                return true;
            }
        }
        return false;
    }
}
class NotConditionInternal implements ParsedConditionInternal {
    child: ParsedConditionInternal;
    evaluate() {
        return !this.child.evaluate();
    }
}
class RelationalConditionInternal implements ParsedConditionInternal {
    valueGetterParam: ValueGetterParam;
    valueParser: ReturnType<typeof getRawValueParser>;
    // If no parser, be null/undefined.
    getValue: ConditionalExpressionValueGetter;
    subCondList: FilterComparator[];

    evaluate() {
        const needParse = !!this.valueParser;
        // Call getValue with no `this`.
        const getValue = this.getValue;
        const tarValRaw = getValue(this.valueGetterParam);
        const tarValParsed = needParse ? this.valueParser(tarValRaw) : null;

        // Relational cond follow "and" logic internally.
        for (let i = 0; i < this.subCondList.length; i++) {
            if (!this.subCondList[i].evaluate(needParse ? tarValParsed : tarValRaw)) {
                return false;
            }
        }
        return true;
    }
}

function parseOption(
    exprOption: ConditionalExpressionOption,
    getters: ConditionalGetters
): ParsedConditionInternal {
    if (exprOption === true || exprOption === false) {
        const cond = new ConstConditionInternal();
        cond.value = exprOption as boolean;
        return cond;
    }

    let errMsg = '';
    if (!isObjectNotArray(exprOption)) {
        if (__DEV__) {
            errMsg = makePrintable(
                'Illegal config. Expect a plain object but actually', exprOption
            );
        }
        throwError(errMsg);
    }

    if ((exprOption as LogicalExpressionOption).and) {
        return parseAndOrOption('and', exprOption as LogicalExpressionOption, getters);
    }
    else if ((exprOption as LogicalExpressionOption).or) {
        return parseAndOrOption('or', exprOption as LogicalExpressionOption, getters);
    }
    else if ((exprOption as LogicalExpressionOption).not) {
        return parseNotOption(exprOption as LogicalExpressionOption, getters);
    }

    return parseRelationalOption(exprOption as RelationalExpressionOption, getters);
}

function parseAndOrOption(
    op: 'and' | 'or',
    exprOption: LogicalExpressionOption,
    getters: ConditionalGetters
): ParsedConditionInternal {
    const subOptionArr = exprOption[op] as ConditionalExpressionOption[];
    let errMsg = '';
    if (__DEV__) {
        errMsg = makePrintable(
            '"and"/"or" condition should only be `' + op + ': [...]` and must not be empty array.',
            'Illegal condition:', exprOption
        );
    }
    if (!isArray(subOptionArr)) {
        throwError(errMsg);
    }
    if (!(subOptionArr as []).length) {
        throwError(errMsg);
    }
    const cond = op === 'and' ? new AndConditionInternal() : new OrConditionInternal();
    cond.children = map(subOptionArr, subOption => parseOption(subOption, getters));
    if (!cond.children.length) {
        throwError(errMsg);
    }
    return cond;
}

function parseNotOption(
    exprOption: LogicalExpressionOption,
    getters: ConditionalGetters
): ParsedConditionInternal {
    const subOption = exprOption.not as ConditionalExpressionOption;
    let errMsg = '';
    if (__DEV__) {
        errMsg = makePrintable(
            '"not" condition should only be `not: {}`.',
            'Illegal condition:', exprOption
        );
    }
    if (!isObjectNotArray(subOption)) {
        throwError(errMsg);
    }
    const cond = new NotConditionInternal();
    cond.child = parseOption(subOption, getters);
    if (!cond.child) {
        throwError(errMsg);
    }
    return cond;
}

function parseRelationalOption(
    exprOption: RelationalExpressionOption,
    getters: ConditionalGetters
): ParsedConditionInternal {
    let errMsg = '';

    const valueGetterParam = getters.prepareGetValue(exprOption);

    const subCondList = [] as RelationalConditionInternal['subCondList'];
    const exprKeys = keys(exprOption);

    const parserName = exprOption.parser;
    const valueParser = parserName ? getRawValueParser(parserName) : null;

    for (let i = 0; i < exprKeys.length; i++) {
        const keyRaw = exprKeys[i];
        if (keyRaw === 'parser' || getters.valueGetterAttrMap.get(keyRaw)) {
            continue;
        }

        const op: keyof RelationalExpressionOptionByOp = hasOwn(RELATIONAL_EXPRESSION_OP_ALIAS_MAP, keyRaw)
            ? RELATIONAL_EXPRESSION_OP_ALIAS_MAP[keyRaw as keyof RelationalExpressionOptionByOpAlias]
            : (keyRaw as keyof RelationalExpressionOptionByOp);
        const condValueRaw = exprOption[keyRaw];
        const condValueParsed = valueParser ? valueParser(condValueRaw) : condValueRaw;
        const evaluator = createFilterComparator(op, condValueParsed)
            || (op === 'reg' && new RegExpEvaluator(condValueParsed));

        if (!evaluator) {
            if (__DEV__) {
                errMsg = makePrintable(
                    'Illegal relational operation: "' + keyRaw + '" in condition:', exprOption
                );
            }
            throwError(errMsg);
        }

        subCondList.push(evaluator);
    }

    if (!subCondList.length) {
        if (__DEV__) {
            errMsg = makePrintable(
                'Relational condition must have at least one operator.',
                'Illegal condition:', exprOption
            );
        }
        // No relational operator always disabled in case of dangers result.
        throwError(errMsg);
    }

    const cond = new RelationalConditionInternal();
    cond.valueGetterParam = valueGetterParam;
    cond.valueParser = valueParser;
    cond.getValue = getters.getValue;
    cond.subCondList = subCondList;

    return cond;
}

function isObjectNotArray(val: unknown): boolean {
    return isObject(val) && !isArrayLike(val);
}


class ConditionalExpressionParsed {

    private _cond: ParsedConditionInternal;

    constructor(
        exprOption: ConditionalExpressionOption,
        getters: ConditionalGetters
    ) {
        this._cond = parseOption(exprOption, getters);
    }

    evaluate(): boolean {
        return this._cond.evaluate();
    }
};

interface ConditionalGetters<VGP extends ValueGetterParam = ValueGetterParam> {
    prepareGetValue: ConditionalExpressionValueGetterParamGetter<VGP>;
    getValue: ConditionalExpressionValueGetter<VGP>;
    valueGetterAttrMap: HashMap<boolean, string>;
}

export function parseConditionalExpression<VGP extends ValueGetterParam = ValueGetterParam>(
    exprOption: ConditionalExpressionOption,
    getters: ConditionalGetters<VGP>
): ConditionalExpressionParsed {
    return new ConditionalExpressionParsed(exprOption, getters);
}

