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

import { getMetricsMinGapOnNonCategoryAxis } from '../chart/helper/axisSnippets';
import type Axis from '../coord/Axis';
import { AxisStatKey, requireAxisStatistics } from '../coord/axisStatistics';
import { EChartsExtensionInstallRegisters } from '../extension';
import { isNullableNumberFinite } from '../util/number';


export type BaseBarSeriesSubType = 'bar' | 'pictorialBar';

export const BAR_SERIES_TYPE = 'bar';

export function registerAxisStatisticsForBaseBar(
    registers: EChartsExtensionInstallRegisters,
    axisStatKey: AxisStatKey,
    seriesType: BaseBarSeriesSubType,
    coordSysType: 'cartesian2d' | 'polar'
) {
    requireAxisStatistics(
        registers,
        axisStatKey,
        {
            collectAxisSeries(ecModel, saveAxisSeries) {
                // NOTICE: The order of series matters - must be respected to the declaration on ec option,
                // because for historical reason, in `barGrid.ts`, the last series holds the effective ec option.
                // (See `calcBarWidthAndOffset` in `barGrid.ts`).
                ecModel.eachSeriesByType(seriesType, function (seriesModel) {
                    const coordSys = seriesModel.coordinateSystem;
                    if (coordSys && coordSys.type === coordSysType) {
                        saveAxisSeries(seriesModel.getBaseAxis(), seriesModel);
                    }
                });
            },
            getMetrics: getMetricsMinGapOnNonCategoryAxis,
        }
    );
}

// See cases in `test/bar-start.html` and `#7412`, `#8747`.
export function getStartValue(baseAxis: Axis): number {
    let startValue = baseAxis.scale.rawExtentInfo.makeOthers().startValue;
    if (!isNullableNumberFinite(startValue)) {
        startValue = 0;
    }
    return startValue;
}

