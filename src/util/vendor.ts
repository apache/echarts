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

import { isArray } from 'zrender/src/core/util';

/* global Float32Array */
const supportFloat32Array = typeof Float32Array !== 'undefined';

const Float32ArrayCtor = !supportFloat32Array ? Array : Float32Array;

export function createFloat32Array(arg: number | number[]): number[] | Float32Array {
    if (isArray(arg)) {
        // Return self directly if don't support TypedArray.
        return supportFloat32Array ? new Float32Array(arg) : arg;
    }
    // Else is number
    return new Float32ArrayCtor(arg);
}