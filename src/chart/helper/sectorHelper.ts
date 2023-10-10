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

import type Model from '../../model/Model';
import type Sector from 'zrender/src/graphic/shape/Sector';
import { isArray, map } from 'zrender/src/core/util';
import { parsePercent } from 'zrender/src/contain/text';

export function getSectorCornerRadius(
    model: Model<{ borderRadius?: string | number | (string | number)[] }>,
    shape: Pick<Sector['shape'], 'r0' | 'r'>,
    zeroIfNull?: boolean
) {
    let cornerRadius = model.get('borderRadius');
    if (cornerRadius == null) {
        return zeroIfNull ? { cornerRadius: 0 } : null;
    }
    if (!isArray(cornerRadius)) {
        cornerRadius = [cornerRadius, cornerRadius, cornerRadius, cornerRadius];
    }
    const dr = Math.abs(shape.r || 0 - shape.r0 || 0);
    return {
        cornerRadius: map(cornerRadius, cr => parsePercent(cr, dr))
    };
}
