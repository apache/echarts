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

/* global Float32Array */

import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../util/number';
import {isDimensionStacked} from '../data/helper/dataStackHelper';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import BarSeriesModel from '../chart/bar/BarSeries';
import Axis2D from '../coord/cartesian/Axis2D';
import GlobalModel from '../model/Global';
import type Cartesian2D from '../coord/cartesian/Cartesian2D';
import { StageHandler, Dictionary } from '../util/types';

const STACK_PREFIX = '__ec_stack_';
const LARGE_BAR_MIN_WIDTH = 0.5;

const LargeArr = typeof Float32Array !== 'undefined' ? Float32Array : Array;


function getSeriesStackId(seriesModel: BarSeriesModel): string {
    return seriesModel.get('stack') || STACK_PREFIX + seriesModel.seriesIndex;
}

function getAxisKey(axis: Axis2D): string {
    return axis.dim + axis.index;
}

interface LayoutSeriesInfo {
    bandWidth: number
    barWidth: number
    barMaxWidth: number
    barMinWidth: number
    barGap: number | string
    barCategoryGap: number | string
    axisKey: string
    stackId: string
}

interface StackInfo {
    width: number
    maxWidth: number
    minWidth?: number
}

/**
 * {
 *  [coordSysId]: {
 *      [stackId]: {bandWidth, offset, width}
 *  }
 * }
 */
type BarWidthAndOffset = Dictionary<Dictionary<{
    bandWidth: number
    offset: number
    offsetCenter: number
    width: number
}>>;

interface LayoutOption {
    axis: Axis2D
    count: number

    barWidth?: number
    barMaxWidth?: number
    barMinWidth?: number
    barGap?: number
    barCategoryGap?: number
}
/**
 * @return {Object} {width, offset, offsetCenter} If axis.type is not 'category', return undefined.
 */
export function getLayoutOnAxis(opt: LayoutOption) {
    let params: LayoutSeriesInfo[] = [];
    let baseAxis = opt.axis;
    let axisKey = 'axis0';

    if (baseAxis.type !== 'category') {
        return;
    }
    let bandWidth = baseAxis.getBandWidth();

    for (let i = 0; i < opt.count || 0; i++) {
        params.push(zrUtil.defaults({
            bandWidth: bandWidth,
            axisKey: axisKey,
            stackId: STACK_PREFIX + i
        }, opt) as LayoutSeriesInfo);
    }
    let widthAndOffsets = doCalBarWidthAndOffset(params);

    let result = [];
    for (let i = 0; i < opt.count; i++) {
        let item = widthAndOffsets[axisKey][STACK_PREFIX + i];
        item.offsetCenter = item.offset + item.width / 2;
        result.push(item);
    }

    return result;
}

export function prepareLayoutBarSeries(seriesType: string, ecModel: GlobalModel): BarSeriesModel[] {
    let seriesModels: BarSeriesModel[] = [];
    ecModel.eachSeriesByType(seriesType, function (seriesModel: BarSeriesModel) {
        // Check series coordinate, do layout for cartesian2d only
        if (isOnCartesian(seriesModel) && !isInLargeMode(seriesModel)) {
            seriesModels.push(seriesModel);
        }
    });
    return seriesModels;
}


/**
 * Map from (baseAxis.dim + '_' + baseAxis.index) to min gap of two adjacent
 * values.
 * This works for time axes, value axes, and log axes.
 * For a single time axis, return value is in the form like
 * {'x_0': [1000000]}.
 * The value of 1000000 is in milliseconds.
 */
function getValueAxesMinGaps(barSeries: BarSeriesModel[]) {
    /**
     * Map from axis.index to values.
     * For a single time axis, axisValues is in the form like
     * {'x_0': [1495555200000, 1495641600000, 1495728000000]}.
     * Items in axisValues[x], e.g. 1495555200000, are time values of all
     * series.
     */
    let axisValues: Dictionary<number[]> = {};
    zrUtil.each(barSeries, function (seriesModel) {
        let cartesian = seriesModel.coordinateSystem as Cartesian2D;
        let baseAxis = cartesian.getBaseAxis();
        if (baseAxis.type !== 'time' && baseAxis.type !== 'value') {
            return;
        }

        let data = seriesModel.getData();
        let key = baseAxis.dim + '_' + baseAxis.index;
        let dim = data.mapDimension(baseAxis.dim);
        for (let i = 0, cnt = data.count(); i < cnt; ++i) {
            let value = data.get(dim, i) as number;
            if (!axisValues[key]) {
                // No previous data for the axis
                axisValues[key] = [value];
            }
            else {
                // No value in previous series
                axisValues[key].push(value);
            }
            // Ignore duplicated time values in the same axis
        }
    });

    let axisMinGaps: Dictionary<number> = {};
    for (let key in axisValues) {
        if (axisValues.hasOwnProperty(key)) {
            let valuesInAxis = axisValues[key];
            if (valuesInAxis) {
                // Sort axis values into ascending order to calculate gaps
                valuesInAxis.sort(function (a, b) {
                    return a - b;
                });

                let min = null;
                for (let j = 1; j < valuesInAxis.length; ++j) {
                    let delta = valuesInAxis[j] - valuesInAxis[j - 1];
                    if (delta > 0) {
                        // Ignore 0 delta because they are of the same axis value
                        min = min === null ? delta : Math.min(min, delta);
                    }
                }
                // Set to null if only have one data
                axisMinGaps[key] = min;
            }
        }
    }
    return axisMinGaps;
}

export function makeColumnLayout(barSeries: BarSeriesModel[]) {
    let axisMinGaps = getValueAxesMinGaps(barSeries);

    let seriesInfoList: LayoutSeriesInfo[] = [];
    zrUtil.each(barSeries, function (seriesModel) {
        let cartesian = seriesModel.coordinateSystem as Cartesian2D;
        let baseAxis = cartesian.getBaseAxis();
        let axisExtent = baseAxis.getExtent();

        let bandWidth;
        if (baseAxis.type === 'category') {
            bandWidth = baseAxis.getBandWidth();
        }
        else if (baseAxis.type === 'value' || baseAxis.type === 'time') {
            let key = baseAxis.dim + '_' + baseAxis.index;
            let minGap = axisMinGaps[key];
            let extentSpan = Math.abs(axisExtent[1] - axisExtent[0]);
            let scale = baseAxis.scale.getExtent();
            let scaleSpan = Math.abs(scale[1] - scale[0]);
            bandWidth = minGap
                ? extentSpan / scaleSpan * minGap
                : extentSpan; // When there is only one data value
        }
        else {
            let data = seriesModel.getData();
            bandWidth = Math.abs(axisExtent[1] - axisExtent[0]) / data.count();
        }

        let barWidth = parsePercent(
            seriesModel.get('barWidth'), bandWidth
        );
        let barMaxWidth = parsePercent(
            seriesModel.get('barMaxWidth'), bandWidth
        );
        let barMinWidth = parsePercent(
            // barMinWidth by default is 1 in cartesian. Because in value axis,
            // the auto-calculated bar width might be less than 1.
            seriesModel.get('barMinWidth') || 1, bandWidth
        );
        let barGap = seriesModel.get('barGap');
        let barCategoryGap = seriesModel.get('barCategoryGap');

        seriesInfoList.push({
            bandWidth: bandWidth,
            barWidth: barWidth,
            barMaxWidth: barMaxWidth,
            barMinWidth: barMinWidth,
            barGap: barGap,
            barCategoryGap: barCategoryGap,
            axisKey: getAxisKey(baseAxis),
            stackId: getSeriesStackId(seriesModel)
        });
    });

    return doCalBarWidthAndOffset(seriesInfoList);
}

function doCalBarWidthAndOffset(seriesInfoList: LayoutSeriesInfo[]) {
    interface ColumnOnAxisInfo {
        bandWidth: number
        remainedWidth: number
        autoWidthCount: number
        categoryGap: number | string
        gap: number | string
        stacks: Dictionary<StackInfo>
    }

    // Columns info on each category axis. Key is cartesian name
    let columnsMap: Dictionary<ColumnOnAxisInfo> = {};

    zrUtil.each(seriesInfoList, function (seriesInfo, idx) {
        let axisKey = seriesInfo.axisKey;
        let bandWidth = seriesInfo.bandWidth;
        let columnsOnAxis: ColumnOnAxisInfo = columnsMap[axisKey] || {
            bandWidth: bandWidth,
            remainedWidth: bandWidth,
            autoWidthCount: 0,
            categoryGap: '20%',
            gap: '30%',
            stacks: {}
        };
        let stacks = columnsOnAxis.stacks;
        columnsMap[axisKey] = columnsOnAxis;

        let stackId = seriesInfo.stackId;

        if (!stacks[stackId]) {
            columnsOnAxis.autoWidthCount++;
        }
        stacks[stackId] = stacks[stackId] || {
            width: 0,
            maxWidth: 0
        };

        // Caution: In a single coordinate system, these barGrid attributes
        // will be shared by series. Consider that they have default values,
        // only the attributes set on the last series will work.
        // Do not change this fact unless there will be a break change.

        let barWidth = seriesInfo.barWidth;
        if (barWidth && !stacks[stackId].width) {
            // See #6312, do not restrict width.
            stacks[stackId].width = barWidth;
            barWidth = Math.min(columnsOnAxis.remainedWidth, barWidth);
            columnsOnAxis.remainedWidth -= barWidth;
        }

        let barMaxWidth = seriesInfo.barMaxWidth;
        barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
        let barMinWidth = seriesInfo.barMinWidth;
        barMinWidth && (stacks[stackId].minWidth = barMinWidth);
        let barGap = seriesInfo.barGap;
        (barGap != null) && (columnsOnAxis.gap = barGap);
        let barCategoryGap = seriesInfo.barCategoryGap;
        (barCategoryGap != null) && (columnsOnAxis.categoryGap = barCategoryGap);
    });

    let result: BarWidthAndOffset = {};

    zrUtil.each(columnsMap, function (columnsOnAxis, coordSysName) {

        result[coordSysName] = {};

        let stacks = columnsOnAxis.stacks;
        let bandWidth = columnsOnAxis.bandWidth;
        let categoryGap = parsePercent(columnsOnAxis.categoryGap, bandWidth);
        let barGapPercent = parsePercent(columnsOnAxis.gap, 1);

        let remainedWidth = columnsOnAxis.remainedWidth;
        let autoWidthCount = columnsOnAxis.autoWidthCount;
        let autoWidth = (remainedWidth - categoryGap)
            / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
        autoWidth = Math.max(autoWidth, 0);

        // Find if any auto calculated bar exceeded maxBarWidth
        zrUtil.each(stacks, function (column) {
            let maxWidth = column.maxWidth;
            let minWidth = column.minWidth;

            if (!column.width) {
                let finalWidth = autoWidth;
                if (maxWidth && maxWidth < finalWidth) {
                    finalWidth = Math.min(maxWidth, remainedWidth);
                }
                // `minWidth` has higher priority. `minWidth` decide that wheter the
                // bar is able to be visible. So `minWidth` should not be restricted
                // by `maxWidth` or `remainedWidth` (which is from `bandWidth`). In
                // the extreme cases for `value` axis, bars are allowed to overlap
                // with each other if `minWidth` specified.
                if (minWidth && minWidth > finalWidth) {
                    finalWidth = minWidth;
                }
                if (finalWidth !== autoWidth) {
                    column.width = finalWidth;
                    remainedWidth -= finalWidth + barGapPercent * finalWidth;
                    autoWidthCount--;
                }
            }
            else {
                // `barMinWidth/barMaxWidth` has higher priority than `barWidth`, as
                // CSS does. Becuase barWidth can be a percent value, where
                // `barMaxWidth` can be used to restrict the final width.
                let finalWidth = column.width;
                if (maxWidth) {
                    finalWidth = Math.min(finalWidth, maxWidth);
                }
                // `minWidth` has higher priority, as described above
                if (minWidth) {
                    finalWidth = Math.max(finalWidth, minWidth);
                }
                column.width = finalWidth;
                remainedWidth -= finalWidth + barGapPercent * finalWidth;
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
                bandWidth: bandWidth,
                offset: offset,
                width: column.width
            } as BarWidthAndOffset[string][string];

            offset += column.width * (1 + barGapPercent);
        });
    });

    return result;
}

/**
 * @param barWidthAndOffset The result of makeColumnLayout
 * @param seriesModel If not provided, return all.
 * @return {stackId: {offset, width}} or {offset, width} if seriesModel provided.
 */
function retrieveColumnLayout(barWidthAndOffset: BarWidthAndOffset, axis: Axis2D): typeof barWidthAndOffset[string];
// eslint-disable-next-line max-len
function retrieveColumnLayout(barWidthAndOffset: BarWidthAndOffset, axis: Axis2D, seriesModel: BarSeriesModel): typeof barWidthAndOffset[string][string];
function retrieveColumnLayout(
    barWidthAndOffset: BarWidthAndOffset,
    axis: Axis2D,
    seriesModel?: BarSeriesModel
) {
    if (barWidthAndOffset && axis) {
        let result = barWidthAndOffset[getAxisKey(axis)];
        if (result != null && seriesModel != null) {
            return result[getSeriesStackId(seriesModel)];
        }
        return result;
    }
}
export {retrieveColumnLayout};

export function layout(seriesType: string, ecModel: GlobalModel) {

    let seriesModels = prepareLayoutBarSeries(seriesType, ecModel);
    let barWidthAndOffset = makeColumnLayout(seriesModels);

    let lastStackCoords: Dictionary<{p: number, n: number}[]> = {};

    zrUtil.each(seriesModels, function (seriesModel) {

        let data = seriesModel.getData();
        let cartesian = seriesModel.coordinateSystem as Cartesian2D;
        let baseAxis = cartesian.getBaseAxis();

        let stackId = getSeriesStackId(seriesModel);
        let columnLayoutInfo = barWidthAndOffset[getAxisKey(baseAxis)][stackId];
        let columnOffset = columnLayoutInfo.offset;
        let columnWidth = columnLayoutInfo.width;
        let valueAxis = cartesian.getOtherAxis(baseAxis);

        let barMinHeight = seriesModel.get('barMinHeight') || 0;

        lastStackCoords[stackId] = lastStackCoords[stackId] || [];

        data.setLayout({
            bandWidth: columnLayoutInfo.bandWidth,
            offset: columnOffset,
            size: columnWidth
        });

        let valueDim = data.mapDimension(valueAxis.dim);
        let baseDim = data.mapDimension(baseAxis.dim);
        let stacked = isDimensionStacked(data, valueDim /*, baseDim*/);
        let isValueAxisH = valueAxis.isHorizontal();

        let valueAxisStart = getValueAxisStart(baseAxis, valueAxis, stacked);

        for (let idx = 0, len = data.count(); idx < len; idx++) {
            let value = data.get(valueDim, idx);
            let baseValue = data.get(baseDim, idx) as number;

            let sign = value >= 0 ? 'p' : 'n' as 'p' | 'n';
            let baseCoord = valueAxisStart;

            // Because of the barMinHeight, we can not use the value in
            // stackResultDimension directly.
            if (stacked) {
                // Only ordinal axis can be stacked.
                if (!lastStackCoords[stackId][baseValue]) {
                    lastStackCoords[stackId][baseValue] = {
                        p: valueAxisStart, // Positive stack
                        n: valueAxisStart  // Negative stack
                    };
                }
                // Should also consider #4243
                baseCoord = lastStackCoords[stackId][baseValue][sign];
            }

            let x;
            let y;
            let width;
            let height;

            if (isValueAxisH) {
                let coord = cartesian.dataToPoint([value, baseValue]);
                x = baseCoord;
                y = coord[1] + columnOffset;
                width = coord[0] - valueAxisStart;
                height = columnWidth;

                if (Math.abs(width) < barMinHeight) {
                    width = (width < 0 ? -1 : 1) * barMinHeight;
                }
                // Ignore stack from NaN value
                if (!isNaN(width)) {
                    stacked && (lastStackCoords[stackId][baseValue][sign] += width);
                }
            }
            else {
                let coord = cartesian.dataToPoint([baseValue, value]);
                x = coord[0] + columnOffset;
                y = baseCoord;
                width = columnWidth;
                height = coord[1] - valueAxisStart;

                if (Math.abs(height) < barMinHeight) {
                    // Include zero to has a positive bar
                    height = (height <= 0 ? -1 : 1) * barMinHeight;
                }
                // Ignore stack from NaN value
                if (!isNaN(height)) {
                    stacked && (lastStackCoords[stackId][baseValue][sign] += height);
                }
            }

            data.setItemLayout(idx, {
                x: x,
                y: y,
                width: width,
                height: height
            });
        }

    });
}

// TODO: Do not support stack in large mode yet.
export let largeLayout: StageHandler = {

    seriesType: 'bar',

    plan: createRenderPlanner(),

    reset: function (seriesModel: BarSeriesModel) {
        if (!isOnCartesian(seriesModel) || !isInLargeMode(seriesModel)) {
            return;
        }

        let data = seriesModel.getData();
        let cartesian = seriesModel.coordinateSystem as Cartesian2D;
        let coordLayout = cartesian.grid.getRect();
        let baseAxis = cartesian.getBaseAxis();
        let valueAxis = cartesian.getOtherAxis(baseAxis);
        let valueDim = data.mapDimension(valueAxis.dim);
        let baseDim = data.mapDimension(baseAxis.dim);
        let valueAxisHorizontal = valueAxis.isHorizontal();
        let valueDimIdx = valueAxisHorizontal ? 0 : 1;

        let barWidth = retrieveColumnLayout(
            makeColumnLayout([seriesModel]), baseAxis, seriesModel
        ).width;
        if (!(barWidth > LARGE_BAR_MIN_WIDTH)) { // jshint ignore:line
            barWidth = LARGE_BAR_MIN_WIDTH;
        }

        return {
            progress: function (params, data) {
                let count = params.count;
                let largePoints = new LargeArr(count * 2);
                let largeBackgroundPoints = new LargeArr(count * 2);
                let largeDataIndices = new LargeArr(count);
                let dataIndex;
                let coord: number[] = [];
                let valuePair = [];
                let pointsOffset = 0;
                let idxOffset = 0;

                while ((dataIndex = params.next()) != null) {
                    valuePair[valueDimIdx] = data.get(valueDim, dataIndex);
                    valuePair[1 - valueDimIdx] = data.get(baseDim, dataIndex);

                    coord = cartesian.dataToPoint(valuePair, null, coord);
                    // Data index might not be in order, depends on `progressiveChunkMode`.
                    largeBackgroundPoints[pointsOffset] =
                        valueAxisHorizontal ? coordLayout.x + coordLayout.width : coord[0];
                    largePoints[pointsOffset++] = coord[0];
                    largeBackgroundPoints[pointsOffset] =
                        valueAxisHorizontal ? coord[1] : coordLayout.y + coordLayout.height;
                    largePoints[pointsOffset++] = coord[1];
                    largeDataIndices[idxOffset++] = dataIndex;
                }

                data.setLayout({
                    largePoints: largePoints,
                    largeDataIndices: largeDataIndices,
                    largeBackgroundPoints: largeBackgroundPoints,
                    barWidth: barWidth,
                    valueAxisStart: getValueAxisStart(baseAxis, valueAxis, false),
                    backgroundStart: valueAxisHorizontal ? coordLayout.x : coordLayout.y,
                    valueAxisHorizontal: valueAxisHorizontal
                });
            }
        };
    }
};

function isOnCartesian(seriesModel: BarSeriesModel) {
    return seriesModel.coordinateSystem && seriesModel.coordinateSystem.type === 'cartesian2d';
}

function isInLargeMode(seriesModel: BarSeriesModel) {
    return seriesModel.pipelineContext && seriesModel.pipelineContext.large;
}

// See cases in `test/bar-start.html` and `#7412`, `#8747`.
function getValueAxisStart(baseAxis: Axis2D, valueAxis: Axis2D, stacked?: boolean) {
    return valueAxis.toGlobalCoord(valueAxis.dataToCoord(valueAxis.type === 'log' ? 1 : 0));
}
