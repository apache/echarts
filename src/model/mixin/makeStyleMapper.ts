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

// TODO Parse shadow style
// TODO Only shallow path support
import * as zrUtil from 'zrender/src/core/util';
import {Dictionary} from 'zrender/src/core/types';
import {PathStyleProps} from 'zrender/src/graphic/Path';
import Model from '../Model';

export default function makeStyleMapper(properties: readonly string[][], ignoreParent?: boolean) {
    // Normalize
    for (let i = 0; i < properties.length; i++) {
        if (!properties[i][1]) {
            properties[i][1] = properties[i][0];
        }
    }

    ignoreParent = ignoreParent || false;

    return function (model: Model, excludes?: readonly string[], includes?: readonly string[]) {
        const style: Dictionary<any> = {};
        for (let i = 0; i < properties.length; i++) {
            const propName = properties[i][1];
            if ((excludes && zrUtil.indexOf(excludes, propName) >= 0)
                || (includes && zrUtil.indexOf(includes, propName) < 0)
            ) {
                continue;
            }
            const val = model.getShallow(propName, ignoreParent);
            if (val != null) {
                style[properties[i][0]] = val;
            }
        }
        // TODO Text or image?
        return style as PathStyleProps;
    };
}