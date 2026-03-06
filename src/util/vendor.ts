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

import { assert } from 'zrender/src/core/util';
import { error } from './log';
import { UNDEFINED_STR } from './types';
import { MAX_SAFE_INTEGER } from './number';

/* global Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array,
   Uint8ClampedArray, Float32Array, Float64Array */

export const Int8ArrayCtor = typeof Int8Array !== UNDEFINED_STR ? Int8Array : undefined;
export const Int16ArrayCtor = typeof Int16Array !== UNDEFINED_STR ? Int16Array : undefined;
export const Int32ArrayCtor = typeof Int32Array !== UNDEFINED_STR ? Int32Array : undefined;
export const Uint8ArrayCtor = typeof Uint8Array !== UNDEFINED_STR ? Uint8Array : undefined;
export const Uint16ArrayCtor = typeof Uint16Array !== UNDEFINED_STR ? Uint16Array : undefined;
export const Uint32ArrayCtor = typeof Uint32Array !== UNDEFINED_STR ? Uint32Array : undefined;
export const Uint8ClampedArrayCtor = typeof Uint8ClampedArray !== UNDEFINED_STR ? Uint8ClampedArray : undefined;
export const Float32ArrayCtor = typeof Float32Array !== UNDEFINED_STR ? Float32Array : undefined;
export const Float64ArrayCtor = typeof Float64Array !== UNDEFINED_STR ? Float64Array : undefined;

// PENDING: `BigInt64Array` `BigUint64Array` is not suppored yet.
export type TypedArrayCtor =
    typeof Int8ArrayCtor
    | typeof Int16ArrayCtor
    | typeof Int32ArrayCtor
    | typeof Uint8ArrayCtor
    | typeof Uint16ArrayCtor
    | typeof Uint32ArrayCtor
    | typeof Uint8ClampedArrayCtor
    | typeof Float32ArrayCtor
    | typeof Float64ArrayCtor;

export type TypedArrayType =
    Int8Array
    | Int16Array
    | Int32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Uint8ClampedArray
    | Float32Array
    | Float64Array;


export function createFloat32Array(capacity: number): number[] | Float32Array {
    return tryEnsureTypedArray({ctor: Float32ArrayCtor}, capacity).arr as number[] | Float32Array;
}

/**
 * Use Typed Array if possible for performance optimization, otherwise fallback to a normal array.
 *
 * Usage
 *  const tyArr = tryEnsureCompatibleTypedArray({ctor: Float64ArrayCtor}, capacity);
 */
export type CompatibleTypedArray = {
    // Write by this method.
    // If null/undefined, create one.
    // Never be null/undefined after `tryEnsureTypedArray` is called.
    arr?: TypedArrayType | number[];
    // Write by this method.
    // Whether is actually typed array.
    // Never be null/undefined after `tryEnsureTypedArray` is called.
    typed?: boolean;

    // Need to be provided by callers.
    // Expected constructor. Do not change it.
    ctor: TypedArrayCtor;
};
export function tryEnsureTypedArray(
    tyArr: CompatibleTypedArray,
    // Can add more types if needed.
    // NOTICE: Callers need to manage data length themselves.
    // Do not consider `capacity` as the data length.
    capacity: number
): CompatibleTypedArray {
    if (__DEV__) {
        assert(
            capacity != null && isFinite(capacity) && capacity >= 0
            && tyArr.hasOwnProperty('ctor')
        );
    }
    const existingArr = tyArr.arr;
    const ctor = tyArr.ctor;

    if (capacity > MAX_SAFE_INTEGER) {
        capacity = MAX_SAFE_INTEGER;
    }

    if (!existingArr || (tyArr.typed && existingArr.length < capacity)) {
        let nextArr: TypedArrayType | number[];
        if (ctor) {
            try {
                // A large contiguous memory allocation may cause OOM.
                nextArr = new ctor(capacity);
                tyArr.typed = true;
                existingArr && nextArr.set(existingArr);
            }
            catch (e) {
                if (__DEV__) {
                    error(e);
                }
            }
        }
        if (!nextArr) {
            nextArr = [];
            tyArr.typed = false;
            if (existingArr) {
                for (let i = 0, len = existingArr.length; i < len; i++) {
                    nextArr[i] = existingArr[i];
                }
            }
        }
        tyArr.arr = nextArr;
    }

    return tyArr;
}
