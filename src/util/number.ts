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

/*
* A third-party license is embedded for some of the code in this file:
* The method "quantile" was copied from "d3.js".
* (See more details in the comment of the method below.)
* The use of the source code of this file is also subject to the terms
* and consitions of the license of "d3.js" (BSD-3Clause, see
* </licenses/LICENSE-d3>).
*/

import * as zrUtil from 'zrender/src/core/util';
import { NullUndefined } from './types';

const RADIAN_EPSILON = 1e-4;

// A `RangeError` may be thrown if `n` is out of this range when calling `toFixed(n)`.
// Although Chrome and ES2017+ have enlarged this number to 100, but we sill follow
// the ES3~ES6 spec (0 <= n <= 20) for backward and cross-platform compatibility.
const TO_FIXED_SUPPORTED_PRECISION_MAX = 20;

// For rounding error like `2.9999999999999996`, with respect to IEEE754 64bit float.
// NOTICE: It only works when the expected result is a rational number with low
// precision. See method `round` for details.
export const DEFAULT_PRECISION_FOR_ROUNDING_ERROR = 14;

function _trim(str: string): string {
    return str.replace(/^\s+|\s+$/g, '');
}

export const mathMin = Math.min;
export const mathMax = Math.max;
export const mathAbs = Math.abs;
export const mathRound = Math.round;
export const mathFloor = Math.floor;
export const mathCeil = Math.ceil;
export const mathPow = Math.pow;
export const mathLog = Math.log;
export const mathLN10 = Math.LN10;
export const mathPI = Math.PI;
export const mathRandom = Math.random;

/**
 * Linear mapping a value from domain to range
 * @param  val
 * @param  domain Domain extent domain[0] can be bigger than domain[1]
 * @param  range  Range extent range[0] can be bigger than range[1]
 * @param  clamp Default to be false
 */
export function linearMap(
    val: number,
    domain: number[],
    range: number[],
    clamp?: boolean
): number {
    const d0 = domain[0];
    const d1 = domain[1];
    const r0 = range[0];
    const r1 = range[1];

    const subDomain = d1 - d0;
    const subRange = r1 - r0;

    if (subDomain === 0) {
        return subRange === 0
            ? r0
            : (r0 + r1) / 2;
    }

    // Avoid accuracy problem in edge, such as
    // 146.39 - 62.83 === 83.55999999999999.
    // See echarts/test/ut/spec/util/number.js#linearMap#accuracyError
    // It is a little verbose for efficiency considering this method
    // is a hotspot.
    if (clamp) {
        if (subDomain > 0) {
            if (val <= d0) {
                return r0;
            }
            else if (val >= d1) {
                return r1;
            }
        }
        else {
            if (val >= d0) {
                return r0;
            }
            else if (val <= d1) {
                return r1;
            }
        }
    }
    else {
        if (val === d0) {
            return r0;
        }
        if (val === d1) {
            return r1;
        }
    }

    return (val - d0) / subDomain * subRange + r0;
}

/**
 * Preserve the name `parsePercent` for backward compatibility,
 * and it's effectively published as `echarts.number.parsePercent`.
 */
export const parsePercent = parsePositionOption;

/**
 * @see {parsePositionSizeOption} and also accept a string preset.
 * @see {PositionSizeOption}
 */
export function parsePositionOption(option: unknown, percentBase: number, percentOffset?: number): number {
    switch (option) {
        case 'center':
        case 'middle':
            option = '50%';
            break;
        case 'left':
        case 'top':
            option = '0%';
            break;
        case 'right':
        case 'bottom':
            option = '100%';
            break;
    }
    return parsePositionSizeOption(option, percentBase, percentOffset);
}

/**
 * Accept number, or numeric stirng (`'123'`), or percentage ('100%'), as x/y/width/height pixel number.
 * If null/undefined or invalid, return NaN.
 * (But allow JS type coercion (`+option`) due to backward compatibility)
 * @see {PositionSizeOption}
 */
export function parsePositionSizeOption(option: unknown, percentBase: number, percentOffset?: number): number {
    if (zrUtil.isString(option)) {
        if (_trim(option).match(/%$/)) {
            return parseFloat(option) / 100 * percentBase + (percentOffset || 0);
        }
        return parseFloat(option);
    }
    // Allow flexible input due to backward compatibility.
    return option == null ? NaN : +option;
}

/**
 * [Feature_1] Round at specified precision.
 *  FIXME: this is not a general-purpose rounding implementation yet due to `TO_FIXED_SUPPORTED_PRECISION_MAX`.
 *  e.g., `round(1.25 * 1e-150, 151)` has no overflow in IEEE754 64bit float, but can not be handled by
 *  this method.
 *
 * [Feature_2] Support return string to avoid scientific notation like '3.5e-7'.
 *
 * [Feature_3] Fix rounding error of float numbers !!!ONLY SUITABLE FOR SPECIAL CASES!!!.
 *  [CAVEAT]:
 *      Rounding is NEVER a general-purpose solution for rounding errors.
 *      Consider a case: `expect=123.99994999`, `actual=123.99995000` (suppose rounding error occurs).
 *          Calling `round(expect, 4)` gets `123.9999`.
 *          Calling `round(actual, 4)` gets `124.0000`.
 *          A unacceptable result arises, even if the original difference is only `0.00000001` (tiny
 *          and not strongly correlated with the digit pattern).
 *      So the rounding approach works only if:
 *          The digit next to the `precision` won't cross the rounding boundary. Typically, it works if
 *          the digit next to the `precision` is expected to be `0`, and the rounding error is small
 *          enough and impossible to affect that digit (`roundingError < Math.pow(10, -precision) / 2`).
 *      The quantity of a rounding error can be roughly estimated by formula:
 *          `minPrecisionRoundingErrorMayOccur ~= max(0, floor(14 - quantityExponent(val)))`
 *          MEMO: This is derived from:
 *              Let ` EXP52B10 = log10(pow(2, 52)) = 15.65355977452702 `
 *                  (`52` is IEEE754 float64 mantissa bits count)
 *              We require: ` abs(val) * pow(10, precision) < pow(10, EXP52B10) `
 *              Hence: ` precision < EXP52B10 - log10(abs(val)) `
 *              Hence: ` precision = floor( EXP52B10 - log10(abs(val)) ) `
 *              Since: ` quantityExponent(val) = floor(log10(abs(val))) `
 *              Hence: ` precision ~= floor(EXP52B10 - 1 - quantityExponent(val))
 */
export function round(x: number | string, precision: number): number;
export function round(x: number | string, precision: number, returnStr: false): number;
export function round(x: number | string, precision: number, returnStr: true): string;
export function round(x: number | string, precision: number, returnStr?: boolean): string | number {
    if (__DEV__) {
        // NOTICE: We should not provided a default precision, since there is no universally adaptable
        // precision. The caller need to input a precision according to the scenarios.
        zrUtil.assert(precision != null);
    }
    if (isNaN(precision)) {
        // precision utils (such as getAcceptableTickPrecision) may return NaN.
        return returnStr ? '' + x : +x;
    }
    // Avoid range error
    precision = mathMin(mathMax(0, precision), TO_FIXED_SUPPORTED_PRECISION_MAX);
    // PENDING: 1.005.toFixed(2) is '1.00' rather than '1.01'
    x = (+x).toFixed(precision);
    return (returnStr ? x : +x);
}

export function roundLegacy(x: number | string, precision?: number): number;
export function roundLegacy(x: number | string, precision: number, returnStr: false): number;
export function roundLegacy(x: number | string, precision: number, returnStr: true): string;
export function roundLegacy(x: number | string, precision?: number, returnStr?: boolean): string | number {
    if (precision == null) {
        precision = 10;
    }
    return round(x, precision, returnStr as any);
}

/**
 * Inplacd asc sort arr.
 * The input arr will be modified.
 */
export function asc<T extends number[]>(arr: T): T {
    arr.sort(function (a, b) {
        return a - b;
    });
    return arr;
}

/**
 * Get precision.
 * e.g. `getPrecisionSafe(100.123)` return `3`.
 * e.g. `getPrecisionSafe(100)` return `0`.
 */
export function getPrecision(val: string | number): number {
    val = +val;
    if (isNaN(val)) {
        return 0;
    }

    // It is much faster than methods converting number to string as follows
    //      let tmp = val.toString();
    //      return tmp.length - 1 - tmp.indexOf('.');
    // especially when precision is low
    // Notice:
    // (1) If the loop count is over about 20, it is slower than `getPrecisionSafe`.
    //     (see https://jsbench.me/2vkpcekkvw/1)
    // (2) If the val is less than for example 1e-15, the result may be incorrect.
    //     (see test/ut/spec/util/number.test.ts `getPrecision_equal_random`)
    if (val > 1e-14) {
        let e = 1;
        for (let i = 0; i < 15; i++, e *= 10) {
            if (mathRound(val * e) / e === val) {
                return i;
            }
        }
    }

    return getPrecisionSafe(val);
}

/**
 * Get precision with slow but safe method
 * e.g. `getPrecisionSafe(100.123)` return `3`.
 * e.g. `getPrecisionSafe(100)` return `0`.
 */
export function getPrecisionSafe(val: string | number): number {
    // toLowerCase for: '3.4E-12'
    const str = val.toString().toLowerCase();

    // Consider scientific notation: '3.4e-12' '3.4e+12'
    const eIndex = str.indexOf('e');
    const exp = eIndex > 0 ? +str.slice(eIndex + 1) : 0;
    const significandPartLen = eIndex > 0 ? eIndex : str.length;
    const dotIndex = str.indexOf('.');
    const decimalPartLen = dotIndex < 0 ? 0 : significandPartLen - 1 - dotIndex;
    return mathMax(0, decimalPartLen - exp);
}

/**
 * @deprecated Use `getAcceptableTickPrecision` instead. See bad case in `test/ut/spec/util/number.test.ts`
 * NOTE: originally introduced in commit `ff93e3e7f9ff24902e10d4469fd3187393b05feb`
 *
 * Minimal discernible data precision according to a single pixel.
 */
export function getPixelPrecision(dataExtent: [number, number], pixelExtent: [number, number]): number {
    const dataQuantity = mathFloor(mathLog(dataExtent[1] - dataExtent[0]) / mathLN10);
    const sizeQuantity = mathRound(mathLog(mathAbs(pixelExtent[1] - pixelExtent[0])) / mathLN10);
    // toFixed() digits argument must be between 0 and 20.
    const precision = mathMin(mathMax(-dataQuantity + sizeQuantity, 0), TO_FIXED_SUPPORTED_PRECISION_MAX);
    return !isFinite(precision) ? TO_FIXED_SUPPORTED_PRECISION_MAX : precision;
}

/**
 * This method chooses a reasonable "data" precision that can be used in `round` method.
 * A reasonable precision is suitable for display; it may cause cumulative error but acceptable.
 *
 * "data" is linearly mapped to pixel according to the ratio determined by `dataSpan` and `pxSpan`.
 * The diff from the original "data" to the rounded "data" (with the result precision) should be
 * equal or less than `pxDiffAcceptable`, which is typically `1` pixel.
 * And the result precision should be as small as possible for a concise display.
 *
 * [NOTICE]: using arbitrary parameters is NOT preferable - a discernible misalign (e.g., over 1px)
 *  may occur, especially when `splitLine` is displayed.
 *
 * PENDING: Only the linear case is addressed for now; other mapping methods (like logarithm) will
 *  not be covered until necessary.
 */
export function getAcceptableTickPrecision(
    dataExtent: number[],
    // Typically, `Math.abs(pixelExtent[1] - pixelExtent[0])`.
    pxSpan: number,
    // By default, `1`.
    pxDiffAcceptable: number | NullUndefined
    // Return a precision >= 0
    // This precision can be used in method `round`.
    // Return `NaN` for edge case or illegal inputs. Callers need to handle that.
): number {
    const dataSpan = mathAbs(dataExtent[1] - dataExtent[0]);
    if (!isFinite(dataSpan) || dataSpan === 0) {
        return NaN;
    }
    // Formula for choosing an acceptable precision:
    //  Let `pxDiff = abs(dataSpan - round(dataSpan, precision))`.
    //  We require `pxDiff <= dataSpan * pxDiffAcceptable / pxSpan`.
    //  Consider the nature of "round", the max `pxDiff` is: `pow(10, -precision) / 2`,
    //  Hence: `pow(10, -precision) / 2 <= dataSpan * pxDiffAcceptable / pxSpan`
    //  Hence: `precision >= -log10(2 * dataSpan * pxDiffAcceptable / pxSpan)`
    const dataExp2 = mathLog(2 * mathAbs(pxDiffAcceptable || 1) * mathAbs(dataSpan)) / mathLN10;
    const pxExp = mathLog(mathAbs(pxSpan)) / mathLN10;
    // PENDING: Rounding error generally does not matter; do not fix it before `Math.ceil`
    // until bad case occur.
    let precision = mathMax(0, mathCeil(-dataExp2 + pxExp));
    if (!isFinite(precision)) {
        // If dataSpan is near `0`, the result should not be too big or even `Infinity`.
        precision = NaN;
    }
    return precision;
}

/**
 * Get a data of given precision, assuring the sum of percentages
 * in valueList is 1.
 * The largest remainder method is used.
 * https://en.wikipedia.org/wiki/Largest_remainder_method
 *
 * @param valueList a list of all data
 * @param idx index of the data to be processed in valueList
 * @param precision integer number showing digits of precision
 * @return percent ranging from 0 to 100
 */
export function getPercentWithPrecision(valueList: number[], idx: number, precision: number): number {
    if (!valueList[idx]) {
        return 0;
    }

    const seats = getPercentSeats(valueList, precision);

    return seats[idx] || 0;
}

/**
 * Get a data of given precision, assuring the sum of percentages
 * in valueList is 1.
 * The largest remainder method is used.
 * https://en.wikipedia.org/wiki/Largest_remainder_method
 *
 * @param valueList a list of all data
 * @param precision integer number showing digits of precision
 * @return {Array<number>}
 */
export function getPercentSeats(valueList: number[], precision: number): number[] {
    const sum = zrUtil.reduce(valueList, function (acc, val) {
        return acc + (isNaN(val) ? 0 : val);
    }, 0);
    if (sum === 0) {
        return [];
    }

    const digits = mathPow(10, precision);
    const votesPerQuota = zrUtil.map(valueList, function (val) {
        return (isNaN(val) ? 0 : val) / sum * digits * 100;
    });
    const targetSeats = digits * 100;

    const seats = zrUtil.map(votesPerQuota, function (votes) {
        // Assign automatic seats.
        return mathFloor(votes);
    });
    let currentSum = zrUtil.reduce(seats, function (acc, val) {
        return acc + val;
    }, 0);

    const remainder = zrUtil.map(votesPerQuota, function (votes, idx) {
        return votes - seats[idx];
    });

    // Has remainding votes.
    while (currentSum < targetSeats) {
        // Find next largest remainder.
        let max = Number.NEGATIVE_INFINITY;
        let maxId = null;
        for (let i = 0, len = remainder.length; i < len; ++i) {
            if (remainder[i] > max) {
                max = remainder[i];
                maxId = i;
            }
        }

        // Add a vote to max remainder.
        ++seats[maxId];
        remainder[maxId] = 0;
        ++currentSum;
    }
    return zrUtil.map(seats, function (seat) {
        return seat / digits;
    });
}

/**
 * Solve the floating point adding problem like 0.1 + 0.2 === 0.30000000000000004
 * See <http://0.30000000000000004.com/>
 */
export function addSafe(val0: number, val1: number): number {
    const maxPrecision = mathMax(getPrecision(val0), getPrecision(val1));
    // const multiplier = Math.pow(10, maxPrecision);
    // return (mathRound(val0 * multiplier) + mathRound(val1 * multiplier)) / multiplier;
    const sum = val0 + val1;
    // // PENDING: support more?
    return maxPrecision > TO_FIXED_SUPPORTED_PRECISION_MAX
        ? sum : round(sum, maxPrecision);
}

// Number.MAX_SAFE_INTEGER, ie do not support.
export const MAX_SAFE_INTEGER = 9007199254740991;

/**
 * To 0 - 2 * PI, considering negative radian.
 */
export function remRadian(radian: number): number {
    const pi2 = mathPI * 2;
    return (radian % pi2 + pi2) % pi2;
}

/**
 * @param {type} radian
 * @return {boolean}
 */
export function isRadianAroundZero(val: number): boolean {
    return val > -RADIAN_EPSILON && val < RADIAN_EPSILON;
}

// eslint-disable-next-line
const TIME_REG = /^(?:(\d{4})(?:[-\/](\d{1,2})(?:[-\/](\d{1,2})(?:[T ](\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:[.,](\d+))?)?)?(Z|[\+\-]\d\d:?\d\d)?)?)?)?)?$/; // jshint ignore:line

/**
 * @param value valid type: number | string | Date, otherwise return `new Date(NaN)`
 *   These values can be accepted:
 *   + An instance of Date, represent a time in its own time zone.
 *   + Or string in a subset of ISO 8601, only including:
 *     + only year, month, date: '2012-03', '2012-03-01', '2012-03-01 05', '2012-03-01 05:06',
 *     + separated with T or space: '2012-03-01T12:22:33.123', '2012-03-01 12:22:33.123',
 *     + time zone: '2012-03-01T12:22:33Z', '2012-03-01T12:22:33+8000', '2012-03-01T12:22:33-05:00',
 *     all of which will be treated as local time if time zone is not specified
 *     (see <https://momentjs.com/>).
 *   + Or other string format, including (all of which will be treated as local time):
 *     '2012', '2012-3-1', '2012/3/1', '2012/03/01',
 *     '2009/6/12 2:00', '2009/6/12 2:05:08', '2009/6/12 2:05:08.123'
 *   + a timestamp, which represent a time in UTC.
 * @return date Never be null/undefined. If invalid, return `new Date(NaN)`.
 */
export function parseDate(value: unknown): Date {
    if (value instanceof Date) {
        return value;
    }
    else if (zrUtil.isString(value)) {
        // Different browsers parse date in different way, so we parse it manually.
        // Some other issues:
        // new Date('1970-01-01') is UTC,
        // new Date('1970/01/01') and new Date('1970-1-01') is local.
        // See issue #3623
        const match = TIME_REG.exec(value);

        if (!match) {
            // return Invalid Date.
            return new Date(NaN);
        }

        // Use local time when no timezone offset is specified.
        if (!match[8]) {
            // match[n] can only be string or undefined.
            // But take care of '12' + 1 => '121'.
            return new Date(
                +match[1],
                +(match[2] || 1) - 1,
                +match[3] || 1,
                +match[4] || 0,
                +(match[5] || 0),
                +match[6] || 0,
                match[7] ? +match[7].substring(0, 3) : 0
            );
        }
        // Timezoneoffset of Javascript Date has considered DST (Daylight Saving Time,
        // https://tc39.github.io/ecma262/#sec-daylight-saving-time-adjustment).
        // For example, system timezone is set as "Time Zone: America/Toronto",
        // then these code will get different result:
        // `new Date(1478411999999).getTimezoneOffset();  // get 240`
        // `new Date(1478412000000).getTimezoneOffset();  // get 300`
        // So we should not use `new Date`, but use `Date.UTC`.
        else {
            let hour = +match[4] || 0;
            if (match[8].toUpperCase() !== 'Z') {
                hour -= +match[8].slice(0, 3);
            }
            return new Date(Date.UTC(
                +match[1],
                +(match[2] || 1) - 1,
                +match[3] || 1,
                hour,
                +(match[5] || 0),
                +match[6] || 0,
                match[7] ? +match[7].substring(0, 3) : 0
            ));
        }
    }
    else if (value == null) {
        return new Date(NaN);
    }

    return new Date(mathRound(value as number));
}

/**
 * Quantity of a number. e.g. 0.1, 1, 10, 100
 *
 * @param val
 * @return
 */
export function quantity(val: number): number {
    return mathPow(10, quantityExponent(val));
}

/**
 * Exponent of the quantity of a number
 * e.g., 9876 equals to 9.876*10^3, so quantityExponent(9876) is 3
 * e.g., 0.09876 equals to 9.876*10^-2, so quantityExponent(0.09876) is -2
 *
 * @param val non-negative value
 * @return
 */
export function quantityExponent(val: number): number {
    if (val === 0) {
        // PENDING: like IEEE754 use exponent `0` in this case.
        // but methematically, exponent of zero is `-Infinity`.
        return 0;
    }

    let exp = mathFloor(mathLog(val) / mathLN10);
    /**
     * exp is expected to be the rounded-down result of the base-10 log of val.
     * But due to the precision loss with Math.log(val), we need to restore it
     * using 10^exp to make sure we can get val back from exp. #11249
     */
    if (val / mathPow(10, exp) >= 10) {
        exp++;
    }
    return exp;
}

export const NICE_MODE_ROUND = 1 as const;
export const NICE_MODE_MIN = 2 as const;

/**
 * find a “nice” number approximately equal to x. Round the number if 'round',
 * take ceiling if 'round'. The primary observation is that the “nicest”
 * numbers in decimal are 1, 2, and 5, and all power-of-ten multiples of these numbers.
 *
 * See "Nice Numbers for Graph Labels" of Graphic Gems.
 *
 * @param  val Non-negative value.
 * @return Niced number
 */
export function nice(
    val: number,
    // All non-`NICE_MODE_MIN`-truthy values means `NICE_MODE_ROUND`, for backward compatibility.
    mode?: boolean | typeof NICE_MODE_ROUND | typeof NICE_MODE_MIN
): number {
    // Consider the scientific notation of `val`:
    //  - `exponent` is its exponent.
    //  - `f` is its coefficient. `1 <= f < 10`.
    //  e.g., if `val` is `0.0054321`, `exponent` is `-3`, `f` is `5.4321`,
    //      The result is `0.005` on NICE_MODE_ROUND.
    //  e.g., if `val` is `987.12345`, `exponent` is `2`, `f` is `9.8712345`,
    //      The result is `1000` on NICE_MODE_ROUND.
    //  e.g., if `val` is `0`,
    //      The result is `1`.
    const exponent = quantityExponent(val);
    // No rounding error in Math.pow(10, integer).
    const exp10 = mathPow(10, exponent);
    const f = val / exp10;

    let nf;
    if (mode === NICE_MODE_MIN) {
        nf = 1;
    }
    else if (mode) {
        if (f < 1.5) {
            nf = 1;
        }
        else if (f < 2.5) {
            nf = 2;
        }
        else if (f < 4) {
            nf = 3;
        }
        else if (f < 7) {
            nf = 5;
        }
        else {
            nf = 10;
        }
    }
    else {
        if (f < 1) {
            nf = 1;
        }
        else if (f < 2) {
            nf = 2;
        }
        else if (f < 3) {
            nf = 3;
        }
        else if (f < 5) {
            nf = 5;
        }
        else {
            nf = 10;
        }
    }
    val = nf * exp10;

    // Fix IEEE 754 float rounding error
    return round(val, -exponent);
}

/**
 * This code was copied from "d3.js"
 * <https://github.com/d3/d3/blob/9cc9a875e636a1dcf36cc1e07bdf77e1ad6e2c74/src/arrays/quantile.js>.
 * See the license statement at the head of this file.
 * @param ascArr
 */
export function quantile(ascArr: number[], p: number): number {
    const H = (ascArr.length - 1) * p + 1;
    const h = mathFloor(H);
    const v = +ascArr[h - 1];
    const e = H - h;
    return e ? v + e * (ascArr[h] - v) : v;
}

type IntervalItem = {
    interval: [number, number]
    close: [0 | 1, 0 | 1]
};
/**
 * Order intervals asc, and split them when overlap.
 * expect(numberUtil.reformIntervals([
 *     {interval: [18, 62], close: [1, 1]},
 *     {interval: [-Infinity, -70], close: [0, 0]},
 *     {interval: [-70, -26], close: [1, 1]},
 *     {interval: [-26, 18], close: [1, 1]},
 *     {interval: [62, 150], close: [1, 1]},
 *     {interval: [106, 150], close: [1, 1]},
 *     {interval: [150, Infinity], close: [0, 0]}
 * ])).toEqual([
 *     {interval: [-Infinity, -70], close: [0, 0]},
 *     {interval: [-70, -26], close: [1, 1]},
 *     {interval: [-26, 18], close: [0, 1]},
 *     {interval: [18, 62], close: [0, 1]},
 *     {interval: [62, 150], close: [0, 1]},
 *     {interval: [150, Infinity], close: [0, 0]}
 * ]);
 * @param list, where `close` mean open or close
 *        of the interval, and Infinity can be used.
 * @return The origin list, which has been reformed.
 */
export function reformIntervals(list: IntervalItem[]): IntervalItem[] {
    list.sort(function (a, b) {
        return littleThan(a, b, 0) ? -1 : 1;
    });

    let curr = -Infinity;
    let currClose = 1;
    for (let i = 0; i < list.length;) {
        const interval = list[i].interval;
        const close = list[i].close;

        for (let lg = 0; lg < 2; lg++) {
            if (interval[lg] <= curr) {
                interval[lg] = curr;
                close[lg] = (!lg ? 1 - currClose : 1) as 0 | 1;
            }
            curr = interval[lg];
            currClose = close[lg];
        }

        if (interval[0] === interval[1] && close[0] * close[1] !== 1) {
            list.splice(i, 1);
        }
        else {
            i++;
        }
    }

    return list;

    function littleThan(a: IntervalItem, b: IntervalItem, lg: number): boolean {
        return a.interval[lg] < b.interval[lg]
            || (
                a.interval[lg] === b.interval[lg]
                && (
                    (a.close[lg] - b.close[lg] === (!lg ? 1 : -1))
                    || (!lg && littleThan(a, b, 1))
                )
            );
    }
}

/**
 * [Numeric is defined as]:
 *     `parseFloat(val) == val`
 * For example:
 * numeric:
 *     typeof number except NaN, '-123', '123', '2e3', '-2e3', '011', 'Infinity', Infinity,
 *     and they rounded by white-spaces or line-terminal like ' -123 \n ' (see es spec)
 * not-numeric:
 *     null, undefined, [], {}, true, false, 'NaN', NaN, '123ab',
 *     empty string, string with only white-spaces or line-terminal (see es spec),
 *     0x12, '0x12', '-0x12', 012, '012', '-012',
 *     non-string, ...
 *
 * @test See full test cases in `test/ut/spec/util/number.js`.
 * @return Must be a typeof number. If not numeric, return NaN.
 */
export function numericToNumber(val: unknown): number {
    const valFloat = parseFloat(val as string);
    return (
        valFloat == val // eslint-disable-line eqeqeq
        && (valFloat !== 0 || !zrUtil.isString(val) || val.indexOf('x') <= 0) // For case ' 0x0 '.
    ) ? valFloat : NaN;
}

/**
 * Definition of "numeric": see `numericToNumber`.
 */
export function isNumeric(val: unknown): val is number {
    return !isNaN(numericToNumber(val));
}

/**
 * Use random base to prevent users hard code depending on
 * this auto generated marker id.
 * @return An positive integer.
 */
export function getRandomIdBase(): number {
    return mathRound(mathRandom() * 9);
}

/**
 * Get the greatest common divisor.
 *
 * @param {number} a one number
 * @param {number} b the other number
 */
export function getGreatestCommonDividor(a: number, b: number): number {
    if (b === 0) {
        return a;
    }
    return getGreatestCommonDividor(b, a % b);
}

/**
 * Get the least common multiple.
 *
 * @param {number} a one number
 * @param {number} b the other number
 */
export function getLeastCommonMultiple(a: number, b: number) {
    if (a == null) {
        return b;
    }
    if (b == null) {
        return a;
    }
    return a * b / getGreatestCommonDividor(a, b);
}
