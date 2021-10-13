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

/**
 * Quick select n-th element in an array.
 *
 * Note: it will change the elements placement in array.
 */

type CompareFunc<T> = (a: T, b: T) => number;
function defaultCompareFunc(a: any, b: any): any {
    return a - b;
}

function swapElement<T>(arr: T[], idx0: number, idx1: number) {
    const tmp = arr[idx0];
    arr[idx0] = arr[idx1];
    arr[idx1] = tmp;
}

function select<T>(arr: T[], left: number, right: number, nth: number, compareFunc: CompareFunc<T>): number {
    let pivotIdx = left;
    let pivotValue;
    while (right > left) {
        pivotIdx = Math.round((right + left) / 2);
        pivotValue = arr[pivotIdx];
        // Swap pivot to the end
        swapElement(arr, pivotIdx, right);
        pivotIdx = left;
        for (let i = left; i <= right - 1; i++) {
            if (compareFunc(pivotValue, arr[i]) >= 0) {
                swapElement(arr, i, pivotIdx);
                pivotIdx++;
            }
        }
        swapElement(arr, right, pivotIdx);

        if (pivotIdx === nth) {
            return pivotIdx;
        }
        else if (pivotIdx < nth) {
            left = pivotIdx + 1;
        }
        else {
            right = pivotIdx - 1;
        }
    }
    // Left == right
    return left;
}

/**
 * @example
 *     let arr = [5, 2, 1, 4, 3]
 *     quickSelect(arr, 3);
 *     quickSelect(arr, 0, 3, 1, function (a, b) {return a - b});
 *
 * @return {number}
 */
function quickSelect<T>(arr: T[], nth: number, compareFunc: CompareFunc<T>): number;
function quickSelect<T>(arr: T[], nth: number, left: number, right: number, compareFunc: CompareFunc<T>): number;
function quickSelect<T>(
    arr: T[], left: number, right: number | CompareFunc<T>, nth?: number, compareFunc?: CompareFunc<T>
): number {
    if (arguments.length <= 3) {
        nth = left;
        if (arguments.length === 2) {
            compareFunc = defaultCompareFunc;
        }
        else {
            compareFunc = right as CompareFunc<T>;
        }
        left = 0;
        right = arr.length - 1;
    }
    return select(arr, left, right as number, nth, compareFunc);
}

export default quickSelect;