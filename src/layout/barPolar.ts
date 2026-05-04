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

import {mathAbs, mathMax, mathMin, mathPI, parsePercent} from '../util/number';
import {isDimensionStacked} from '../data/helper/dataStackHelper';
import type BarSeriesModel from '../chart/bar/BarSeries';
import type Polar from '../coord/polar/Polar';
import AngleAxis from '../coord/polar/AngleAxis';
import RadiusAxis from '../coord/polar/RadiusAxis';
import GlobalModel from '../model/Global';
import { Dictionary } from '../util/types';
import { calcBandWidth } from '../coord/axisBand';
import { createBandWidthBasedAxisContainShapeHandler, makeAxisStatKey2 } from '../chart/helper/axisSnippets';
import { createSimpleOverallStageHandler, makeCallOnlyOnce } from '../util/model';
import { EChartsExtensionInstallRegisters } from '../extension';
import { registerAxisContainShapeHandler } from '../coord/scaleRawExtentInfo';
import { getStartValue, requireAxisStatisticsForBaseBar, SERIES_TYPE_BAR } from './barCommon';
import { eachAxisOnKey, eachSeriesOnAxisOnKey } from '../coord/axisStatistics';
import { COORD_SYS_TYPE_POLAR } from '../coord/polar/PolarModel';
import type Axis from '../coord/Axis';
import { assert, each } from 'zrender/src/core/util';


const callOnlyOnce = makeCallOnlyOnce();

type PolarAxis = AngleAxis | RadiusAxis;

interface StackInfo {
    width: number
    maxWidth: number
}

interface BarWidthAndOffset {
    width: number
    offset: number
}

type StackId = string;

type BarWidthAndOffsetOnAxis = Record<StackId, BarWidthAndOffset>;

type LastStackCoords = Record<StackId, {p: number, n: number}[]>;

function getSeriesStackId(seriesModel: BarSeriesModel) {
    return seriesModel.get('stack')
        || '__ec_stack_' + seriesModel.seriesIndex;
}

export const barLayoutPolarStageHandler = createSimpleOverallStageHandler(SERIES_TYPE_BAR, barLayoutPolar);

function barLayoutPolar(ecModel: GlobalModel) {
    const axisStatKey = makeAxisStatKey2(SERIES_TYPE_BAR, COORD_SYS_TYPE_POLAR);

    eachAxisOnKey(ecModel, axisStatKey, function (axis: PolarAxis) {
        if (__DEV__) {
            assert((axis instanceof AngleAxis) || axis instanceof RadiusAxis);
        }

        const barWidthAndOffset = calcRadialBar(axis, SERIES_TYPE_BAR);

        const lastStackCoords: LastStackCoords = {};
        eachSeriesOnAxisOnKey(axis, axisStatKey, function (seriesModel: BarSeriesModel) {
            layoutPerAxisPerSeries(axis, seriesModel, barWidthAndOffset, lastStackCoords);
        });
    });
}

function layoutPerAxisPerSeries(
    baseAxis: PolarAxis,
    seriesModel: BarSeriesModel,
    barWidthAndOffset: BarWidthAndOffsetOnAxis,
    lastStackCoords: LastStackCoords
) {
    const data = seriesModel.getData();
    const stackId = getSeriesStackId(seriesModel);
    const columnLayoutInfo = barWidthAndOffset[stackId];
    const columnOffset = columnLayoutInfo.offset;
    const columnWidth = columnLayoutInfo.width;
    const polar = seriesModel.coordinateSystem as Polar;
    if (__DEV__) {
        assert(polar.type === COORD_SYS_TYPE_POLAR);
    }
    const valueAxis = polar.getOtherAxis(baseAxis);

    const cx = polar.cx;
    const cy = polar.cy;

    const barMinHeight = seriesModel.get('barMinHeight') || 0;
    const barMinAngle = seriesModel.get('barMinAngle') || 0;

    lastStackCoords[stackId] = lastStackCoords[stackId] || [];

    const valueDim = data.mapDimension(valueAxis.dim);
    const baseDim = data.mapDimension(baseAxis.dim);
    const stacked = isDimensionStacked(data, valueDim /* , baseDim */);
    const clampLayout = baseAxis.dim !== 'radius'
        || !seriesModel.get('roundCap', true);

    const valueAxisStart = valueAxis.dataToCoord(getStartValue(valueAxis));

    for (let idx = 0, len = data.count(); idx < len; idx++) {
        const value = data.get(valueDim, idx) as number;
        const baseValue = data.get(baseDim, idx) as number;

        const sign = value >= 0 ? 'p' : 'n' as 'p' | 'n';
        let baseCoord = valueAxisStart;

        // Because of the barMinHeight, we can not use the value in
        // stackResultDimension directly.
        if (stacked) {
            // FIXME: follow the same logic in `barGrid.ts`:
            //  Use stackResultDimension, and lastStackCoords is not needed.
            if (!lastStackCoords[stackId][baseValue]) {
                lastStackCoords[stackId][baseValue] = {
                    p: valueAxisStart, // Positive stack
                    n: valueAxisStart  // Negative stack
                };
            }
            // Should also consider #4243
            baseCoord = lastStackCoords[stackId][baseValue][sign];
        }

        let r0;
        let r;
        let startAngle;
        let endAngle;

        // radial sector
        if (valueAxis.dim === 'radius') {
            let radiusSpan = valueAxis.dataToCoord(value) - valueAxisStart;
            const angle = baseAxis.dataToCoord(baseValue);

            if (mathAbs(radiusSpan) < barMinHeight) {
                radiusSpan = (radiusSpan < 0 ? -1 : 1) * barMinHeight;
            }

            r0 = baseCoord;
            r = baseCoord + radiusSpan;
            startAngle = angle - columnOffset;
            endAngle = startAngle - columnWidth;

            stacked && (lastStackCoords[stackId][baseValue][sign] = r);
        }
        // tangential sector
        else {
            let angleSpan = valueAxis.dataToCoord(value, clampLayout) - valueAxisStart;
            const radius = baseAxis.dataToCoord(baseValue);

            if (mathAbs(angleSpan) < barMinAngle) {
                angleSpan = (angleSpan < 0 ? -1 : 1) * barMinAngle;
            }

            r0 = radius + columnOffset;
            r = r0 + columnWidth;
            startAngle = baseCoord;
            endAngle = baseCoord + angleSpan;

            // if the previous stack is at the end of the ring,
            // add a round to differentiate it from origin
            // let extent = angleAxis.getExtent();
            // let stackCoord = angle;
            // if (stackCoord === extent[0] && value > 0) {
            //     stackCoord = extent[1];
            // }
            // else if (stackCoord === extent[1] && value < 0) {
            //     stackCoord = extent[0];
            // }
            stacked && (lastStackCoords[stackId][baseValue][sign] = endAngle);
        }

        data.setItemLayout(idx, {
            cx: cx,
            cy: cy,
            r0: r0,
            r: r,
            // Consider that positive angle is anti-clockwise,
            // while positive radian of sector is clockwise
            startAngle: -startAngle * mathPI / 180,
            endAngle: -endAngle * mathPI / 180,

            /**
             * Keep the same logic with bar in catesion: use end value to
             * control direction. Notice that if clockwise is true (by
             * default), the sector will always draw clockwisely, no matter
             * whether endAngle is greater or less than startAngle.
             */
            clockwise: startAngle >= endAngle
        });

    }
}

/**
 * Calculate bar width and offset for radial bar charts
 */
function calcRadialBar(axis: Axis, seriesType: 'bar'): BarWidthAndOffsetOnAxis {
    const axisStatKey = makeAxisStatKey2(seriesType, COORD_SYS_TYPE_POLAR);

    const bandWidth = calcBandWidth(
        axis,
        {fromStat: {key: axisStatKey}, min: 1}
    ).w;

    let remainedWidth: number = bandWidth;
    let autoWidthCount: number = 0;
    let categoryGapOption: string | number = '20%';
    let gapOption: string | number = '30%';
    const stacks: Dictionary<StackInfo> = {};

    eachSeriesOnAxisOnKey(axis, axisStatKey, function (seriesModel: BarSeriesModel) {
        const stackId = getSeriesStackId(seriesModel);

        if (!stacks[stackId]) {
            autoWidthCount++;
        }
        stacks[stackId] = stacks[stackId] || {
            width: 0,
            maxWidth: 0
        };

        let barWidth = parsePercent(
            seriesModel.get('barWidth'),
            bandWidth
        );
        const barMaxWidth = parsePercent(
            seriesModel.get('barMaxWidth'),
            bandWidth
        );
        const barGapOption = seriesModel.get('barGap');
        const barCategoryGapOption = seriesModel.get('barCategoryGap');

        if (barWidth && !stacks[stackId].width) {
            barWidth = mathMin(remainedWidth, barWidth);
            stacks[stackId].width = barWidth;
            remainedWidth -= barWidth;
        }

        barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
        // For historical design, use the last series declared that.
        (barGapOption != null) && (gapOption = barGapOption);
        (barCategoryGapOption != null) && (categoryGapOption = barCategoryGapOption);
    });

    const result: BarWidthAndOffsetOnAxis = {};

    const categoryGap = parsePercent(categoryGapOption, bandWidth);
    const barGapPercent = parsePercent(gapOption, 1);

    let autoWidth = (remainedWidth - categoryGap)
        / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
    autoWidth = mathMax(autoWidth, 0);

    // Find if any auto calculated bar exceeded maxBarWidth
    each(stacks, function (column, stack) {
        let maxWidth = column.maxWidth;
        if (maxWidth && maxWidth < autoWidth) {
            maxWidth = mathMin(maxWidth, remainedWidth);
            if (column.width) {
                maxWidth = mathMin(maxWidth, column.width);
            }
            remainedWidth -= maxWidth;
            column.width = maxWidth;
            autoWidthCount--;
        }
    });

    // Recalculate width again
    autoWidth = (remainedWidth - categoryGap)
        / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
    autoWidth = mathMax(autoWidth, 0);

    let widthSum = 0;
    let lastColumn: StackInfo;
    each(stacks, function (column, idx) {
        if (!column.width) {
            column.width = autoWidth;
        }
        lastColumn = column;
        widthSum += column.width * (1 + barGapPercent);
    });
    if (lastColumn) {
        widthSum -= lastColumn.width * barGapPercent;
    }

    let offset = -widthSum / 2;
    each(stacks, function (column, stackId) {
        result[stackId] = result[stackId] || {
            offset: offset,
            width: column.width
        };

        offset += column.width * (1 + barGapPercent);
    });

    return result;
}

export function registerBarPolarAxisHandlers(
    registers: EChartsExtensionInstallRegisters,
    seriesType: 'bar' // Currently only 'bar' is supported.
): void {
    callOnlyOnce(registers, function () {
        const axisStatKey = makeAxisStatKey2(seriesType, COORD_SYS_TYPE_POLAR);
        requireAxisStatisticsForBaseBar(
            registers,
            axisStatKey,
            seriesType,
            COORD_SYS_TYPE_POLAR
        );
        registerAxisContainShapeHandler(
            axisStatKey,
            createBandWidthBasedAxisContainShapeHandler(axisStatKey)
        );
    });
}
