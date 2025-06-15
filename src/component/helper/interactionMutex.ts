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

import { ZRenderType } from 'zrender/src/zrender';
import * as echarts from '../../core/echarts';
import { noop } from 'zrender/src/core/util';
import { makeInner } from '../../util/model';

type InteractionMutexResource = {
    globalPan: string
};
const inner = makeInner<InteractionMutexResource, ZRenderType>();

export function take(
    zr: ZRenderType,
    resourceKey: keyof InteractionMutexResource,
    userKey: InteractionMutexResource[keyof InteractionMutexResource]
) {
    inner(zr)[resourceKey] = userKey;
}

export function release(
    zr: ZRenderType,
    resourceKey: keyof InteractionMutexResource,
    userKey: InteractionMutexResource[keyof InteractionMutexResource]
) {
    const store = inner(zr);
    const uKey = store[resourceKey];

    if (uKey === userKey) {
        store[resourceKey] = null;
    }
}

export function isTaken(
    zr: ZRenderType,
    resourceKey: keyof InteractionMutexResource,
) {
    return !!inner(zr)[resourceKey];
}

/**
 * payload: {
 *     type: 'takeGlobalCursor',
 *     key: 'dataZoomSelect', or 'brush', or ...,
 *         If no userKey, release global cursor.
 * }
 */
// TODO: SELF REGISTERED.
echarts.registerAction(
    {type: 'takeGlobalCursor', event: 'globalCursorTaken', update: 'update'},
    noop
);
