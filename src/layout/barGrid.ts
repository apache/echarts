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

import { each, defaults, hasOwn, assert } from 'zrender/src/core/util';
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
    getCachePerECFullUpdate, GlobalModelCachePerECFullUpdate, initExtentForUnion,
    isValidNumberForExtent, makeCallOnlyOnce, makeInner,
    unionExtentFromNumber,
} from '../util/model';
import { isOrdinalScale } from '../scale/helper';
import {
    CartesianAxisHashKey, getCartesianAxisHashKey, isCartesian2DInjectedAsDataCoordSys
} from '../coord/cartesian/cartesianAxisHelper';
import type BaseBarSeriesModel from '../chart/bar/BaseBarSeries';
import type BarSeriesModel from '../chart/bar/BarSeries';
import {
    AxisContainShapeHandler, registerAxisContainShapeHandler,
} from '../coord/scaleRawExtentInfo';
import { EChartsExtensionInstallRegisters } from '../extension';
import { getScaleLinearSpanForMapping } from '../scale/scaleMapper';
import type Scale from '../scale/Scale';


const ecModelCacheInner = makeInner<{
    layoutPre: BarGridLayoutPre;
}, GlobalModelCachePerECFullUpdate>();

// Record of layout preparation by series sub type.
type BarGridLayoutPre = Partial<Record<BaseBarSeriesSubType, BarGridLayoutPreOnSeriesType>>;

type BarGridLayoutPreOnSeriesType = {
    seriesReady: boolean;
    // NOTICE: `axes` and `axisMap` do not necessarily contain all Cartesian axes - a record
    //  is created iff `ensureLayoutAxisPre` is called.
    axes: CartesianAxisHashKey[];
    axisMap: Record<CartesianAxisHashKey, BarGridLayoutAxisPre>;
};

// Record of layout preparation by series sub type by axis.
type BarGridLayoutAxisPre = {
    axis: Axis2D;
    // This is series use this axis as base axis and need to be laid out.
    seriesList: BaseBarSeriesModel[];
    // Statistics on values for `minGap` and `linearValueExtent` has been ready.
    valStatReady?: boolean;
    linearMinGap?: number | NullUndefined;
    // min/max of values of all bar series (per `BaseBarSeriesSubType`) on this axis,
    // but other series types are not included.
    // Only available for non-'category' axis.
    // If no valid data, remains `undefined`.
    linearValueExtent?: number[] | NullUndefined;
};

const STACK_PREFIX = '__ec_stack_';

// Arbitrary, leave some space to avoid overflowing when dataZoom moving.
const SINGULAR_BAND_WIDTH_RATIO = 0.8;
// Corresponding to `SINGULAR_BAND_WIDTH_RATIO`, but they are not necessarily equal on other value choices.
const SINGULAR_SUPPLEMENT_RATIO = 0.8;

function getSeriesStackId(seriesModel: BaseBarSeriesModel): string {
    return (seriesModel as BarSeriesModel).get('stack') || STACK_PREFIX + seriesModel.seriesIndex;
}

interface BarGridLayoutAxisInfo {
    seriesInfo: BarGridLayoutAxisSeriesInfo[];
    // Calculated layout width for a single bars group.
    bandWidth: number;
    singular?: boolean;
    linearValueExtent?: BarGridLayoutAxisPre['linearValueExtent'];
    pxToDataRatio?: number | NullUndefined;
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
    bandWidth: BarGridLayoutAxisInfo['bandWidth']
    offset: number // An offset with respect to `dataToPoint`
    width: number
};
type BarGridLayoutResultItem = BarGridLayoutResultItemInternal & {
    offsetCenter: number
};
export type BarGridLayoutResultForCustomSeries = BarGridLayoutResultItem[] | NullUndefined;

/**
 * @return If axis.type is not 'category', return undefined.
 */
export function getLayoutOnAxis(opt: BarGridLayoutOption): BarGridLayoutResultForCustomSeries {
    const params: BarGridLayoutAxisSeriesInfo[] = [];
    const baseAxis = opt.axis;

    if (baseAxis.type !== 'category') {
        return;
    }
    const bandWidth = baseAxis.getBandWidth();

    for (let i = 0; i < opt.count || 0; i++) {
        params.push(defaults({
            stackId: STACK_PREFIX + i
        }, opt) as BarGridLayoutAxisSeriesInfo);
    }
    const widthAndOffsets = calcBarWidthAndOffset({
        bandWidth,
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

function ensureLayoutPre(
    ecModel: GlobalModel, seriesType: BaseBarSeriesSubType
): BarGridLayoutPreOnSeriesType {
    const ecCache = ecModelCacheInner(getCachePerECFullUpdate(ecModel));
    const layoutPre = ecCache.layoutPre || (ecCache.layoutPre = {});
    return layoutPre[seriesType] || (layoutPre[seriesType] = {
        axes: [], axisMap: {}, seriesReady: false
    });
}

function ensureLayoutAxisPre(
    layoutPre: BarGridLayoutPreOnSeriesType, axis: Axis2D
): BarGridLayoutAxisPre {
    const axisKey = getCartesianAxisHashKey(axis);
    const axisMap = layoutPre.axisMap || (layoutPre.axisMap = {});
    let axisPre = axisMap[axisKey];
    if (!axisPre) {
        layoutPre.axes.push(axisKey);
        axisPre = axisMap[axisKey] = {
            axis,
            seriesList: [],
        };
    }
    return axisPre;
}

function eachAxisPre(
    layoutPre: BarGridLayoutPreOnSeriesType, cb: (axisPre: BarGridLayoutAxisPre) => void
): void {
    each(layoutPre.axes, function (axisKey) {
        cb(layoutPre.axisMap[axisKey]);
    });
}

/**
 * NOTICE:
 *  - Ensure the idempotent on this function - it may be called multiple times in a run
 *    of ec workflow.
 *  - Not a pure function - `seriesListByType` will be cached on base axis instance
 *    to avoid duplicated travel of series for each axis.
 *  - The order of series matters - must be respected to the declaration on ec option,
 *    because for historical reason, the last series holds the effective ec option.
 *    See `calcBarWidthAndOffset`.
 */
function ensureBarGridSeriesList(
    ecModel: GlobalModel, seriesType: BaseBarSeriesSubType
): BarGridLayoutPreOnSeriesType {
    const layoutPre = ensureLayoutPre(ecModel, seriesType);
    if (layoutPre.seriesReady) {
        return layoutPre;
    }
    ecModel.eachSeriesByType(seriesType, function (seriesModel: BaseBarSeriesModel) {
        if (isCartesian2DInjectedAsDataCoordSys(seriesModel)) {
            const baseAxis = (seriesModel.coordinateSystem as Cartesian2D).getBaseAxis();
            ensureLayoutAxisPre(layoutPre, baseAxis).seriesList.push(seriesModel);
        }
    });
    layoutPre.seriesReady = true;
    return layoutPre;
}

/**
 * CAVEAT: Time-consuming due to the travel and sort of series data.
 *
 * Map from (baseAxis.dim + '_' + baseAxis.index) to min gap of two adjacent
 * values.
 * This works for time axes, value axes, and log axes.
 * For a single time axis, return value is in the form like
 * {'x_0': [1000000]}.
 * The value of 1000000 is in milliseconds.
 */
function ensureValuesStatisticsOnAxis(
    axis: Axis2D, layoutPre: BarGridLayoutPreOnSeriesType
): BarGridLayoutAxisPre {
    if (__DEV__) {
        assert(!isOrdinalScale(axis.scale));
    }

    const axisPre = ensureLayoutAxisPre(layoutPre, axis);
    // `minGap` is cached for performance, otherwise data will be traveled more than once
    // in each run of ec workflow. The first creation is during coord sys update stage to
    // expand the scale extent of the base axis to avoid edge bars overflowing the axis.
    // And then in render stage.
    if (axisPre.valStatReady) {
        return axisPre;
    }

    const scale = axis.scale;
    const values: number[] = [];
    const linearValueExtent = initExtentForUnion();
    each(axisPre.seriesList, function (seriesModel) {
        const data = seriesModel.getData();
        const dimIdx = data.getDimensionIndex(data.mapDimension(axis.dim));
        const store = data.getStore();
        for (let i = 0, cnt = store.count(); i < cnt; ++i) {
            const val = scale.transformIn(store.get(dimIdx, i) as number, null);
            if (isValidNumberForExtent(val)) { // This also filters out `log(non-positive)` for LogScale.
                values.push(val);
                unionExtentFromNumber(linearValueExtent, val);
            }
        }
    });

    // Sort axis values into ascending order to calculate gaps
    values.sort(function (a, b) {
        return a - b;
    });
    let min = null;
    for (let j = 1; j < values.length; ++j) {
        const delta = values[j] - values[j - 1];
        if (delta > 0) {
            // Ignore 0 delta because they are of the same axis value
            min = min === null ? delta : mathMin(min, delta);
        }
    }
    axisPre.linearMinGap = min; // Set to null if only have one data
    if (extentHasValue(linearValueExtent)) {
        axisPre.linearValueExtent = linearValueExtent; // Remain `undefined` if no valid data
    }
    axisPre.valStatReady = true;

    return axisPre;
}

/**
 * NOTICE: This layout is based on axis pixel extent and scale extent.
 *  It may be used on estimation, where axis pixel extent and scale extent
 *  are approximately set. But the result should not be cached since the
 *  axis pixel extent and scale extent may be changed finally.
 */
function makeColumnLayoutOnAxisReal(
    layoutPre: BarGridLayoutPreOnSeriesType,
    baseAxis: Axis2D,
): BarGridColumnLayoutOnAxis {
    const axisPre = ensureLayoutAxisPre(layoutPre, baseAxis);
    const seriesInfoListOnAxis = createLayoutInfoListOnAxis(
        axisPre.axis, layoutPre, axisPre
    ) as BarGridColumnLayoutOnAxis;
    seriesInfoListOnAxis.columnMap = calcBarWidthAndOffset(seriesInfoListOnAxis);
    return seriesInfoListOnAxis;
}

function createLayoutInfoListOnAxis(
    baseAxis: Axis2D,
    layoutPre: BarGridLayoutPreOnSeriesType,
    axisPre: BarGridLayoutAxisPre
): BarGridLayoutAxisInfo {

    const seriesInfoOnAxis: BarGridLayoutAxisSeriesInfo[] = [];
    const axisScale = baseAxis.scale;
    let linearValueExtent: BarGridLayoutAxisInfo['linearValueExtent'];
    let pxToDataRatio: BarGridLayoutAxisInfo['pxToDataRatio'];
    let singular: BarGridLayoutAxisInfo['singular'];

    let bandWidth: number;
    if (isOrdinalScale(axisScale)) {
        bandWidth = baseAxis.getBandWidth();
    }
    else {
        const axisPre = ensureValuesStatisticsOnAxis(baseAxis, layoutPre);
        linearValueExtent = axisPre.linearValueExtent;
        const axisExtent = baseAxis.getExtent();
        // Always use a new pxSpan because it may be changed in `grid` contain label calculation.
        const pxSpan = mathAbs(axisExtent[1] - axisExtent[0]);
        const linearScaleSpan = getScaleLinearSpanForMapping(axisScale);
        // `linearScaleSpan` may be `0` or `Infinity` or `NaN`, since normalizers like
        // `intervalScaleEnsureValidExtent` may not have been called yet.
        if (axisPre.linearMinGap && linearScaleSpan && isNullableNumberFinite(linearScaleSpan)) {
            singular = false;
            bandWidth = pxSpan / linearScaleSpan * axisPre.linearMinGap;
            pxToDataRatio = linearScaleSpan / pxSpan;
        }
        else {
            singular = true;
            bandWidth = pxSpan * SINGULAR_BAND_WIDTH_RATIO;
        }
    }

    each(axisPre.seriesList, function (seriesModel) {
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
        bandWidth: bandWidth,
        linearValueExtent: linearValueExtent,
        seriesInfo: seriesInfoOnAxis,
        singular: singular,
        pxToDataRatio: pxToDataRatio,
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

    const bandWidth = seriesInfoOnAxis.bandWidth;
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
    const layoutPre = ensureBarGridSeriesList(ecModel, seriesType);
    eachAxisPre(layoutPre, function (axisPre) {
        const columnLayout = makeColumnLayoutOnAxisReal(layoutPre, axisPre.axis);
        each(axisPre.seriesList, function (seriesModel) {
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
            const layoutPre = ensureBarGridSeriesList(ecModel, seriesType);
            const axisPre = ensureLayoutAxisPre(layoutPre, axis);
            if (!axisPre.seriesList.length) {
                return; // Quick return for robustness - in most cases there is no bar series based on this axis.
            }
            const columnLayout = makeColumnLayoutOnAxisReal(layoutPre, axis);
            return calcShapeOverflowSupplement(scale, columnLayout);
        }
    };
}

function calcShapeOverflowSupplement(
    scale: Scale,
    columnLayout: BarGridColumnLayoutOnAxis | NullUndefined
): number[] | NullUndefined {
    const linearValueExtent = columnLayout && columnLayout.linearValueExtent;

    if (columnLayout == null || !linearValueExtent) {
        return;
    }

    // The calculation below is based on a proportion mapping from
    // `[barsBoundVal[0], barsBoundVal[1]]` to `[minValNew, maxValNew]`:
    //                 |------|------------------------------|---|
    //    barsBoundVal[0]   minValOld                 maxValOld barsBoundVal[1]
    //                        |----|----------------------|--|
    //                 minValNew    minValOld     maxValOld maxValNew
    //    (Note: `|---|` above represents "pixels" rather than "data".)

    const barsBoundPx = initExtentForUnion();
    const bandWidth = columnLayout.bandWidth;
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

    const pxToDataRatio = columnLayout.pxToDataRatio;

    if (extentHasValue(barsBoundPx)) {
        let linearSupplement: number[];

        if (columnLayout.singular) {
            const linearSpan = getScaleLinearSpanForMapping(scale);
            linearSupplement = [-linearSpan * SINGULAR_SUPPLEMENT_RATIO, linearSpan * SINGULAR_SUPPLEMENT_RATIO];
        }
        else if (isNullableNumberFinite(pxToDataRatio)) {
            // Convert from pixel domain to data domain, since the `barsBoundPx` is calculated based on
            // `minGap` and extent on data domain.
            linearSupplement = [barsBoundPx[0] * pxToDataRatio, barsBoundPx[1] * pxToDataRatio];
        }

        return linearSupplement;
    }
}

const callOnlyOnce = makeCallOnlyOnce();

export function registerBarGridAxisContainShapeHandler(registers: EChartsExtensionInstallRegisters) {
    callOnlyOnce(registers, function () {
        registerAxisContainShapeHandler('bar', barGridCreateAxisContainShapeHandler('bar'));
        registerAxisContainShapeHandler('pictorialBar', barGridCreateAxisContainShapeHandler('pictorialBar'));
    });
}
