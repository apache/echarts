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

import GlobalModel from './Global';
import { ComponentOption, ComponentMainType } from '../util/types';
import { createHashMap, assert } from 'zrender/src/core/util';
import { isComponentIdInternal } from '../util/model';

// PNEDING:
// (1) Only Internal usage at present, do not export to uses.
// (2) "Internal components" are generated internally during the `Global.ts#_mergeOption`.
//     It is added since echarts 3.
// (3) Why keep supporting "internal component" in global model rather than
//     make each type components manage their models themselves?
//     Because a potential feature that reproduces a chart from a different chart instance
//     might be useful in some BI analysis scenario, where the entire state needs to be
//     retrieved from the current chart instance. So we'd better manage all of the
//     state universally.
// (4) Internal component always merged in "replaceMerge" approach, that is, if the existing
//     internal components does not matched by a new option with the same id, it will be
//     removed.
// (5) In `InternalOptionCreator`, only the previous component models (dependencies) can be read.

interface InternalOptionCreator {
    (ecModel: GlobalModel): ComponentOption[]
}

const internalOptionCreatorMap = createHashMap<InternalOptionCreator, string>();


export function registerInternalOptionCreator(
    mainType: ComponentMainType, creator: InternalOptionCreator
) {
    assert(internalOptionCreatorMap.get(mainType) == null && creator);
    internalOptionCreatorMap.set(mainType, creator);
}


export function concatInternalOptions(
    ecModel: GlobalModel,
    mainType: ComponentMainType,
    newCmptOptionList: ComponentOption[]
): ComponentOption[] {
    const internalOptionCreator = internalOptionCreatorMap.get(mainType);
    if (!internalOptionCreator) {
        return newCmptOptionList;
    }
    const internalOptions = internalOptionCreator(ecModel);
    if (!internalOptions) {
        return newCmptOptionList;
    }
    if (__DEV__) {
        for (let i = 0; i < internalOptions.length; i++) {
            assert(isComponentIdInternal(internalOptions[i]));
        }
    }
    return newCmptOptionList.concat(internalOptions);
}
