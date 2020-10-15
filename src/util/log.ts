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

import { Dictionary } from './types';
import { map, isString, isFunction, eqNaN, isRegExp } from 'zrender/src/core/util';

const ECHARTS_PREFIX = '[ECharts] ';
const storedLogs: Dictionary<boolean> = {};

const hasConsole = typeof console !== 'undefined'
    // eslint-disable-next-line
    && console.warn && console.log;

export function log(str: string) {
    if (hasConsole) {
        // eslint-disable-next-line
        console.log(ECHARTS_PREFIX + str);
    }
}

export function warn(str: string) {
    if (hasConsole) {
        console.warn(ECHARTS_PREFIX + str);
    }
}

export function error(str: string) {
    if (hasConsole) {
        console.error(ECHARTS_PREFIX + str);
    }
}

export function deprecateLog(str: string) {
    if (__DEV__) {
        if (storedLogs[str]) {  // Not display duplicate message.
            return;
        }
        if (hasConsole) {
            storedLogs[str] = true;
            console.warn(ECHARTS_PREFIX + 'DEPRECATED: ' + str);
        }
    }
}

export function deprecateReplaceLog(oldOpt: string, newOpt: string, scope?: string) {
    if (__DEV__) {
        deprecateLog((scope ? `[${scope}]` : '') + `${oldOpt} is deprecated, use ${newOpt} instead.`);
    }
}

export function consoleLog(...args: unknown[]) {
    if (__DEV__) {
        /* eslint-disable no-console */
        if (typeof console !== 'undefined' && console.log) {
            console.log.apply(console, args);
        }
        /* eslint-enable no-console */
    }
}

/**
 * If in __DEV__ environment, get console printable message for users hint.
 * Parameters are separated by ' '.
 * @usuage
 * makePrintable('This is an error on', someVar, someObj);
 *
 * @param hintInfo anything about the current execution context to hint users.
 * @throws Error
 */
export function makePrintable(...hintInfo: unknown[]): string {
    let msg = '';

    if (__DEV__) {
        // Fuzzy stringify for print.
        // This code only exist in dev environment.
        const makePrintableStringIfPossible = (val: unknown): string => {
            return val === void 0 ? 'undefined'
                : val === Infinity ? 'Infinity'
                : val === -Infinity ? '-Infinity'
                : eqNaN(val) ? 'NaN'
                : val instanceof Date ? 'Date(' + val.toISOString() + ')'
                : isFunction(val) ? 'function () { ... }'
                : isRegExp(val) ? val + ''
                : null;
        };
        msg = map(hintInfo, arg => {
            if (isString(arg)) {
                // Print without quotation mark for some statement.
                return arg;
            }
            else {
                const printableStr = makePrintableStringIfPossible(arg);
                if (printableStr != null) {
                    return printableStr;
                }
                else if (typeof JSON !== 'undefined' && JSON.stringify) {
                    try {
                        return JSON.stringify(arg, function (n, val) {
                            const printableStr = makePrintableStringIfPossible(val);
                            return printableStr == null ? val : printableStr;
                        });
                        // In most cases the info object is small, so do not line break.
                    }
                    catch (err) {
                        return '?';
                    }
                }
                else {
                    return '?';
                }
            }
        }).join(' ');
    }

    return msg;
}

/**
 * @throws Error
 */
export function throwError(msg?: string) {
    throw new Error(msg);
}
