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

import * as zrUtil from 'zrender/src/core/util';
import { ECUnitOption } from '../../util/types';

export default function (option: ECUnitOption) {
    if (!option || !option.aria) {
        return;
    }

    const aria = option.aria as any;
    // aria.show is deprecated and should use aria.enabled instead
    if (aria.show != null) {
        option.aria.enabled = aria.show;
    }

    option.aria.label = option.aria.label || {};
    // move description, general, series, data to be under aria.label
    zrUtil.each(['description', 'general', 'series', 'data'], name => {
        if (aria[name] != null) {
            aria.label[name] = aria[name];
        }
    });
}
