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


const ORIGIN_METHOD = '\0__throttleOriginMethod' as const;
const RATE = '\0__throttleRate' as const;
const THROTTLE_TYPE = '\0__throttleType' as const;

type ThrottleFunction = (this: unknown, ...args: unknown[]) => void;
export type ThrottleType = 'fixRate' | 'debounce';

export interface ThrottleController {
    clear(): void;
    debounceNextCall(debounceDelay: number): void;
};

/**
 * @public
 * @param {(Function)} fn
 * @param {number} [delay=0] Unit: ms.
 * @param {boolean} [debounce=false]
 *        true: If call interval less than `delay`, only the last call works.
 *        false: If call interval less than `delay, call works on fixed rate.
 * @return {(Function)} throttled fn.
 */
export function throttle<T extends ThrottleFunction>(
    fn: T,
    delay?: number,
    debounce?: boolean
): T & ThrottleController {

    let currCall;
    let lastCall = 0;
    let lastExec = 0;
    let timer: ReturnType<typeof setTimeout> = null;
    let diff;
    let scope: unknown;
    let args: unknown[];
    let debounceNextCall: number;

    delay = delay || 0;

    function exec(): void {
        lastExec = (new Date()).getTime();
        timer = null;
        fn.apply(scope, args || []);
    }

    const cb = function (this: unknown, ...cbArgs: unknown[]): void {
        currCall = (new Date()).getTime();
        scope = this;
        args = cbArgs;
        const thisDelay = debounceNextCall || delay;
        const thisDebounce = debounceNextCall || debounce;
        debounceNextCall = null;
        diff = currCall - (thisDebounce ? lastCall : lastExec) - thisDelay;

        clearTimeout(timer);

        // Here we should make sure that: the `exec` SHOULD NOT be called later
        // than a new call of `cb`, that is, preserving the command order. Consider
        // calculating "scale rate" when roaming as an example. When a call of `cb`
        // happens, either the `exec` is called dierectly, or the call is delayed.
        // But the delayed call should never be later than next call of `cb`. Under
        // this assurance, we can simply update view state each time `dispatchAction`
        // triggered by user roaming, but not need to add extra code to avoid the
        // state being "rolled-back".
        if (thisDebounce) {
            timer = setTimeout(exec, thisDelay);
        }
        else {
            if (diff >= 0) {
                exec();
            }
            else {
                timer = setTimeout(exec, -diff);
            }
        }

        lastCall = currCall;
    } as T & ThrottleController;

    /**
     * Clear throttle.
     * @public
     */
    cb.clear = function (): void {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    /**
     * Enable debounce once.
     */
    cb.debounceNextCall = function (debounceDelay: number): void {
        debounceNextCall = debounceDelay;
    };

    return cb;
}

/**
 * Create throttle method or update throttle rate.
 *
 * @example
 * ComponentView.prototype.render = function () {
 *     ...
 *     throttle.createOrUpdate(
 *         this,
 *         '_dispatchAction',
 *         this.model.get('throttle'),
 *         'fixRate'
 *     );
 * };
 * ComponentView.prototype.remove = function () {
 *     throttle.clear(this, '_dispatchAction');
 * };
 * ComponentView.prototype.dispose = function () {
 *     throttle.clear(this, '_dispatchAction');
 * };
 *
 */
export function createOrUpdate<T, S extends keyof T, P = T[S]>(
    obj: T,
    fnAttr: S,
    rate: number,
    throttleType: ThrottleType
): P extends ThrottleFunction ? P & ThrottleController : never {
    let fn = obj[fnAttr];

    if (!fn) {
        return;
    }

    const originFn = (fn as any)[ORIGIN_METHOD] || fn;
    const lastThrottleType = (fn as any)[THROTTLE_TYPE];
    const lastRate = (fn as any)[RATE];

    if (lastRate !== rate || lastThrottleType !== throttleType) {
        if (rate == null || !throttleType) {
            return (obj[fnAttr] = originFn);
        }

        fn = obj[fnAttr] = throttle(
            originFn, rate, throttleType === 'debounce'
        );
        (fn as any)[ORIGIN_METHOD] = originFn;
        (fn as any)[THROTTLE_TYPE] = throttleType;
        (fn as any)[RATE] = rate;
    }

    return fn as ReturnType<typeof createOrUpdate>;
}

/**
 * Clear throttle. Example see throttle.createOrUpdate.
 */
export function clear<T, S extends keyof T>(obj: T, fnAttr: S): void {
    const fn = obj[fnAttr];
    if (fn && (fn as any)[ORIGIN_METHOD]) {
        // Clear throttle
        (fn as any).clear && (fn as any).clear();
        obj[fnAttr] = (fn as any)[ORIGIN_METHOD];
    }
}
