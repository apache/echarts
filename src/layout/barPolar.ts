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
import {parsePercent} from '../util/number';
import {isDimensionStacked} from '../data/helper/dataStackHelper';
import type BarSeriesModel from '../chart/bar/BarSeries';
import type Polar from '../coord/polar/Polar';
import AngleAxis from '../coord/polar/AngleAxis';
import RadiusAxis from '../coord/polar/RadiusAxis';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../core/ExtensionAPI';
import { Dictionary } from '../util/types';

type PolarAxis = AngleAxis | RadiusAxis;

interface StackInfo {
    width: number
    maxWidth: number
}
interface LayoutColumnInfo {
    autoWidthCount: number
    bandWidth: number
    remainedWidth: number
    categoryGap: string | number
    gap: string | number
    stacks: Dictionary<StackInfo>
}

interface BarWidthAndOffset {
    width: number
    offset: number
}

function getSeriesStackId(seriesModel: BarSeriesModel) {
    return seriesModel.get('stack')
        || '__ec_stack_' + seriesModel.seriesIndex;
}

function getAxisKey(polar: Polar, axis: PolarAxis) {
    return axis.dim + polar.model.componentIndex;
}

function barLayoutPolar(seriesType: string, ecModel: GlobalModel, api: ExtensionAPI) {

    const lastStackCoords: Dictionary<{p: number, n: number}[]> = {};

    const barWidthAndOffset = calRadialBar(
        zrUtil.filter(
            ecModel.getSeriesByType(seriesType) as BarSeriesModel[],
            function (seriesModel) {
                return !ecModel.isSeriesFiltered(seriesModel)
                    && seriesModel.coordinateSystem
                    && seriesModel.coordinateSystem.type === 'polar';
            }
        )
    );

    ecModel.eachSeriesByType(seriesType, function (seriesModel: BarSeriesModel) {

        // Check series coordinate, do layout for polar only
        if (seriesModel.coordinateSystem.type !== 'polar') {
            return;
        }

        const data = seriesModel.getData();
        const polar = seriesModel.coordinateSystem as Polar;
        const baseAxis = polar.getBaseAxis();
        const axisKey = getAxisKey(polar, baseAxis);

        const stackId = getSeriesStackId(seriesModel);
        const columnLayoutInfo = barWidthAndOffset[axisKey][stackId];
        const columnOffset = columnLayoutInfo.offset;
        const columnWidth = columnLayoutInfo.width;
        const valueAxis = polar.getOtherAxis(baseAxis);

        const cx = seriesModel.coordinateSystem.cx;
        const cy = seriesModel.coordinateSystem.cy;

        const barMinHeight = seriesModel.get('barMinHeight') || 0;
        const barMinAngle = seriesModel.get('barMinAngle') || 0;

        lastStackCoords[stackId] = lastStackCoords[stackId] || [];

        const valueDim = data.mapDimension(valueAxis.dim);
        const baseDim = data.mapDimension(baseAxis.dim);
        const stacked = isDimensionStacked(data, valueDim /*, baseDim*/);
        const clampLayout = baseAxis.dim !== 'radius'
            || !seriesModel.get('roundCap', true);

        const valueAxisStart = valueAxis.dataToCoord(0);
        for (let idx = 0, len = data.count(); idx < len; idx++) {
            const value = data.get(valueDim, idx) as number;
            const baseValue = data.get(baseDim, idx) as number;

            const sign = value >= 0 ? 'p' : 'n' as 'p' | 'n';
            let baseCoord = valueAxisStart;

            // Because of the barMinHeight, we can not use the value in
            // stackResultDimension directly.
            // Only ordinal axis can be stacked.
            if (stacked) {

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

                if (Math.abs(radiusSpan) < barMinHeight) {
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

                if (Math.abs(angleSpan) < barMinAngle) {
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
                startAngle: -startAngle * Math.PI / 180,
                endAngle: -endAngle * Math.PI / 180
            });

        }

    });

}

/**
 * Calculate bar width and offset for radial bar charts
 */
function calRadialBar(barSeries: BarSeriesModel[]) {
    // Columns info on each category axis. Key is polar name
    const columnsMap: Dictionary<LayoutColumnInfo> = {};

    zrUtil.each(barSeries, function (seriesModel, idx) {
        const data = seriesModel.getData();
        const polar = seriesModel.coordinateSystem as Polar;

        const baseAxis = polar.getBaseAxis();
        const axisKey = getAxisKey(polar, baseAxis);

        const axisExtent = baseAxis.getExtent();
        const bandWidth = baseAxis.type === 'category'
            ? baseAxis.getBandWidth()
            : (Math.abs(axisExtent[1] - axisExtent[0]) / data.count());

        const columnsOnAxis = columnsMap[axisKey] || {
            bandWidth: bandWidth,
            remainedWidth: bandWidth,
            autoWidthCount: 0,
            categoryGap: '20%',
            gap: '30%',
            stacks: {}
        };
        const stacks = columnsOnAxis.stacks;
        columnsMap[axisKey] = columnsOnAxis;

        const stackId = getSeriesStackId(seriesModel);

        if (!stacks[stackId]) {
            columnsOnAxis.autoWidthCount++;
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
        const barGap = seriesModel.get('barGap');
        const barCategoryGap = seriesModel.get('barCategoryGap');

        if (barWidth && !stacks[stackId].width) {
            barWidth = Math.min(columnsOnAxis.remainedWidth, barWidth);
            stacks[stackId].width = barWidth;
            columnsOnAxis.remainedWidth -= barWidth;
        }

        barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
        (barGap != null) && (columnsOnAxis.gap = barGap);
        (barCategoryGap != null) && (columnsOnAxis.categoryGap = barCategoryGap);
    });


    const result: Dictionary<Dictionary<BarWidthAndOffset>> = {};

    zrUtil.each(columnsMap, function (columnsOnAxis, coordSysName) {

        result[coordSysName] = {};

        const stacks = columnsOnAxis.stacks;
        const bandWidth = columnsOnAxis.bandWidth;
        const categoryGap = parsePercent(columnsOnAxis.categoryGap, bandWidth);
        const barGapPercent = parsePercent(columnsOnAxis.gap, 1);

        let remainedWidth = columnsOnAxis.remainedWidth;
        let autoWidthCount = columnsOnAxis.autoWidthCount;
        let autoWidth = (remainedWidth - categoryGap)
            / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
        autoWidth = Math.max(autoWidth, 0);

        // Find if any auto calculated bar exceeded maxBarWidth
        zrUtil.each(stacks, function (column, stack) {
            let maxWidth = column.maxWidth;
            if (maxWidth && maxWidth < autoWidth) {
                maxWidth = Math.min(maxWidth, remainedWidth);
                if (column.width) {
                    maxWidth = Math.min(maxWidth, column.width);
                }
                remainedWidth -= maxWidth;
                column.width = maxWidth;
                autoWidthCount--;
            }
        });

        // Recalculate width again
        autoWidth = (remainedWidth - categoryGap)
            / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
        autoWidth = Math.max(autoWidth, 0);

        let widthSum = 0;
        let lastColumn: StackInfo;
        zrUtil.each(stacks, function (column, idx) {
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
        zrUtil.each(stacks, function (column, stackId) {
            result[coordSysName][stackId] = result[coordSysName][stackId] || {
                offset: offset,
                width: column.width
            } as BarWidthAndOffset;

            offset += column.width * (1 + barGapPercent);
        });
    });

    return result;
}

export default barLayoutPolar;