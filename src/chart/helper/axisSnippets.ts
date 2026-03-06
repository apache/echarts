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

import { calcBandWidth } from '../../coord/axisBand';
import { AxisStatisticsClient, AxisStatKey } from '../../coord/axisStatistics';
import { AxisContainShapeHandler } from '../../coord/scaleRawExtentInfo';
import { isOrdinalScale } from '../../scale/helper';
import { isNullableNumberFinite } from '../../util/number';
import { ComponentSubType } from '../../util/types';


export const getMetricsMinGapOnNonCategoryAxis: AxisStatisticsClient['getMetrics'] = function (axis) {
    return {
        liPosMinGap: !isOrdinalScale(axis.scale)
    };
};

export function createSimpleAxisStatClient(
    seriesType: ComponentSubType,
): AxisStatisticsClient {
    return {
        collectAxisSeries(ecModel, saveAxisSeries) {
            ecModel.eachSeriesByType(seriesType, function (seriesModel) {
                saveAxisSeries(seriesModel.getBaseAxis(), seriesModel);
            });
        },
        getMetrics: getMetricsMinGapOnNonCategoryAxis
    };
}

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

export function makeAxisStatKey(seriesType: ComponentSubType): AxisStatKey {
    return seriesType as AxisStatKey;
}
