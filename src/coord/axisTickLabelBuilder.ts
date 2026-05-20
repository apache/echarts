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
import {makeInner, removeDuplicates, removeDuplicatesGetKeyFromItemItself} from '../util/model';
import {
    makeLabelFormatter,
    getOptionCategoryInterval,
} from './axisHelper';
import type Axis from './Axis';
import Model from '../model/Model';
import {
    AxisBaseOption, AxisTickLabelCustomValuesOption, CategoryAxisBaseOption,
    CategoryTickLabelSplitBuildingOption,
    CategoryTickLabelSplitIntervalCb
} from './axisCommonTypes';
import OrdinalScale from '../scale/Ordinal';
import { AxisBaseModel } from './AxisBaseModel';
import type Axis2D from './cartesian/Axis2D';
import { NullUndefined, ScaleTick } from '../util/types';
import Scale, { ScaleGetTicksOpt } from '../scale/Scale';
import { asc } from '../util/number';
import { ordinalScaleCreateTicks } from '../scale/helper';


export type AxisLabelInfoDetermined = {
    formattedLabel: string,
    rawLabel: string,
    tick: ScaleTick, // Never be null/undefined.
};

type AxisCache<TKey, TVal> = {
    list: {key: TKey; value: TVal;}[]
};

type AxisCategoryTickLabelCacheKey<TTickLabel extends AxisInnerStoreCacheProp> =
    CategoryAxisBaseOption[TTickLabel]['interval'];

interface AxisCategoryLabelsCreated {
    labels: AxisLabelInfoDetermined[]
    labelCategoryInterval: number
}
interface AxisCategoryTicksCreated {
    ticks: ScaleTick[]
    tickCategoryInterval?: number
}

type AxisTicksCreated = AxisCategoryTicksCreated;

type AxisModelInnerStore = {
    lastAutoInterval: number
    lastTickCount: number
    axisExtent0: number
    axisExtent1: number
};
const modelInner = makeInner<AxisModelInnerStore, AxisBaseModel>();

type AxisInnerStoreCacheProp = 'axisTick' | 'axisLabel';
type AxisInnerStore = {
    axisTick: AxisCache<AxisCategoryTickLabelCacheKey<'axisTick'>, AxisCategoryTicksCreated>
    axisLabel: AxisCache<AxisCategoryTickLabelCacheKey<'axisLabel'>, AxisCategoryLabelsCreated>
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

/**
 * CAUTION: Do not modify the result.
 */
export function createAxisLabels(axis: Axis, ctx: AxisLabelsComputingContext): {
    labels: AxisLabelInfoDetermined[]
} {
    const custom = axis.getLabelModel().get('customValues');
    if (custom) {
        const scale = axis.scale;
        return {
            labels: zrUtil.map(parseTickLabelCustomValues(custom, scale), (tick, index) => {
                return {
                    formattedLabel: makeLabelFormatter(axis)(tick, index),
                    rawLabel: scale.getLabel(tick),
                    tick: tick,
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
 * CAUTION: Do not modify the result.
 *
 * @param tickModel For example, can be axisTick, splitLine, splitArea.
 */
export function createAxisTicks(
    axis: Axis,
    tickModel: Model<CategoryTickLabelSplitBuildingOption>,
    opt?: Pick<ScaleGetTicksOpt, 'breakTicks' | 'pruneByBreak'>
): AxisTicksCreated {
    const scale = axis.scale;
    const custom = axis.getTickModel().get('customValues');
    if (custom) {
        return {
            ticks: parseTickLabelCustomValues(custom, scale)
        };
    }
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? makeCategoryTicks(axis, tickModel)
        : {ticks: scale.getTicks(opt)};
}

function parseTickLabelCustomValues(
    customValues: AxisTickLabelCustomValuesOption,
    scale: Scale,
): ScaleTick[] {
    const extent = scale.getExtent();
    const tickNumbers: number[] = [];
    zrUtil.each(customValues, function (val) {
        val = scale.parse(val);
        if (val >= extent[0] && val <= extent[1]) {
            tickNumbers.push(val);
        }
    });
    removeDuplicates(tickNumbers, removeDuplicatesGetKeyFromItemItself, null);
    asc(tickNumbers);
    return zrUtil.map(tickNumbers, function (tickVal) {
        return {value: tickVal};
    });
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
): AxisCategoryLabelsCreated {
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
        labels = makeTicksLabelsByCategoryIntervalNumOrCb(axis, optionLabelInterval, false);
    }
    else {
        numericLabelInterval = optionLabelInterval === 'auto'
            ? makeAutoCategoryInterval(axis, ctx) : optionLabelInterval;
        labels = makeTicksLabelsByCategoryIntervalNumOrCb(axis, numericLabelInterval, false);
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

function makeCategoryTicks(
    axis: Axis,
    tickModel: Model<CategoryTickLabelSplitBuildingOption>
): AxisCategoryTicksCreated {
    const ticksCache = ensureCategoryTickCache(axis);
    const optionTickInterval = getOptionCategoryInterval(tickModel);
    const result = axisCacheGet(ticksCache, optionTickInterval);

    if (result) {
        return result;
    }

    let ticks: ScaleTick[];
    let tickCategoryInterval;

    // Optimize for the case that large category data and no label displayed,
    // we should not return all ticks.
    if (!tickModel.get('show') || axis.scale.isBlank()) {
        ticks = [];
    }

    if (zrUtil.isFunction(optionTickInterval)) {
        ticks = makeTicksLabelsByCategoryIntervalNumOrCb(axis, optionTickInterval, true);
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
            return labelItem.tick;
        });
    }
    else {
        tickCategoryInterval = optionTickInterval;
        ticks = makeTicksLabelsByCategoryIntervalNumOrCb(axis, tickCategoryInterval, true);
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
                tick: tick,
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
 * Use a strategy to try to avoid overlapping.
 * To get precise result, at least one of `getRotate` and `isHorizontal`
 * should be implemented in axis.
 */
export function calculateCategoryInterval(axis: Axis, ctx: AxisLabelsComputingContext): number {
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

function makeTicksLabelsByCategoryIntervalNumOrCb(
    axis: Axis, categoryInterval: number | CategoryTickLabelSplitIntervalCb, onlyTick: false
): AxisLabelInfoDetermined[];
function makeTicksLabelsByCategoryIntervalNumOrCb(
    axis: Axis, categoryInterval: number | CategoryTickLabelSplitIntervalCb, onlyTick: true
): ScaleTick[];
function makeTicksLabelsByCategoryIntervalNumOrCb(
    axis: Axis, categoryInterval: number | CategoryTickLabelSplitIntervalCb, onlyTick?: boolean
) {
    const labelFormatter = makeLabelFormatter(axis);
    const ordinalScale = axis.scale as OrdinalScale;
    const result: (AxisLabelInfoDetermined | ScaleTick)[] = [];
    const categoryIntervalIsCb = zrUtil.isFunction(categoryInterval);

    ordinalScaleCreateTicks(
        ordinalScale,
        categoryIntervalIsCb ? 0 : categoryInterval,

        function (tickObj, isExtentBoundary) {
            const tickLabel = ordinalScale.getLabel(tickObj);
            if (categoryIntervalIsCb) {
                // When interval is function, a falsy return means ignore the tick.
                // It is time consuming for large category data.
                const isOnInterval = !!categoryInterval(tickObj.value, tickLabel);
                tickObj.offInterval = !isOnInterval;
                // axis extent min max labels should be always included and the display strategy
                // is adopted uniformly later in `AxisBuilder`.
                if (!isOnInterval && !isExtentBoundary) {
                    return;
                }
            }
            result.push(onlyTick
                ? tickObj
                : {
                    formattedLabel: labelFormatter(tickObj),
                    rawLabel: tickLabel,
                    tick: tickObj,
                }
            );
        }
    );

    return result;
}
