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

import { each, defaults, hasOwn } from 'zrender/src/core/util';
import { isNullableNumberFinite, mathAbs, mathMax, mathMin, parsePercent } from '../util/number';
import { isDimensionStacked } from '../data/helper/dataStackHelper';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import Axis2D from '../coord/cartesian/Axis2D';
import GlobalModel from '../model/Global';
import type Cartesian2D from '../coord/cartesian/Cartesian2D';
import { StageHandler, NullUndefined } from '../util/types';
import { createFloat32Array } from '../util/vendor';
import {
    extentHasValue,
    initExtentForUnion,
    makeCallOnlyOnce,
    unionExtentFromNumber,
} from '../util/model';
import { isOrdinalScale } from '../scale/helper';
import {
    isCartesian2DInjectedAsDataCoordSys
} from '../coord/cartesian/cartesianAxisHelper';
import type BaseBarSeriesModel from '../chart/bar/BaseBarSeries';
import type BarSeriesModel from '../chart/bar/BarSeries';
import {
    AxisContainShapeHandler, registerAxisContainShapeHandler,
} from '../coord/scaleRawExtentInfo';
import { EChartsExtensionInstallRegisters } from '../extension';
import {
    AxisStatisticsClient, AxisStatisticsKey, eachCollectedAxis,
    eachCollectedSeries, getCollectedSeriesLength, requireAxisStatistics
} from '../coord/axisStatistics';
import {
    AXIS_BAND_WIDTH_KIND_NORMAL, AxisBandWidthResult, calcBandWidth
} from '../coord/axisBand';


const callOnlyOnce = makeCallOnlyOnce();

const STACK_PREFIX = '__ec_stack_';

function getSeriesStackId(seriesModel: BaseBarSeriesModel): string {
    return (seriesModel as BarSeriesModel).get('stack') || STACK_PREFIX + seriesModel.seriesIndex;
}

interface BarGridLayoutAxisInfo {
    seriesInfo: BarGridLayoutAxisSeriesInfo[];
    // Calculated layout width for a single bars group.
    bandWidthResult: AxisBandWidthResult;
}

interface BarGridLayoutAxisSeriesInfo {
    barWidth: number
    barMaxWidth: number
    barMinWidth: number
    barGap: number | string
    defaultBarGap?: number | string
    barCategoryGap: number | string
    stackId: string
}

type StackId = string;

export type BaseBarSeriesSubType = 'bar' | 'pictorialBar';

export interface BarGridLayoutOptionForCustomSeries {
    count: number

    barWidth?: number | string
    barMaxWidth?: number | string
    barMinWidth?: number | string
    barGap?: number | string
    barCategoryGap?: number | string
}
interface BarGridLayoutOption extends BarGridLayoutOptionForCustomSeries {
    axis: Axis2D
}

// The layout of a bar group (may come from different series but on the same value on the base axis).
// The bars with the same `StackId` are stacked; otherwise they are placed side by side, following
// series declaration order.
type BarWidthAndOffsetOnAxis = Record<StackId, BarGridLayoutResultItemInternal>;
export type BarGridColumnLayoutOnAxis = BarGridLayoutAxisInfo & {
    columnMap: BarWidthAndOffsetOnAxis;
};

type BarGridLayoutResultItemInternal = {
    bandWidth: BarGridLayoutAxisInfo['bandWidthResult']['bandWidth']
    offset: number // An offset with respect to `dataToPoint`
    width: number
};
type BarGridLayoutResultItem = BarGridLayoutResultItemInternal & {
    offsetCenter: number
};
export type BarGridLayoutResultForCustomSeries = BarGridLayoutResultItem[] | NullUndefined;

/**
 * Return null/undefined if not 'category' axis.
 *
 * PENDING: The layout on non-'category' axis relies on `bandWidth`, which is calculated
 * based on the `linearPositiveMinGap` of series data. This strategy is somewhat heuristic
 * and will not be public to custom series until required in future. Additionally, more ec
 * options may be introduced for that, because it requires `requireAxisStatistics` to be
 * called on custom series that requires this feature.
 */
export function computeBarLayoutForCustomSeries(opt: BarGridLayoutOption): BarGridLayoutResultForCustomSeries {
    if (!isOrdinalScale(opt.axis.scale)) {
        return;
    }

    const params: BarGridLayoutAxisSeriesInfo[] = [];
    const bandWidthResult: AxisBandWidthResult = {};
    calcBandWidth(bandWidthResult, opt.axis, false);

    for (let i = 0; i < opt.count || 0; i++) {
        params.push(defaults({
            stackId: STACK_PREFIX + i
        }, opt) as BarGridLayoutAxisSeriesInfo);
    }
    const widthAndOffsets = calcBarWidthAndOffset({
        bandWidthResult,
        seriesInfo: params,
    });

    const result: BarGridLayoutResultItem[] = [];
    for (let i = 0; i < opt.count; i++) {
        const item = widthAndOffsets[STACK_PREFIX + i] as BarGridLayoutResultItem;
        item.offsetCenter = item.offset + item.width / 2;
        result.push(item);
    }

    return result;
}

/**
 * NOTICE: This layout is based on axis pixel extent and scale extent.
 *  It may be used on estimation, where axis pixel extent and scale extent
 *  are approximately set. But the result should not be cached since the
 *  axis pixel extent and scale extent may be changed finally.
 */
function makeColumnLayoutOnAxisReal(
    baseAxis: Axis2D,
    seriesType: BaseBarSeriesSubType
): BarGridColumnLayoutOnAxis {
    const seriesInfoListOnAxis = createLayoutInfoListOnAxis(
        baseAxis, seriesType
    ) as BarGridColumnLayoutOnAxis;
    seriesInfoListOnAxis.columnMap = calcBarWidthAndOffset(seriesInfoListOnAxis);
    return seriesInfoListOnAxis;
}

function createLayoutInfoListOnAxis(
    baseAxis: Axis2D,
    seriesType: BaseBarSeriesSubType
): BarGridLayoutAxisInfo {

    const seriesInfoOnAxis: BarGridLayoutAxisSeriesInfo[] = [];
    const bandWidthResult: AxisBandWidthResult = {};
    calcBandWidth(bandWidthResult, baseAxis, false);
    const bandWidth = bandWidthResult.bandWidth;

    eachCollectedSeries(baseAxis, axisStatKey(seriesType), function (seriesModel: BaseBarSeriesModel) {
        seriesInfoOnAxis.push({
            barWidth: parsePercent(seriesModel.get('barWidth'), bandWidth),
            barMaxWidth: parsePercent(seriesModel.get('barMaxWidth'), bandWidth),
            barMinWidth: parsePercent(
                // barMinWidth by default is 0.5 / 1 in cartesian. Because in value axis,
                // the auto-calculated bar width might be less than 0.5 / 1.
                seriesModel.get('barMinWidth') || (isInLargeMode(seriesModel) ? 0.5 : 1), bandWidth
            ),
            barGap: seriesModel.get('barGap'),
            barCategoryGap: seriesModel.get('barCategoryGap'),
            defaultBarGap: seriesModel.get('defaultBarGap'),
            stackId: getSeriesStackId(seriesModel)
        });
    });

    return {
        bandWidthResult,
        seriesInfo: seriesInfoOnAxis,
    };
}

/**
 * CAUTION: When multiple series are laid out on one axis, relevant ec options effect all series.
 * But for historical reason, these options are configured on each series option, which may
 * introduce confliction. The legacy implementation uses some options (e.g., `defaultBarGap`)
 * from the first declared series, and other options (e.g., `barGap`, `barCategoryGap`) from the last declared
 * series. Nevertheless, We remain this design to avoid breaking change.
 */
function calcBarWidthAndOffset(
    seriesInfoOnAxis: BarGridLayoutAxisInfo
): BarWidthAndOffsetOnAxis {
    interface StackInfo {
        width: number
        maxWidth: number
        minWidth?: number
    }

    const bandWidth = seriesInfoOnAxis.bandWidthResult.bandWidth;
    let remainedWidth = bandWidth;
    let autoWidthCount: number = 0;
    let barCategoryGapOption: number | string;
    let barGapOption: number | string;
    const stackIdList: StackId[] = [];
    const stackMap: Record<StackId, StackInfo> = {};

    each(seriesInfoOnAxis.seriesInfo, function (seriesInfo, idx) {
        if (!idx) {
            barGapOption = seriesInfo.defaultBarGap || 0;
        }
        const stackId = seriesInfo.stackId;

        if (!hasOwn(stackMap, stackId)) {
            autoWidthCount++;
        }
        let stackItem = stackMap[stackId];
        if (!stackItem) {
            stackItem = stackMap[stackId] = {
                width: 0,
                maxWidth: 0
            };
            stackIdList.push(stackId);
        }

        let barWidth = seriesInfo.barWidth;
        if (barWidth && !stackItem.width) {
            // See #6312, do not restrict width.
            stackItem.width = barWidth;
            barWidth = mathMin(remainedWidth, barWidth);
            remainedWidth -= barWidth;
        }

        const barMaxWidth = seriesInfo.barMaxWidth;
        barMaxWidth && (stackItem.maxWidth = barMaxWidth);
        const barMinWidth = seriesInfo.barMinWidth;
        barMinWidth && (stackItem.minWidth = barMinWidth);
        const barGap = seriesInfo.barGap;
        (barGap != null) && (barGapOption = barGap);
        const barCategoryGap = seriesInfo.barCategoryGap;
        (barCategoryGap != null) && (barCategoryGapOption = barCategoryGap);
    });

    if (barCategoryGapOption == null) {
        // More columns in one group
        // the spaces between group is smaller. Or the column will be too thin.
        barCategoryGapOption = mathMax((35 - stackIdList.length * 4), 15) + '%';
    }

    const barCategoryGapNum = parsePercent(barCategoryGapOption, bandWidth);
    const barGapPercent = parsePercent(barGapOption, 1);

    let autoWidth = (remainedWidth - barCategoryGapNum)
        / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
    autoWidth = mathMax(autoWidth, 0);

    // Find if any auto calculated bar exceeded maxBarWidth
    each(stackIdList, function (stackId) {
        const column = stackMap[stackId];
        const maxWidth = column.maxWidth;
        const minWidth = column.minWidth;

        if (!column.width) {
            let finalWidth = autoWidth;
            if (maxWidth && maxWidth < finalWidth) {
                finalWidth = mathMin(maxWidth, remainedWidth);
            }
            // `minWidth` has higher priority. `minWidth` decide that whether the
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
            // CSS does. Because barWidth can be a percent value, where
            // `barMaxWidth` can be used to restrict the final width.
            let finalWidth = column.width;
            if (maxWidth) {
                finalWidth = mathMin(finalWidth, maxWidth);
            }
            // `minWidth` has higher priority, as described above
            if (minWidth) {
                finalWidth = mathMax(finalWidth, minWidth);
            }
            column.width = finalWidth;
            remainedWidth -= finalWidth + barGapPercent * finalWidth;
            autoWidthCount--;
        }
    });

    // Recalculate width again
    autoWidth = (remainedWidth - barCategoryGapNum)
        / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);

    autoWidth = mathMax(autoWidth, 0);

    let widthSum = 0;
    let lastColumn: StackInfo;
    each(stackIdList, function (stackId) {
        const column = stackMap[stackId];
        if (!column.width) {
            column.width = autoWidth;
        }
        lastColumn = column;
        widthSum += column.width * (1 + barGapPercent);
    });
    if (lastColumn) {
        widthSum -= lastColumn.width * barGapPercent;
    }

    const result: BarWidthAndOffsetOnAxis = {};

    let offset = -widthSum / 2;
    each(stackIdList, function (stackId) {
        const column = stackMap[stackId];
        result[stackId] = result[stackId] || {
            bandWidth: bandWidth,
            offset: offset,
            width: column.width
        };
        offset += column.width * (1 + barGapPercent);
    });

    return result;
}


export function layout(seriesType: BaseBarSeriesSubType, ecModel: GlobalModel): void {
    eachCollectedAxis(ecModel, function (axis) {
        const columnLayout = makeColumnLayoutOnAxisReal(axis as Axis2D, seriesType);
        eachCollectedSeries(axis, axisStatKey(seriesType), function (seriesModel) {
            const columnLayoutInfo = columnLayout.columnMap[getSeriesStackId(seriesModel)];
            seriesModel.getData().setLayout({
                bandWidth: columnLayoutInfo.bandWidth,
                offset: columnLayoutInfo.offset,
                size: columnLayoutInfo.width
            });
        });
    });
}

// TODO: Do not support stack in large mode yet.
export function createProgressiveLayout(seriesType: string): StageHandler {
    return {
        seriesType,

        plan: createRenderPlanner(),

        reset: function (seriesModel: BaseBarSeriesModel) {
            if (!isCartesian2DInjectedAsDataCoordSys(seriesModel)) {
                return;
            }

            const data = seriesModel.getData();

            const cartesian = seriesModel.coordinateSystem as Cartesian2D;
            const baseAxis = cartesian.getBaseAxis();
            const valueAxis = cartesian.getOtherAxis(baseAxis);
            const valueDimIdx = data.getDimensionIndex(data.mapDimension(valueAxis.dim));
            const baseDimIdx = data.getDimensionIndex(data.mapDimension(baseAxis.dim));
            const drawBackground = (seriesModel as BarSeriesModel).get('showBackground', true);
            const valueDim = data.mapDimension(valueAxis.dim);
            const stackResultDim = data.getCalculationInfo('stackResultDimension');
            const stacked = isDimensionStacked(data, valueDim) && !!data.getCalculationInfo('stackedOnSeries');
            const isValueAxisH = valueAxis.isHorizontal();
            const valueAxisStart = getValueAxisStart(baseAxis, valueAxis);
            const isLarge = isInLargeMode(seriesModel);
            const barMinHeight = seriesModel.get('barMinHeight') || 0;

            const stackedDimIdx = stackResultDim && data.getDimensionIndex(stackResultDim);

            // Layout info.
            const columnWidth = data.getLayout('size');
            const columnOffset = data.getLayout('offset');

            return {
                progress: function (params, data) {
                    const count = params.count;
                    const largePoints = isLarge && createFloat32Array(count * 3);
                    const largeBackgroundPoints = isLarge && drawBackground && createFloat32Array(count * 3);
                    const largeDataIndices = isLarge && createFloat32Array(count);
                    const coordLayout = cartesian.master.getRect();
                    const bgSize = isValueAxisH ? coordLayout.width : coordLayout.height;

                    let dataIndex;
                    const store = data.getStore();

                    let idxOffset = 0;

                    while ((dataIndex = params.next()) != null) {
                        const value = store.get(stacked ? stackedDimIdx : valueDimIdx, dataIndex);
                        const baseValue = store.get(baseDimIdx, dataIndex) as number;
                        let baseCoord = valueAxisStart;
                        let stackStartValue;

                        // Because of the barMinHeight, we can not use the value in
                        // stackResultDimension directly.
                        if (stacked) {
                            stackStartValue = +value - (store.get(valueDimIdx, dataIndex) as number);
                        }

                        let x;
                        let y;
                        let width;
                        let height;

                        if (isValueAxisH) {
                            const coord = cartesian.dataToPoint([value, baseValue]);
                            if (stacked) {
                                const startCoord = cartesian.dataToPoint([stackStartValue, baseValue]);
                                baseCoord = startCoord[0];
                            }
                            x = baseCoord;
                            y = coord[1] + columnOffset;
                            width = coord[0] - baseCoord;
                            height = columnWidth;

                            if (mathAbs(width) < barMinHeight) {
                                width = (width < 0 ? -1 : 1) * barMinHeight;
                            }
                        }
                        else {
                            const coord = cartesian.dataToPoint([baseValue, value]);
                            if (stacked) {
                                const startCoord = cartesian.dataToPoint([baseValue, stackStartValue]);
                                baseCoord = startCoord[1];
                            }
                            x = coord[0] + columnOffset;
                            y = baseCoord;
                            width = columnWidth;
                            height = coord[1] - baseCoord;

                            if (mathAbs(height) < barMinHeight) {
                                // Include zero to has a positive bar
                                height = (height <= 0 ? -1 : 1) * barMinHeight;
                            }
                        }

                        if (!isLarge) {
                            data.setItemLayout(dataIndex, { x, y, width, height });
                        }
                        else {
                            largePoints[idxOffset] = x;
                            largePoints[idxOffset + 1] = y;
                            largePoints[idxOffset + 2] = isValueAxisH ? width : height;

                            if (largeBackgroundPoints) {
                                largeBackgroundPoints[idxOffset] = isValueAxisH ? coordLayout.x : x;
                                largeBackgroundPoints[idxOffset + 1] = isValueAxisH ? y : coordLayout.y;
                                largeBackgroundPoints[idxOffset + 2] = bgSize;
                            }

                            largeDataIndices[dataIndex] = dataIndex;
                        }

                        idxOffset += 3;
                    }

                    if (isLarge) {
                        data.setLayout({
                            largePoints,
                            largeDataIndices,
                            largeBackgroundPoints,
                            valueAxisHorizontal: isValueAxisH
                        });
                    }
                }
            };
        }
    };
}

function isInLargeMode(seriesModel: BaseBarSeriesModel) {
    return seriesModel.pipelineContext && seriesModel.pipelineContext.large;
}

// See cases in `test/bar-start.html` and `#7412`, `#8747`.
function getValueAxisStart(baseAxis: Axis2D, valueAxis: Axis2D) {
    let startValue = valueAxis.model.get('startValue');
    if (!startValue) {
        startValue = 0;
    }
    return valueAxis.toGlobalCoord(
        valueAxis.dataToCoord(
            valueAxis.type === 'log'
            ? (startValue > 0 ? startValue : 1)
            : startValue));
}


/**
 * NOTICE:
 *  - Must NOT be called before series-filter due to the series cache in `layoutPre`.
 *  - It relies on `axis.getExtent` and `scale.getExtent` to calculate `bandWidth`
 *    for non-'category' axes. Assume `scale.setExtent` has been prepared.
 *    See the summary of the process of extent determination in the comment of `scaleMapper.setExtent`.
 */
function barGridCreateAxisContainShapeHandler(seriesType: BaseBarSeriesSubType): AxisContainShapeHandler {
    return function (
        axis, scale, ecModel
    ) {
        // If bars are placed on 'time', 'value', 'log' axis, handle bars overflow here.
        // See #6728, #4862, `test/bar-overflow-time-plot.html`
        if (axis && axis instanceof Axis2D && !isOrdinalScale(scale)) {
            if (!getCollectedSeriesLength(axis, axisStatKey(seriesType))) {
                return; // Quick path - in most cases there is no bar on non-ordinal axis.
            }
            const columnLayout = makeColumnLayoutOnAxisReal(axis, seriesType);
            return calcShapeOverflowSupplement(columnLayout);
        }
    };
}

function calcShapeOverflowSupplement(
    columnLayout: BarGridColumnLayoutOnAxis | NullUndefined
): number[] | NullUndefined {
    if (columnLayout == null) {
        return;
    }
    const bandWidthResult = columnLayout.bandWidthResult;
    const bandWidthResultKind = bandWidthResult.kind;
    if (bandWidthResultKind == null) {
        return; // No series data.
    }

    // The calculation below is based on a proportion mapping from
    // `[barsBoundVal[0], barsBoundVal[1]]` to `[minValNew, maxValNew]`:
    //                 |------|------------------------------|---|
    //    barsBoundVal[0]   minValOld                 maxValOld barsBoundVal[1]
    //                        |----|----------------------|--|
    //                 minValNew    minValOld     maxValOld maxValNew
    //    (Note: `|---|` above represents "pixels" rather than "data".)

    const barsBoundPx = initExtentForUnion();
    const bandWidth = bandWidthResult.bandWidth;
    // Union `-bandWidth / 2` and `bandWidth / 2` to provide extra space for visually preferred,
    // Otherwise the bars on the edges may overlap with axis line.
    // And it also includes `0`, which ensures `barsBoundPx[0] <= 0 <= barsBoundPx[1]`.
    unionExtentFromNumber(barsBoundPx, -bandWidth / 2);
    unionExtentFromNumber(barsBoundPx, bandWidth / 2);
    // Shapes may overflow the `bandWidth`. For example, that might happen in `pictorialBar`.
    // Therefore, we also involve shape size (mapped to data scale) in this expansion calculation.
    each(columnLayout.columnMap, function (item) {
        unionExtentFromNumber(barsBoundPx, item.offset);
        unionExtentFromNumber(barsBoundPx, item.offset + item.width);
    });

    const ratio = bandWidthResult.ratio;
    if (extentHasValue(barsBoundPx) && isNullableNumberFinite(ratio)
        && bandWidthResultKind === AXIS_BAND_WIDTH_KIND_NORMAL
    ) {
        // Convert from pixel domain to data domain, since the `barsBoundPx` is calculated based on
        // `minGap` and extent on data domain.
        return [barsBoundPx[0] * ratio, barsBoundPx[1] * ratio];
        // If AXIS_BAND_WIDTH_KIND_SINGULAR, extent expansion is not needed.
    }
}

function createAxisStatisticsClient(seriesType: BaseBarSeriesSubType): AxisStatisticsClient {
    return {
        /**
         * NOTICE:
         *  The order of series matters - must be respected to the declaration on ec option,
         *  because for historical reason, the last series holds the effective ec option.
         *  See `calcBarWidthAndOffset`.
         */
        collectAxisSeries(ecModel, saveAxisSeries) {
            ecModel.eachSeriesByType(seriesType, function (seriesModel: BaseBarSeriesModel) {
                if (isCartesian2DInjectedAsDataCoordSys(seriesModel)) {
                    saveAxisSeries(
                        (seriesModel.coordinateSystem as Cartesian2D).getBaseAxis(),
                        seriesModel
                    );
                }
            });
        },

        getMetrics(axis) {
            return {
                minGap: !isOrdinalScale(axis.scale)
            };
        }

    };
}

function axisStatKey(seriesType: BaseBarSeriesSubType): AxisStatisticsKey {
    return `barGrid-${seriesType}` as AxisStatisticsKey;
}

export function registerBarGridAxisHandlers(registers: EChartsExtensionInstallRegisters) {
    callOnlyOnce(registers, function () {

        function register(seriesType: BaseBarSeriesSubType): void {
            requireAxisStatistics(axisStatKey(seriesType), createAxisStatisticsClient(seriesType));
            registerAxisContainShapeHandler(seriesType, barGridCreateAxisContainShapeHandler(seriesType));
        }

        register('bar');
        register('pictorialBar');
    });
}
