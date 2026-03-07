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

import GlobalModel from '../model/Global';
import { makeInner } from './model';


const ecModelCacheInner = makeInner<{
    fullUpdate: GlobalModelCachePerECFullUpdate;
    prepare: GlobalModelCachePerECPrepare;
}, GlobalModel>();

export type GlobalModelCachePerECPrepare = {__: 'prepare'}; // Nominal to distinguish.
export type GlobalModelCachePerECFullUpdate = {__: 'fullUpdate'}; // Nominal to distinguish.

/**
 * CAVEAT: Can only be called by `echarts.ts`
 */
export function resetCachePerECPrepare(ecModel: GlobalModel): void {
    ecModelCacheInner(ecModel).prepare = {} as GlobalModelCachePerECPrepare;
}

/**
 * CAVEAT: Can only be called by `echarts.ts`
 */
export function resetCachePerECFullUpdate(ecModel: GlobalModel): void {
    ecModelCacheInner(ecModel).fullUpdate = {} as GlobalModelCachePerECFullUpdate;
}

/**
 * The cache is auto cleared at the beginning of EC_PREPARE_UPDATE.
 * See also comments in EC_CYCLE.
 *
 * NOTICE:
 *  - EC_PREPARE_UPDATE is not necessarily executed before each EC_FULL_UPDATE performing.
 *    Typically, `setOption` trigger EC_PREPARE_UPDATE, but `dispatchAction` does not.
 *  - It is not cleared in EC_PARTIAL_UPDATE and EC_PROGRESSIVE_CYCLE.
 *
 */
export function getCachePerECPrepare(ecModel: GlobalModel): GlobalModelCachePerECPrepare {
    return ecModelCacheInner(ecModel).prepare;
}

/**
 * The cache is auto cleared at the beginning of EC_FULL_UPDATE.
 * See also comments in EC_CYCLE.
 *
 * NOTICE:
 *  - It is not cleared in EC_PARTIAL_UPDATE and EC_PROGRESSIVE_CYCLE.
 *  - The cache should NOT be written before EC_FULL_UPDATE started, such as:
 *      - should NOT in `getTargetSeries` methods of data processors.
 *      - should NOT in `init`/`mergeOption`/`optionUpdated`/`getData` methods of component/series models.
 *  - See `getCachePerECPrepare` for details.
 */
export function getCachePerECFullUpdate(ecModel: GlobalModel): GlobalModelCachePerECFullUpdate {
    return ecModelCacheInner(ecModel).fullUpdate;
}
