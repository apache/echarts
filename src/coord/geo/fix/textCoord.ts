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

import { GeoJSONRegion } from '../Region';
import { Dictionary } from 'zrender/src/core/types';

const coordsOffsetMap = {
    '南海诸岛': [32, 80],
    // 全国
    '广东': [0, -10],
    '香港': [10, 5],
    '澳门': [-10, 10],
    // '北京': [-10, 0],
    '天津': [5, 5]
} as Dictionary<number[]>;

export default function fixTextCoords(mapType: string, region: GeoJSONRegion) {
    if (mapType === 'china') {
        const coordFix = coordsOffsetMap[region.name];
        if (coordFix) {
            const cp = region.getCenter();
            cp[0] += coordFix[0] / 10.5;
            cp[1] += -coordFix[1] / (10.5 / 0.75);
            region.setCenter(cp);
        }
    }
}