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

// DEPRECATED
// Preserved for echarts-gl
import { Dictionary } from 'zrender/src/core/types';
import { GeoJSONRegion } from '../Region';

const geoCoordMap = {
    'Russia': [100, 60],
    'United States': [-99, 38],
    'United States of America': [-99, 38]
} as Dictionary<number[]>;

export default function fixGeoCoords(mapType: string, region: GeoJSONRegion) {
    if (mapType === 'world') {
        const geoCoord = geoCoordMap[region.name];
        if (geoCoord) {
            const cp = [
                geoCoord[0],
                geoCoord[1]
            ];
            region.setCenter(cp);
        }
    }
}