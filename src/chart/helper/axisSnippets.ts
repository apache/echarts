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

import type Axis from '../../coord/Axis';
import { calcBandWidth } from '../../coord/axisBand';
import { AXIS_STAT_KEY_DELIMITER, AxisStatKey, AxisStatMetrics } from '../../coord/axisStatistics';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import { AxisContainShapeHandler } from '../../coord/scaleRawExtentInfo';
import { isOrdinalScale } from '../../scale/helper';
import { isNullableNumberFinite } from '../../util/number';
import { ComponentSubType } from '../../util/types';


/**
 * Require `requireAxisStatistics`.
 */
export function createBandWidthBasedAxisContainShapeHandler(axisStatKey: AxisStatKey): AxisContainShapeHandler {
    return function (axis, scale, ecModel) {
        const bandWidthResult = calcBandWidth(axis, {fromStat: {key: axisStatKey}});
        const invRatio = (bandWidthResult.fromStat || {}).invRatio;
        if (isNullableNumberFinite(invRatio) && isNullableNumberFinite(bandWidthResult.w)) {
            return [-bandWidthResult.w / 2 * invRatio, bandWidthResult.w / 2 * invRatio];
        }
    };
}


/**
 * A pre-built `makeAxisStatKey`.
 * See `makeAxisStatKey2`. Use two functions rather than a optional parameter to impose checking.
 */
export function makeAxisStatKey(seriesType: ComponentSubType): AxisStatKey {
    return (seriesType + AXIS_STAT_KEY_DELIMITER) as AxisStatKey;
}
export function makeAxisStatKey2(seriesType: ComponentSubType, coordSysType: CoordinateSystem['type']): AxisStatKey {
    return (seriesType + AXIS_STAT_KEY_DELIMITER + coordSysType) as AxisStatKey;
}

/**
 * A pre-built `getMetrics`.
 */
export function getMetricsNonOrdinalLinearPositiveMinGap(axis: Axis): AxisStatMetrics {
    return {
        // non-category scale do not use `liPosMinGap` to calculate `bandWidth`.
        liPosMinGap: !isOrdinalScale(axis.scale)
    };
};
