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
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';


import {makeInner} from '../util/model';
import {
    makeLabelFormatter,
    getOptionCategoryInterval,
    shouldShowAllLabels,
    isNameLocationCenter
} from './axisHelper';
import Axis from './Axis';
import Model from '../model/Model';
import { AxisBaseOption } from './axisCommonTypes';
import OrdinalScale from '../scale/Ordinal';
import { AxisBaseModel } from './AxisBaseModel';
import type Axis2D from './cartesian/Axis2D';

const RADIAN = Math.PI / 180;

interface Size {
    width: number;
    height: number;
}

type CacheKey = string | number;

type InnerListCache<T> = {
    key: CacheKey
    value: T
}[];

interface InnerLabelCachedVal {
    labels: MakeLabelsResultObj[]
    labelCategoryInterval?: number
    rotation?: number
}
interface InnerTickCachedVal {
    ticks: number[]
    tickCategoryInterval?: number
}

interface InnerAutoLayoutCachedVal {
    maxLabelSize?: Size
    interval: number
    rotation: number
}

type InnerStore = {
    labels: InnerListCache<InnerLabelCachedVal>
    ticks: InnerListCache<InnerTickCachedVal>
    labelUnionRect: InnerListCache<BoundingRect>
    autoLayout: InnerAutoLayoutCachedVal
    lastAutoLayout: InnerAutoLayoutCachedVal
    lastTickCount: number
    axisExtent0: number
    axisExtent1: number
};

const inner = makeInner<InnerStore, any>();

export function createAxisLabels(axis: Axis): {
    labels: {
        level?: number,
        formattedLabel: string,
        rawLabel: string,
        tickValue: number
    }[],
    rotation?: number,
    labelCategoryInterval?: number
} {
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? makeCategoryLabels(axis)
        : makeRealNumberLabels(axis);
}

/**
 * @param {module:echats/coord/Axis} axis
 * @param {module:echarts/model/Model} tickModel For example, can be axisTick, splitLine, splitArea.
 * @return {Object} {
 *     ticks: Array.<number>
 *     tickCategoryInterval: number
 * }
 */
export function createAxisTicks(axis: Axis, tickModel: AxisBaseModel): {
    ticks: number[],
    tickCategoryInterval?: number
} {
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? makeCategoryTicks(axis, tickModel)
        : {ticks: zrUtil.map(axis.scale.getTicks(), tick => tick.value) };
}

/**
 * @param {module:echats/coord/Axis} axis
 *
 */
export function getAxisNameGap(axis: Axis): number {
    const axesModel = axis.model;
    const nameGap = axesModel.get('nameGap') ?? 0;
    if (axesModel.get('nameLayout') === 'auto'
        && isNameLocationCenter(axis.model.get('nameLocation'))
    ) {
        const labelUnionRect = estimateLabelUnionRect(axis);
        if (labelUnionRect) {
            const labelMargin = axesModel.get(['axisLabel', 'margin']);
            const dim = isHorizontalAxis(axis) ? 'height' : 'width';
            return labelUnionRect[dim] + labelMargin + nameGap;
        }
    }

    return nameGap;
}


function makeCategoryLabels(axis: Axis) {
    const labelModel = axis.getLabelModel();
    const result = makeCategoryLabelsActually(axis, labelModel);

    return (!labelModel.get('show') || axis.scale.isBlank())
        ? {labels: [], labelCategoryInterval: result.labelCategoryInterval, rotation: 0}
        : result;
}

function makeCategoryLabelsActually(axis: Axis, labelModel: Model<AxisBaseOption['axisLabel']>) {
    const labelsCache = getListCache(axis, 'labels');
    const optionLabelInterval = getOptionCategoryInterval(labelModel);
    const result = listCacheGet(labelsCache, optionLabelInterval as CacheKey);

    if (result) {
        return result;
    }

    let labels;
    let layout;

    if (zrUtil.isFunction(optionLabelInterval)) {
        labels = makeLabelsByCustomizedCategoryInterval(axis, optionLabelInterval);
    }
    else {
        const autoInterval = optionLabelInterval === 'auto';
        layout = autoInterval || getOptionLabelAutoRotate(labelModel)
            ? makeAutoCategoryLayout(axis, autoInterval ? undefined : optionLabelInterval)
            : { interval: optionLabelInterval };
        labels = makeLabelsByNumericCategoryInterval(axis, layout.interval);
    }

    // Cache to avoid calling interval function repeatedly.
    return listCacheSet(labelsCache, optionLabelInterval as CacheKey, {
        labels: labels, ...layout
    });
}

function makeCategoryTicks(axis: Axis, tickModel: AxisBaseModel) {
    const ticksCache = getListCache(axis, 'ticks');
    const optionTickInterval = getOptionCategoryInterval(tickModel);
    const result = listCacheGet(ticksCache, optionTickInterval as CacheKey);

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
        const labelsResult = makeCategoryLabelsActually(axis, axis.getLabelModel());
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
    return listCacheSet(ticksCache, optionTickInterval as CacheKey, {
        ticks: ticks, tickCategoryInterval: tickCategoryInterval
    });
}

function makeRealNumberLabels(axis: Axis) {
    const ticks = axis.scale.getTicks();
    const labelFormatter = makeLabelFormatter(axis);
    return {
        labels: zrUtil.map(ticks, function (tick, idx) {
            return {
                level: tick.level,
                formattedLabel: labelFormatter(tick, idx),
                rawLabel: axis.scale.getLabel(tick),
                tickValue: tick.value
            };
        }),
        rotation: 0
    };
}

// Large category data calculation is performance sensitive, and ticks and label
// probably will be fetched multiple times. So we cache the result.
// axis is created each time during a ec process, so we do not need to clear cache.
function getListCache(axis: Axis, prop: 'ticks'): InnerStore['ticks'];
function getListCache(axis: Axis, prop: 'labels'): InnerStore['labels'];
function getListCache(axis: Axis, prop: 'labelUnionRect'): InnerStore['labelUnionRect'];
function getListCache(axis: Axis, prop: 'ticks' | 'labels' | 'labelUnionRect') {
    // Because key can be a function, and cache size always is small, we use array cache.
    return inner(axis)[prop] || (inner(axis)[prop] = []);
}

function listCacheGet<T>(cache: InnerListCache<T>, key: CacheKey): T {
    for (let i = 0; i < cache.length; i++) {
        if (cache[i].key === key) {
            return cache[i].value;
        }
    }
}

function listCacheSet<T>(cache: InnerListCache<T>, key: CacheKey, value: T): T {
    cache.push({key: key, value: value});
    return value;
}

/**
 * @param {module:echats/coord/Axis} axis
 * @return null/undefined if no labels.
 */
export function estimateLabelUnionRect(axis: Axis) {
    const axisModel = axis.model;
    const scale = axis.scale;

    if (!axisModel.get(['axisLabel', 'show']) || scale.isBlank()) {
        return;
    }

    const axisLabelModel = axis.getLabelModel();
    if (scale instanceof OrdinalScale) {
        // reuse category axis's cached labels info
        const { labels, labelCategoryInterval, rotation } = makeCategoryLabelsActually(axis, axisLabelModel);
        const step = layoutScaleStep(labels.length, axisLabelModel, labelCategoryInterval);
        return getLabelUnionRect(
            axis,
            (i) => labels[i].formattedLabel,
            labels.length,
            step,
            rotation ?? 0
        );
    }

    const labelFormatter = makeLabelFormatter(axis);
    const realNumberScaleTicks = scale.getTicks();
    const step = layoutScaleStep(realNumberScaleTicks.length, axisLabelModel);
    return getLabelUnionRect(
        axis,
        (i) => labelFormatter(realNumberScaleTicks[i], i),
        realNumberScaleTicks.length,
        step,
        axisLabelModel.get('rotate') ?? 0
    );
}

/**
 * @param {module:echats/coord/Axis} axis
 * @return Axis name dimensions.
 */
export function estimateAxisNameSize(axis: Axis): Size {
    const axisModel = axis.model;
    const name = axisModel.get('name');
    if (!name) {
        return { width: 0, height: 0 };
    }

    const textStyleModel = axisModel.getModel('nameTextStyle');
    const padding = normalizePadding(textStyleModel.get('padding') ?? 0);
    const nameRotate = axisModel.get('nameRotate') ?? 0;
    const { bounds } = rotateLabel(textStyleModel.getTextRect(name), nameRotate);
    return applyPadding(bounds, padding);
}

function getLabelUnionRect(
    axis: Axis,
    getLabel: (i: number) => string,
    tickCount: number,
    step: number,
    rotation: number
) {
    const cache = getListCache(axis, 'labelUnionRect');
    const key = tickCount + '_' + step + '_' + rotation + '_' + (tickCount > 0 ? getLabel(0) : '');
    const result = listCacheGet(cache, key);
    if (result) {
        return result;
    }

    return listCacheSet(cache, key, calculateLabelUnionRect(axis, getLabel, tickCount, step, rotation));
}

function calculateLabelUnionRect(
    axis: Axis,
    getLabel: (i: number) => string,
    tickCount: number,
    step: number,
    rotation: number
) {
    const labelModel = axis.getLabelModel();
    const padding = getOptionLabelPadding(labelModel);
    const isHorizontal = isHorizontalAxis(axis);
    let rect;
    for (let i = 0; i < tickCount; i += step) {
        const labelRect = rotateLabelRect(labelModel.getTextRect(getLabel(i)), rotation, padding, isHorizontal);
        rect ? rect.union(labelRect) : (rect = labelRect);
    }

    return rect;
}

function rotateLabelRect(
    originalRect: RectLike,
    rotation: number,
    padding: NormedPadding,
    isHorizontal: boolean
) {
    const { bounds, offset } = rotateLabel(originalRect, rotation);
    const { width, height } = applyPadding(bounds, padding);
    return new BoundingRect(
        0, 0,
        width - (isHorizontal ? 0 : offset.x),
        height - (isHorizontal ? offset.y : 0)
    );
}

function makeAutoCategoryLayout(axis: Axis, interval?: number) {
    const result = inner(axis).autoLayout;
    return result != null && (interval === undefined || result.interval === interval)
        ? result
        : (inner(axis).autoLayout = axis.calculateCategoryAutoLayout(interval));
}

function calculateUnitDimensions(axis: Axis): Size {
    const rotation = getAxisRotate(axis) * RADIAN;

    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    const tickValue = ordinalExtent[0];

    const unitSpan = axis.dataToCoord(tickValue + 1) - axis.dataToCoord(tickValue);
    return {
        width: Math.abs(unitSpan * Math.cos(rotation)),
        height: Math.abs(unitSpan * Math.sin(rotation))
    };
}

function calculateMaxLabelDimensions(axis: Axis): Size {
    const labelFormatter = makeLabelFormatter(axis);
    const axisLabelModel = axis.getLabelModel();

    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    const step = layoutScaleStep(ordinalScale.count(), axisLabelModel);

    let maxW = 0;
    let maxH = 0;

    // Caution: Performance sensitive for large category data.
    // Consider dataZoom, we should make appropriate step to avoid O(n) loop.
    for (let tickValue = ordinalExtent[0]; tickValue <= ordinalExtent[1]; tickValue += step) {
        const label = labelFormatter({ value: tickValue });
        const rect = axisLabelModel.getTextRect(label);
        // Min size, void long loop.
        maxW = Math.max(maxW, rect.width, 5);
        maxH = Math.max(maxH, rect.height, 5);
    }

    const labelPadding = getOptionLabelPadding(axisLabelModel);
    return applyPadding({ width: maxW, height: maxH }, labelPadding);
}


/**
 * Calculate interval for category axis ticks and labels.
 * To get precise result, at least one of `getRotate` and `isHorizontal`
 * should be implemented in axis.
 */
export function calculateCategoryInterval(axis: Axis) {
    return calculateCategoryAutoLayout(axis).interval;
}


function layoutScaleStep(tickCount: number, labelModel: Model<AxisBaseOption['axisLabel']>, interval?: number) {
    // Simple optimization for large amount of labels: trigger sparse label iteration
    // if tick count is over the threshold
    const treshhold = labelModel.get('layoutApproximationThreshold') ?? 40;
    const step = Math.max((interval ?? 0) + 1, 1);
    return tickCount > treshhold ? Math.max(step, Math.floor(tickCount / treshhold)) : step;
}

function calculateLabelInterval(unitSize: Size, maxLabelSize: Size, minDistance: number) {
    let dw = (maxLabelSize.width + minDistance) / unitSize.width;
    let dh = (maxLabelSize.height + minDistance) / unitSize.height;
    // 0/0 is NaN, 1/0 is Infinity.
    isNaN(dw) && (dw = Infinity);
    isNaN(dh) && (dh = Infinity);

    return Math.max(0, Math.floor(Math.min(dw, dh)));
}

/**
 * Rotate label's rectangle, see https://codepen.io/agurtovoy/pen/WNPyqWx for the visualization of the math
 * below.
 *
 * @return {Object} {
 *   axesIntersection: Size, // intersection of the rotated label's rectangle with the corresponding axes
 *   bounds: Size // dimensions of the rotated label's bounding rectangle
 *   offset: PointLike // bounding rectangle's offset from the assumed rotation origin
 *  }
 */
function rotateLabel({ width, height }: Size, rotation: number) {
    const rad = rotation * RADIAN;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    // width and height of the intersection of the rotated label's rectangle with the corresponding axes, see
    // https://math.stackexchange.com/questions/1449352/intersection-between-a-side-of-rotated-rectangle-and-axis
    const axesIntersection = {
        width: Math.min(width / cos, height / sin),
        height: Math.min(height / cos, width / sin)
    };

    // width and height of the rotated label's bounding rectangle; note th
    const bounds = {
        width: width * cos + height * sin,
        height: width * sin + height * cos
    };

    // label's bounding box's rotation origin is at the vertical center of the bbox's axis edge
    // rather than the corresponding corner point
    const asbRotation = Math.abs(rotation);
    const bboxOffset = asbRotation === 0 || asbRotation === 180 ? 0 : height / 2;
    const offset = {
        x: bboxOffset * sin,
        y: bboxOffset * cos
    };

    return { axesIntersection, bounds, offset };
}

function getCandidateLayouts(axis: Axis) {
    const unitSize = calculateUnitDimensions(axis);
    const maxLabelSize = calculateMaxLabelDimensions(axis);
    const isHorizontal = isHorizontalAxis(axis);

    const labelModel = axis.getLabelModel();
    const labelRotations = normalizeLabelRotations(getLabelRotations(labelModel), isHorizontal);
    const labelMinDistance = labelModel.get('minDistance') ?? 0;

    const candidateLayouts = [];
    for (const rotation of labelRotations) {
        const { axesIntersection, bounds, offset } = rotateLabel(maxLabelSize, rotation);
        const labelSize = isHorizontal
            ? { width: axesIntersection.width, height: bounds.height - offset.y }
            : { width: bounds.width - offset.x, height: axesIntersection.height };

        const interval = calculateLabelInterval(unitSize, labelSize, labelMinDistance);
        candidateLayouts.push({ labelSize, interval, rotation });
    }

    return candidateLayouts;
}

function chooseAutoLayout(candidateLayouts: InnerAutoLayoutCachedVal[]): InnerAutoLayoutCachedVal {
    let autoLayout = {
        interval: Infinity,
        rotation: 0
    };

    for (const layout of candidateLayouts) {
        if (layout.interval < autoLayout.interval
            || layout.interval > 0 && layout.interval === autoLayout.interval) {
            autoLayout = layout;
        }
    }

    return autoLayout;
}

/**
 * Calculate max label dimensions, interval, and rotation for category axis ticks and labels.
 * To get precise result, at least one of `getRotate` and `isHorizontal`
 * should be implemented in axis.
 */
export function calculateCategoryAutoLayout(axis: Axis, interval?: number): InnerAutoLayoutCachedVal {
    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    if (ordinalExtent[1] - ordinalExtent[0] < 1) {
        return { interval: 0, rotation: 0 };
    }

    const candidateLayouts = getCandidateLayouts(axis);
    let autoLayout = {
        ...chooseAutoLayout(candidateLayouts),
        ...(interval === undefined ? {} : { interval })
    };

    const axisExtent = axis.getExtent();
    const tickCount = ordinalScale.count();

    const cache = inner(axis.model);
    const lastAutoLayout = cache.lastAutoLayout;
    const lastTickCount = cache.lastTickCount;

    // Use cache to keep interval stable while moving zoom window,
    // otherwise the calculated interval might jitter when the zoom
    // window size is close to the interval-changing size.
    // For example, if all of the axis labels are `a, b, c, d, e, f, g`.
    // The jitter will cause that sometimes the displayed labels are
    // `a, d, g` (interval: 2) sometimes `a, c, e`(interval: 1).
    if (lastAutoLayout != null
        && lastTickCount != null
        && Math.abs(lastAutoLayout.interval - autoLayout.interval) <= 1
        && Math.abs(lastTickCount - tickCount) <= 1
        // Always choose the bigger one, otherwise the critical
        // point is not the same when zooming in or zooming out.
        && lastAutoLayout.interval > autoLayout.interval
        // If the axis change is caused by chart resize, the cache should not
        // be used. Otherwise some hidden labels might not be shown again.
        && cache.axisExtent0 === axisExtent[0]
        && cache.axisExtent1 === axisExtent[1]
    ) {
        autoLayout = lastAutoLayout;
    }
    // Only update cache if cache not used, otherwise the
    // changing of interval is too insensitive.
    else {
        cache.lastTickCount = tickCount;
        cache.lastAutoLayout = autoLayout;
        cache.axisExtent0 = axisExtent[0];
        cache.axisExtent1 = axisExtent[1];
    }

    return autoLayout;
}

function isHorizontalAxis(axis: Axis): boolean {
    return zrUtil.isFunction((axis as Axis2D).isHorizontal)
        && (axis as Axis2D).isHorizontal();
}

function getAxisRotate(axis: Axis) {
    return zrUtil.isFunction(axis.getRotate)
        ? axis.getRotate()
        : isHorizontalAxis(axis) ? 0 : 90;
}

function getLabelRotations(labelModel: Model<AxisBaseOption['axisLabel']>): [number, ...number[]] {
    const labelRotate = labelModel.get('rotate');
    const autoRotate = labelModel.get('autoRotate');
    return labelRotate
        ? [labelRotate]
        : zrUtil.isArray(autoRotate) && autoRotate.length > 0
            ? autoRotate
            : autoRotate ? [0, 45, 90] : [0];
}

function normalizeLabelRotations(rotations: [number, ...number[]], isHorizontal: boolean) {
    // for horizontal axes, we want to iterate through the rotation angles in the ascending order
    // so that the smaller angles are considered first; conversely, for vertical axes, the larger
    // angles need to be considered first, since in that case the 0 degree rotation corresponds
    // to the smaller possible vertical label size and the largest horizontal extent.
    return [...rotations].sort(isHorizontal
        ? (a, b) => Math.abs(a) - Math.abs(b)
        : (a, b) => Math.abs(b) - Math.abs(a)
    );
}

function getOptionLabelAutoRotate(labelModel: Model<AxisBaseOption['axisLabel']>) {
    const labelRotate = labelModel.get('rotate');
    const autoRotate = labelModel.get('autoRotate');
    return !labelRotate && (zrUtil.isArray(autoRotate) ? autoRotate.length > 1 : Boolean(autoRotate));
}

function getOptionLabelPadding(labelModel: Model<AxisBaseOption['axisLabel']>) {
    return normalizePadding(labelModel.get('padding') ?? 0);
}

type NormedPadding = [number, number, number, number];

function normalizePadding(padding: number | number[]): NormedPadding {
    return zrUtil.isArray(padding)
        ? (padding.length === 4
            ? padding as NormedPadding
            : [padding[0], padding[1], padding[0], padding[1]])
        : [padding, padding, padding, padding];
}

function applyPadding({ width, height }: Size, padding: NormedPadding) {
    return {
        width: width + padding[1] + padding[3],
        height: height + padding[0] + padding[2]
    };
}

interface MakeLabelsResultObj {
    formattedLabel: string
    rawLabel: string
    tickValue: number
}

function makeLabelsByNumericCategoryInterval(axis: Axis, categoryInterval: number): MakeLabelsResultObj[];
/* eslint-disable-next-line */
function makeLabelsByNumericCategoryInterval(axis: Axis, categoryInterval: number, onlyTick: false): MakeLabelsResultObj[];
function makeLabelsByNumericCategoryInterval(axis: Axis, categoryInterval: number, onlyTick: true): number[];
function makeLabelsByNumericCategoryInterval(axis: Axis, categoryInterval: number, onlyTick?: boolean) {
    const labelFormatter = makeLabelFormatter(axis);
    const ordinalScale = axis.scale as OrdinalScale;
    const ordinalExtent = ordinalScale.getExtent();
    const labelModel = axis.getLabelModel();
    const result: (MakeLabelsResultObj | number)[] = [];

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
                tickValue: tickValue
            }
        );
    }

    return result;
}

type CategoryIntervalCb = (tickVal: number, rawLabel: string) => boolean;

// When interval is function, the result `false` means ignore the tick.
// It is time consuming for large category data.
/* eslint-disable-next-line */
function makeLabelsByCustomizedCategoryInterval(axis: Axis, categoryInterval: CategoryIntervalCb): MakeLabelsResultObj[];
/* eslint-disable-next-line */
function makeLabelsByCustomizedCategoryInterval(axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick: false): MakeLabelsResultObj[];
/* eslint-disable-next-line */
function makeLabelsByCustomizedCategoryInterval(axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick: true): number[];
function makeLabelsByCustomizedCategoryInterval(axis: Axis, categoryInterval: CategoryIntervalCb, onlyTick?: boolean) {
    const ordinalScale = axis.scale;
    const labelFormatter = makeLabelFormatter(axis);
    const result: (MakeLabelsResultObj | number)[] = [];

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
                    tickValue: tickValue
                }
            );
        }
    });

    return result;
}
