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
import * as textContain from 'zrender/src/contain/text';
import {makeInner} from '../util/model';
import {
    makeLabelFormatter,
    getOptionCategoryInterval,
    shouldShowAllLabels
} from './axisHelper';
import Axis from './Axis';
import Model from '../model/Model';
import { AxisBaseOption, CategoryAxisBaseOption } from './axisCommonTypes';
import OrdinalScale from '../scale/Ordinal';
import { AxisBaseModel } from './AxisBaseModel';
import type Axis2D from './cartesian/Axis2D';
import { NullUndefined, ScaleTick, VisualAxisBreak } from '../util/types';
import { ScaleGetTicksOpt } from '../scale/Scale';


type AxisLabelInfoDetermined = {
    formattedLabel: string,
    rawLabel: string,
    tickValue: number,
    time: ScaleTick['time'] | NullUndefined,
    break: VisualAxisBreak | NullUndefined,
};

type AxisCache<TKey, TVal> = {
    list: {key: TKey; value: TVal;}[]
};

type AxisCategoryTickLabelCacheKey<TTickLabel extends AxisInnerStoreCacheProp> =
    CategoryAxisBaseOption[TTickLabel]['interval'];

interface AxisCategoryLabelCreated {
    labels: AxisLabelInfoDetermined[]
    labelCategoryInterval: number
}
interface AxisCategoryTickCreated {
    ticks: number[]
    tickCategoryInterval?: number
}

type AxisModelInnerStore = {
    lastAutoInterval: number
    lastTickCount: number
    axisExtent0: number
    axisExtent1: number
};
const modelInner = makeInner<AxisModelInnerStore, AxisBaseModel>();

type AxisInnerStoreCacheProp = 'axisTick' | 'axisLabel';
type AxisInnerStore = {
    axisTick: AxisCache<AxisCategoryTickLabelCacheKey<'axisTick'>, AxisCategoryTickCreated>
    axisLabel: AxisCache<AxisCategoryTickLabelCacheKey<'axisLabel'>, AxisCategoryLabelCreated>
    autoInterval: number
};
const axisInner = makeInner<AxisInnerStore, Axis>();

export const AxisTickLabelComputingKind = {
    estimate: 1,
    determine: 2,
} as const;
export type AxisTickLabelComputingKind =
    (typeof AxisTickLabelComputingKind)[keyof typeof AxisTickLabelComputingKind];

export interface AxisLabelsComputingContext {
    // PENDING: ugly impl, refactor for better code structure?
    out: {
        // - If `noPxChangeTryDetermine` is not empty, it indicates that the result is not reusable
        //  when axis pixel extent or axis origin point changed.
        //  Generally the result is reusable if the result values are calculated with no dependency
        //  on pixel info, such as `axis.dataToCoord` or `axis.extent`.
        // - If ensuring no px changed, calling `noPxChangeTryDetermine` to attempt to convert the
        //  "estimate" result to "determine" result.
        //  If return any falsy, cannot make that conversion and need recompute.
        noPxChangeTryDetermine: (() => boolean)[]
    }
    // Must never be NullUndefined
    kind: AxisTickLabelComputingKind
}

export function createAxisLabelsComputingContext(kind: AxisTickLabelComputingKind): AxisLabelsComputingContext {
    return {
        out: {
            noPxChangeTryDetermine: []
        },
        kind,
    };
}


function tickValuesToNumbers(axis: Axis, values: (number | string | Date)[]) {
    const nums = zrUtil.map(values, val => axis.scale.parse(val));
    if (axis.type === 'time' && nums.length > 0) {
        // Time axis needs duplicate first/last tick (see TimeScale.getTicks())
        // The first and last tick/label don't get drawn
        nums.sort();
        nums.unshift(nums[0]);
        nums.push(nums[nums.length - 1]);
    }
    return nums;
}

export function createAxisLabels(axis: Axis, ctx: AxisLabelsComputingContext): {
    labels: AxisLabelInfoDetermined[]
} {
    const custom = axis.getLabelModel().get('customValues');
    if (custom) {
        const labelFormatter = makeLabelFormatter(axis);
        const extent = axis.scale.getExtent();
        const tickNumbers = tickValuesToNumbers(axis, custom);
        const ticks = zrUtil.filter(tickNumbers, val => val >= extent[0] && val <= extent[1]);
        return {
            labels: zrUtil.map(ticks, numval => {
                const tick = {value: numval};
                return {
                    formattedLabel: labelFormatter(tick),
                    rawLabel: axis.scale.getLabel(tick),
                    tickValue: numval,
                    time: undefined as ScaleTick['time'] | NullUndefined,
                    break: undefined as VisualAxisBreak | NullUndefined,
                };
            }),
        };
    }
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? makeCategoryLabels(axis, ctx)
        : makeRealNumberLabels(axis);
}

/**
 * @param tickModel For example, can be axisTick, splitLine, splitArea.
 */
export function createAxisTicks(
    axis: Axis,
    tickModel: AxisBaseModel,
    opt?: Pick<ScaleGetTicksOpt, 'breakTicks' | 'pruneByBreak'>
): {
    ticks: number[],
    tickCategoryInterval?: number
} {
    const custom = axis.getTickModel().get('customValues');
    if (custom) {
        const extent = axis.scale.getExtent();
        const tickNumbers = tickValuesToNumbers(axis, custom);
        return {
            ticks: zrUtil.filter(tickNumbers, val => val >= extent[0] && val <= extent[1])
        };
    }
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? makeCategoryTicks(axis, tickModel)
        : {ticks: zrUtil.map(axis.scale.getTicks(opt), tick => tick.value)};
}

function makeCategoryLabels(axis: Axis, ctx: AxisLabelsComputingContext): ReturnType<typeof createAxisLabels> {
    const labelModel = axis.getLabelModel();
    const result = makeCategoryLabelsActually(axis, labelModel, ctx);

    return (!labelModel.get('show') || axis.scale.isBlank())
        ? {labels: []}
        : result;
}

function makeCategoryLabelsActually(
    axis: Axis,
    labelModel: Model<AxisBaseOption['axisLabel']>,
    ctx: AxisLabelsComputingContext
): {
    labels: AxisLabelInfoDetermined[]
    labelCategoryInterval: number
} {
    const labelsCache = ensureCategoryLabelCache(axis);
    const optionLabelInterval = getOptionCategoryInterval(labelModel);
    const isEstimate = ctx.kind === AxisTickLabelComputingKind.estimate;

    // In AxisTickLabelComputingKind.estimate, the result likely varies during a single
    // pass of ec main process,due to the change of axisExtent, and will not be shared with
    // splitLine. Therefore no cache is used.
    if (!isEstimate) {
        // PENDING: check necessary?
        const result = axisCacheGet(labelsCache, optionLabelInterval);
        if (result) {
            return result;
        }
    }

    let labels;
    let numericLabelInterval;

    if (zrUtil.isFunction(optionLabelInterval)) {
        labels = makeLabelsByCustomizedCategoryInterval(axis, optionLabelInterval);
    }
    else {
        numericLabelInterval = optionLabelInterval === 'auto'
            ? makeAutoCategoryInterval(axis, ctx) : optionLabelInterval;
        labels = makeLabelsByNumericCategoryInterval(axis, numericLabelInterval);
    }

    const result = {labels, labelCategoryInterval: numericLabelInterval};
    if (!isEstimate) {
        axisCacheSet(labelsCache, optionLabelInterval, result);
    }
    else {
        ctx.out.noPxChangeTryDetermine.push(function () {
            axisCacheSet(labelsCache, optionLabelInterval, result);
            return true;
        });
    }
    return result;
}

function makeCategoryTicks(axis: Axis, tickModel: AxisBaseModel) {
    const ticksCache = ensureCategoryTickCache(axis);
    const optionTickInterval = getOptionCategoryInterval(tickModel);
    const result = axisCacheGet(ticksCache, optionTickInterval);

    if (result) {
        return result;
    }

    let ticks: number[];
    let tickCategoryInterval;

    // Optimize for the case that large category data and no label displayed,
    // we should not return all ticks.
    if (!tickModel.get('show') || axis.scale.isBlank()) {
        ticks = [];
    }

    if (zrUtil.isFunction(optionTickInterval)) {
        ticks = makeLabelsByCustomizedCategoryInterval(axis, optionTickInterval, true);
    }
    // Always use label interval by default despite label show. Consider this
    // scenario, Use multiple grid with the xAxis sync, and only one xAxis shows
    // labels. `splitLine` and `axisTick` should be consistent in this case.
    else if (optionTickInterval === 'auto') {
        const labelsResult = makeCategoryLabelsActually(
            axis, axis.getLabelModel(), createAxisLabelsComputingContext(AxisTickLabelComputingKind.determine)
        );
        tickCategoryInterval = labelsResult.labelCategoryInterval;
        ticks = zrUtil.map(labelsResult.labels, function (labelItem) {
            return labelItem.tickValue;
        });
    }
    else {
        tickCategoryInterval = optionTickInterval;
        ticks = makeLabelsByNumericCategoryInterval(axis, tickCategoryInterval, true);
    }

    // Cache to avoid calling interval function repeatedly.
    return axisCacheSet(ticksCache, optionTickInterval, {
        ticks: ticks, tickCategoryInterval: tickCategoryInterval
    });
}

function makeRealNumberLabels(axis: Axis): ReturnType<typeof createAxisLabels> {
    const ticks = axis.scale.getTicks();
    const labelFormatter = makeLabelFormatter(axis);
    return {
        labels: zrUtil.map(ticks, function (tick, idx) {
            return {
                formattedLabel: labelFormatter(tick, idx),
                rawLabel: axis.scale.getLabel(tick),
                tickValue: tick.value,
                time: tick.time,
                break: tick.break,
            };
        })
    };
}

// Large category data calculation is performance sensitive, and ticks and label probably will
// be fetched multiple times (e.g. shared by splitLine and axisTick). So we cache the result.
// axis is created each time during a ec process, so we do not need to clear cache.
const ensureCategoryTickCache = initAxisCacheMethod('axisTick');
const ensureCategoryLabelCache = initAxisCacheMethod('axisLabel');

/**
 * PENDING: refactor to JS Map? Because key can be a function or more complicated object, and
 * cache size always is small, and currently no JS Map object key polyfill, we use a simple
 * array cache instead of plain object hash.
 */
function initAxisCacheMethod<TCacheProp extends AxisInnerStoreCacheProp>(prop: TCacheProp) {
    return function ensureCache(axis: Axis): AxisInnerStore[TCacheProp] {
        return axisInner(axis)[prop] || (axisInner(axis)[prop] = {list: []});
    };
}

function axisCacheGet<TKey, TVal>(cache: AxisCache<TKey, TVal>, key: TKey): TVal | NullUndefined {
    for (let i = 0; i < cache.list.length; i++) {
        if (cache.list[i].key === key) {
            return cache.list[i].value;
        }
    }
}

function axisCacheSet<TKey, TVal>(cache: AxisCache<TKey, TVal>, key: TKey, value: TVal): TVal {
    cache.list.push({key: key, value: value});
    return value;
}

function makeAutoCategoryInterval(axis: Axis, ctx: AxisLabelsComputingContext): number {
    if (ctx.kind === AxisTickLabelComputingKind.estimate) {
        // Currently axisTick is not involved in estimate kind, and the result likely varies during a
        // single pass of ec main process, due to the change of axisExtent. Therefore no cache is used.
        const result = axis.calculateCategoryInterval(ctx);
        ctx.out.noPxChangeTryDetermine.push(function () {
            axisInner(axis).autoInterval = result;
            return true;
        });
        return result;
    }
    // Both tick and label uses this result, cacah it to avoid recompute.
    const result = axisInner(axis).autoInterval;
    return result != null
        ? result
        : (axisInner(axis).autoInterval = axis.calculateCategoryInterval(ctx));
}

/**
 * Calculate interval for category axis ticks and labels.
 * Use a stretegy to try to avoid overlapping.
 * To get precise result, at least one of `getRotate` and `isHorizontal`
 * should be implemented in axis.
 */
export function calculateCategoryInterval(axis: Axis, ctx: AxisLabelsComputingContext) {
    const kind = ctx.kind;

    const params = fetchAutoCategoryIntervalCalculationParams(axis);
    const labelFormatter = makeLabelFormatter(axis);
    const rotation = (params.axisRotate - params.labelRotate) / 180 * Math.PI;

    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    // Providing this method is for optimization:
    // avoid generating a long array by `getTicks`
    // in large category data case.
    const tickCount = ordinalScale.count();

    if (ordinalExtent[1] - ordinalExtent[0] < 1) {
        return 0;
    }

    let step = 1;
    // Simple optimization. Arbitrary value.
    const maxCount = 40;
    if (tickCount > maxCount) {
        step = Math.max(1, Math.floor(tickCount / maxCount));
    }
    let tickValue = ordinalExtent[0];
    const unitSpan = axis.dataToCoord(tickValue + 1) - axis.dataToCoord(tickValue);
    const unitW = Math.abs(unitSpan * Math.cos(rotation));
    const unitH = Math.abs(unitSpan * Math.sin(rotation));

    let maxW = 0;
    let maxH = 0;

    // Caution: Performance sensitive for large category data.
    // Consider dataZoom, we should make appropriate step to avoid O(n) loop.
    for (; tickValue <= ordinalExtent[1]; tickValue += step) {
        let width = 0;
        let height = 0;

        // Not precise, do not consider align and vertical align
        // and each distance from axis line yet.
        const rect = textContain.getBoundingRect(
            labelFormatter({ value: tickValue }), params.font, 'center', 'top'
        );
        // Magic number
        width = rect.width * 1.3;
        height = rect.height * 1.3;

        // Min size, void long loop.
        maxW = Math.max(maxW, width, 7);
        maxH = Math.max(maxH, height, 7);
    }

    let dw = maxW / unitW;
    let dh = maxH / unitH;
    // 0/0 is NaN, 1/0 is Infinity.
    isNaN(dw) && (dw = Infinity);
    isNaN(dh) && (dh = Infinity);
    const interval = Math.max(0, Math.floor(Math.min(dw, dh)));

    if (kind === AxisTickLabelComputingKind.estimate) {
        // In estimate kind, the inteval likely varies, thus do not erase the cache.
        ctx.out.noPxChangeTryDetermine.push(
            zrUtil.bind(calculateCategoryIntervalTryDetermine, null, axis, interval, tickCount)
        );
        return interval;
    }

    const lastInterval = calculateCategoryIntervalDealCache(axis, interval, tickCount);
    return lastInterval != null ? lastInterval : interval;
}

function calculateCategoryIntervalTryDetermine(
    axis: Axis, interval: number, tickCount: number
): boolean {
    return calculateCategoryIntervalDealCache(axis, interval, tickCount) == null;
}

// Return the lastInterval if need to use it, otherwise return NullUndefined and save cache.
function calculateCategoryIntervalDealCache(
    axis: Axis, interval: number, tickCount: number
): number | NullUndefined {
    const cache = modelInner(axis.model);
    const axisExtent = axis.getExtent();
    const lastAutoInterval = cache.lastAutoInterval;
    const lastTickCount = cache.lastTickCount;
    // Use cache to keep interval stable while moving zoom window,
    // otherwise the calculated interval might jitter when the zoom
    // window size is close to the interval-changing size.
    // For example, if all of the axis labels are `a, b, c, d, e, f, g`.
    // The jitter will cause that sometimes the displayed labels are
    // `a, d, g` (interval: 2) sometimes `a, c, e`(interval: 1).
    if (lastAutoInterval != null
        && lastTickCount != null
        && Math.abs(lastAutoInterval - interval) <= 1
        && Math.abs(lastTickCount - tickCount) <= 1
        // Always choose the bigger one, otherwise the critical
        // point is not the same when zooming in or zooming out.
        && lastAutoInterval > interval
        // If the axis change is caused by chart resize, the cache should not
        // be used. Otherwise some hidden labels might not be shown again.
        && cache.axisExtent0 === axisExtent[0]
        && cache.axisExtent1 === axisExtent[1]
    ) {
        return lastAutoInterval;
    }
    // Only update cache if cache not used, otherwise the
    // changing of interval is too insensitive.
    else {
        cache.lastTickCount = tickCount;
        cache.lastAutoInterval = interval;
        cache.axisExtent0 = axisExtent[0];
        cache.axisExtent1 = axisExtent[1];
    }
}

function fetchAutoCategoryIntervalCalculationParams(axis: Axis) {
    const labelModel = axis.getLabelModel();
    return {
        axisRotate: axis.getRotate
            ? axis.getRotate()
            : ((axis as Axis2D).isHorizontal && !(axis as Axis2D).isHorizontal())
            ? 90
            : 0,
        labelRotate: labelModel.get('rotate') || 0,
        font: labelModel.getFont()
    };
}

function makeLabelsByNumericCategoryInterval(
    axis: Axis, categoryInterval: number
): AxisLabelInfoDetermined[];
function makeLabelsByNumericCategoryInterval(
    axis: Axis, categoryInterval: number, onlyTick: false
): AxisLabelInfoDetermined[];
function makeLabelsByNumericCategoryInterval(
    axis: Axis, categoryInterval: number, onlyTick: true
): number[];
function makeLabelsByNumericCategoryInterval(
    axis: Axis, categoryInterval: number, onlyTick?: boolean
) {
    const labelFormatter = makeLabelFormatter(axis);
    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    const labelModel = axis.getLabelModel();
    const result: (AxisLabelInfoDetermined | number)[] = [];

    // TODO: axisType: ordinalTime, pick the tick from each month/day/year/...

    const step = Math.max((categoryInterval || 0) + 1, 1);
    let startTick = ordinalExtent[0];
    const tickCount = ordinalScale.count();

    // Calculate start tick based on zero if possible to keep label consistent
    // while zooming and moving while interval > 0. Otherwise the selection
    // of displayable ticks and symbols probably keep changing.
    // 3 is empirical value.
    if (startTick !== 0 && step > 1 && tickCount / step > 2) {
        startTick = Math.round(Math.ceil(startTick / step) * step);
    }

    // (1) Only add min max label here but leave overlap checking
    // to render stage, which also ensure the returned list
    // suitable for splitLine and splitArea rendering.
    // (2) Scales except category always contain min max label so
    // do not need to perform this process.
    const showAllLabel = shouldShowAllLabels(axis);
    const includeMinLabel = labelModel.get('showMinLabel') || showAllLabel;
    const includeMaxLabel = labelModel.get('showMaxLabel') || showAllLabel;

    if (includeMinLabel && startTick !== ordinalExtent[0]) {
        addItem(ordinalExtent[0]);
    }

    // Optimize: avoid generating large array by `ordinalScale.getTicks()`.
    let tickValue = startTick;
    for (; tickValue <= ordinalExtent[1]; tickValue += step) {
        addItem(tickValue);
    }

    if (includeMaxLabel && tickValue - step !== ordinalExtent[1]) {
        addItem(ordinalExtent[1]);
    }

    function addItem(tickValue: number) {
        const tickObj = { value: tickValue };
        result.push(onlyTick
            ? tickValue
            : {
                formattedLabel: labelFormatter(tickObj),
                rawLabel: ordinalScale.getLabel(tickObj),
                tickValue: tickValue,
                time: undefined,
                break: undefined,
            }
        );
    }

    return result;
}

type CategoryIntervalCb = (tickVal: number, rawLabel: string) => boolean;

// When interval is function, the result `false` means ignore the tick.
// It is time consuming for large category data.
function makeLabelsByCustomizedCategoryInterval(
    axis: Axis, categoryInterval: CategoryIntervalCb
): AxisLabelInfoDetermined[];
function makeLabelsByCustomizedCategoryInterval(
    axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick: false
): AxisLabelInfoDetermined[];
function makeLabelsByCustomizedCategoryInterval(
    axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick: true
): number[];
function makeLabelsByCustomizedCategoryInterval(
    axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick?: boolean
) {
    const ordinalScale = axis.scale;
    const labelFormatter = makeLabelFormatter(axis);
    const result: (AxisLabelInfoDetermined | number)[] = [];

    zrUtil.each(ordinalScale.getTicks(), function (tick) {
        const rawLabel = ordinalScale.getLabel(tick);
        const tickValue = tick.value;
        if (categoryInterval(tick.value, rawLabel)) {
            result.push(
                onlyTick
                ? tickValue
                : {
                    formattedLabel: labelFormatter(tick),
                    rawLabel: rawLabel,
                    tickValue: tickValue,
                    time: undefined,
                    break: undefined,
                }
            );
        }
    });

    return result;
}
