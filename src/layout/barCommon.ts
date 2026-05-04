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

import { assert } from 'zrender/src/core/util';
import { createMetricsNonOrdinalLinearPositiveMinGap } from '../chart/helper/axisSnippets';
import type Axis from '../coord/Axis';
import { AxisStatKey, requireAxisStatistics } from '../coord/axisStatistics';
import { EChartsExtensionInstallRegisters } from '../extension';
import { isNullableNumberFinite } from '../util/number';


export type BaseBarSeriesSubType =
    typeof SERIES_TYPE_BAR
    | typeof SERIES_TYPE_PICTORIAL_BAR;

export const SERIES_TYPE_BAR = 'bar';
export const SERIES_TYPE_PICTORIAL_BAR = 'pictorialBar';


export function requireAxisStatisticsForBaseBar(
    registers: EChartsExtensionInstallRegisters,
    axisStatKey: AxisStatKey,
    seriesType: BaseBarSeriesSubType,
    coordSysType: 'cartesian2d' | 'polar'
): void {
    requireAxisStatistics(
        registers,
        {
            key: axisStatKey,
            seriesType,
            coordSysType,
            getMetrics: createMetricsNonOrdinalLinearPositiveMinGap
        }
    );
}

// See cases in `test/bar-start.html` and `#7412`, `#8747`.
export function getStartValue(baseAxis: Axis): number {
    const val = baseAxis.scale.rawExtentInfo.makeRenderInfo().startValue;
    if (__DEV__) {
        assert(isNullableNumberFinite(val));
    }
    return val;
}

