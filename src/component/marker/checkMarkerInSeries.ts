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
import { SeriesOption } from '../../util/types';

type MarkerTypes = 'markPoint' | 'markLine' | 'markArea';

type SeriesWithMarkerOption = SeriesOption & Partial<Record<MarkerTypes, unknown>>;

export default function checkMarkerInSeries(
    seriesOpts: SeriesOption | SeriesOption[], markerType: MarkerTypes
): boolean {
    if (!seriesOpts) {
        return false;
    }
    const seriesOptArr = isArray(seriesOpts) ? seriesOpts : [seriesOpts];
    for (let idx = 0; idx < seriesOptArr.length; idx++) {
        if (seriesOptArr[idx] && (seriesOptArr[idx] as SeriesWithMarkerOption)[markerType]) {
            return true;
        }
    }
    return false;
}