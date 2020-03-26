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

import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import OrdinalScale from '../scale/Ordinal';
import IntervalScale from '../scale/Interval';
import Scale from '../scale/Scale';
import * as numberUtil from '../util/number';
import {
    prepareLayoutBarSeries,
    makeColumnLayout,
    retrieveColumnLayout
} from '../layout/barGrid';
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';

import TimeScale from '../scale/Time';
import Model from '../model/Model';
import { AxisBaseModel } from './AxisBaseModel';
import LogScale from '../scale/Log';
import Axis from './Axis';
import { AxisBaseOption } from './axisCommonTypes';
import type CartesianAxisModel from './cartesian/AxisModel';

type BarWidthAndOffset = ReturnType<typeof makeColumnLayout>;

/**
 * Get axis scale extent before niced.
 * Item of returned array can only be number (including Infinity and NaN).
 */
export function getScaleExtent(scale: Scale, model: AxisBaseModel) {
    const scaleType = scale.type;

    let min = model.getMin();
    let max = model.getMax();
    const fixMin = min != null;
    const fixMax = max != null;
    const originalExtent = scale.getExtent();

    let axisDataLen;
    let boundaryGapInner: number[];
    let span;
    if (scaleType === 'ordinal') {
        axisDataLen = model.getCategories().length;
    }
    else {
        const boundaryGap = model.get('boundaryGap');
        const boundaryGapArr = zrUtil.isArray(boundaryGap)
            ? boundaryGap : [boundaryGap || 0, boundaryGap || 0];

        if (typeof boundaryGapArr[0] === 'boolean' || typeof boundaryGapArr[1] === 'boolean') {
            if (__DEV__) {
                console.warn('Boolean type for boundaryGap is only '
                    + 'allowed for ordinal axis. Please use string in '
                    + 'percentage instead, e.g., "20%". Currently, '
                    + 'boundaryGap is set to be 0.');
            }
            boundaryGapInner = [0, 0];
        }
        else {
            boundaryGapInner = [
                numberUtil.parsePercent(boundaryGapArr[0], 1),
                numberUtil.parsePercent(boundaryGapArr[1], 1)
            ];
        }
        span = (originalExtent[1] - originalExtent[0])
            || Math.abs(originalExtent[0]);
    }

    // Notice: When min/max is not set (that is, when there are null/undefined,
    // which is the most common case), these cases should be ensured:
    // (1) For 'ordinal', show all axis.data.
    // (2) For others:
    //      + `boundaryGap` is applied (if min/max set, boundaryGap is
    //      disabled).
    //      + If `needCrossZero`, min/max should be zero, otherwise, min/max should
    //      be the result that originalExtent enlarged by boundaryGap.
    // (3) If no data, it should be ensured that `scale.setBlank` is set.

    // FIXME
    // (1) When min/max is 'dataMin' or 'dataMax', should boundaryGap be able to used?
    // (2) When `needCrossZero` and all data is positive/negative, should it be ensured
    // that the results processed by boundaryGap are positive/negative?

    if (min == null) {
        min = scaleType === 'ordinal'
            ? (axisDataLen ? 0 : NaN)
            : originalExtent[0] - boundaryGapInner[0] * span;
    }
    if (max == null) {
        max = scaleType === 'ordinal'
            ? (axisDataLen ? axisDataLen - 1 : NaN)
            : originalExtent[1] + boundaryGapInner[1] * span;
    }

    if (min === 'dataMin') {
        min = originalExtent[0];
    }
    else if (typeof min === 'function') {
        min = min({
            min: originalExtent[0],
            max: originalExtent[1]
        });
    }

    if (max === 'dataMax') {
        max = originalExtent[1];
    }
    else if (typeof max === 'function') {
        max = max({
            min: originalExtent[0],
            max: originalExtent[1]
        });
    }

    (min == null || !isFinite(min)) && (min = NaN);
    (max == null || !isFinite(max)) && (max = NaN);

    scale.setBlank(
        zrUtil.eqNaN(min)
        || zrUtil.eqNaN(max)
        || ((scale instanceof OrdinalScale) && !scale.getOrdinalMeta().categories.length)
    );

    // Evaluate if axis needs cross zero
    if (model.getNeedCrossZero()) {
        // Axis is over zero and min is not set
        if (min > 0 && max > 0 && !fixMin) {
            min = 0;
        }
        // Axis is under zero and max is not set
        if (min < 0 && max < 0 && !fixMax) {
            max = 0;
        }
    }

    // If bars are placed on a base axis of type time or interval account for axis boundary overflow and current axis
    // is base axis
    // FIXME
    // (1) Consider support value axis, where below zero and axis `onZero` should be handled properly.
    // (2) Refactor the logic with `barGrid`. Is it not need to `makeBarWidthAndOffsetInfo` twice with different extent?
    //     Should not depend on series type `bar`?
    // (3) Fix that might overlap when using dataZoom.
    // (4) Consider other chart types using `barGrid`?
    // See #6728, #4862, `test/bar-overflow-time-plot.html`
    const ecModel = model.ecModel;
    if (ecModel && (scaleType === 'time' /*|| scaleType === 'interval' */)) {
        const barSeriesModels = prepareLayoutBarSeries('bar', ecModel);
        let isBaseAxisAndHasBarSeries = false;

        zrUtil.each(barSeriesModels, function (seriesModel) {
            isBaseAxisAndHasBarSeries = isBaseAxisAndHasBarSeries || seriesModel.getBaseAxis() === model.axis;
        });

        if (isBaseAxisAndHasBarSeries) {
            // Calculate placement of bars on axis. TODO should be decoupled
            // with barLayout
            const barWidthAndOffset = makeColumnLayout(barSeriesModels);

            // Adjust axis min and max to account for overflow
            const adjustedScale = adjustScaleForOverflow(min, max, model as CartesianAxisModel, barWidthAndOffset);
            min = adjustedScale.min;
            max = adjustedScale.max;
        }
    }

    return [min, max];
}

function adjustScaleForOverflow(
    min: number,
    max: number,
    model: CartesianAxisModel,  // Onlhy support cartesian coord yet.
    barWidthAndOffset: BarWidthAndOffset
) {

    // Get Axis Length
    const axisExtent = model.axis.getExtent();
    const axisLength = axisExtent[1] - axisExtent[0];

    // Get bars on current base axis and calculate min and max overflow
    const barsOnCurrentAxis = retrieveColumnLayout(barWidthAndOffset, model.axis);
    if (barsOnCurrentAxis === undefined) {
        return {min: min, max: max};
    }

    let minOverflow = Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        minOverflow = Math.min(item.offset, minOverflow);
    });
    let maxOverflow = -Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        maxOverflow = Math.max(item.offset + item.width, maxOverflow);
    });
    minOverflow = Math.abs(minOverflow);
    maxOverflow = Math.abs(maxOverflow);
    const totalOverFlow = minOverflow + maxOverflow;

    // Calulate required buffer based on old range and overflow
    const oldRange = max - min;
    const oldRangePercentOfNew = (1 - (minOverflow + maxOverflow) / axisLength);
    const overflowBuffer = ((oldRange / oldRangePercentOfNew) - oldRange);

    max += overflowBuffer * (maxOverflow / totalOverFlow);
    min -= overflowBuffer * (minOverflow / totalOverFlow);

    return {min: min, max: max};
}

export function niceScaleExtent(scale: Scale, model: AxisBaseModel) {
    const extent = getScaleExtent(scale, model);
    const fixMin = model.getMin() != null;
    const fixMax = model.getMax() != null;
    const splitNumber = model.get('splitNumber');

    if (scale instanceof LogScale) {
        scale.base = model.get('logBase');
    }

    const scaleType = scale.type;
    scale.setExtent(extent[0], extent[1]);
    scale.niceExtent({
        splitNumber: splitNumber,
        fixMin: fixMin,
        fixMax: fixMax,
        minInterval: (scaleType === 'interval' || scaleType === 'time')
            ? model.get('minInterval') : null,
        maxInterval: (scaleType === 'interval' || scaleType === 'time')
            ? model.get('maxInterval') : null
    });

    // If some one specified the min, max. And the default calculated interval
    // is not good enough. He can specify the interval. It is often appeared
    // in angle axis with angle 0 - 360. Interval calculated in interval scale is hard
    // to be 60.
    // FIXME
    const interval = model.get('interval');
    if (interval != null) {
        (scale as IntervalScale).setInterval && (scale as IntervalScale).setInterval(interval);
    }
}

/**
 * @param axisType Default retrieve from model.type
 */
export function createScaleByModel(model: AxisBaseModel, axisType?: string): Scale {
    axisType = axisType || model.get('type');
    if (axisType) {
        switch (axisType) {
            // Buildin scale
            case 'category':
                return new OrdinalScale({
                    ordinalMeta: model.getOrdinalMeta
                        ? model.getOrdinalMeta()
                        : model.getCategories(),
                    extent: [Infinity, -Infinity]
                });
            case 'time':
                return new TimeScale({
                    useUTC: model.ecModel.get('useUTC')
                });
            default:
                // case 'value'/'interval', 'log', or others.
                return new (Scale.getClass(axisType) || IntervalScale)();
        }
    }
}

/**
 * Check if the axis corss 0
 */
export function ifAxisCrossZero(axis: Axis) {
    const dataExtent = axis.scale.getExtent();
    const min = dataExtent[0];
    const max = dataExtent[1];
    return !((min > 0 && max > 0) || (min < 0 && max < 0));
}

/**
 * @param axis
 * @return Label formatter function.
 *         param: {number} tickValue,
 *         param: {number} idx, the index in all ticks.
 *                         If category axis, this param is not requied.
 *         return: {string} label string.
 */
export function makeLabelFormatter(axis: Axis) {
    const labelFormatter = axis.getLabelModel().get('formatter');
    const categoryTickStart = axis.type === 'category' ? axis.scale.getExtent()[0] : null;

    if (typeof labelFormatter === 'string') {
        return (function (tpl) {
            return function (val: number | string) {
                // For category axis, get raw value; for numeric axis,
                // get foramtted label like '1,333,444'.
                val = axis.scale.getLabel(val);
                return tpl.replace('{value}', val != null ? val : '');
            };
        })(labelFormatter);
    }
    else if (typeof labelFormatter === 'function') {
        return (function (cb) {
            return function (tickValue: number, idx: number) {
                // The original intention of `idx` is "the index of the tick in all ticks".
                // But the previous implementation of category axis do not consider the
                // `axisLabel.interval`, which cause that, for example, the `interval` is
                // `1`, then the ticks "name5", "name7", "name9" are displayed, where the
                // corresponding `idx` are `0`, `2`, `4`, but not `0`, `1`, `2`. So we keep
                // the definition here for back compatibility.
                if (categoryTickStart != null) {
                    idx = tickValue - categoryTickStart;
                }
                return cb(getAxisRawValue(axis, tickValue), idx);
            };
        })(labelFormatter);
    }
    else {
        return function (tick: number) {
            return axis.scale.getLabel(tick);
        };
    }
}

export function getAxisRawValue(axis: Axis, value: number | string): number | string {
    // In category axis with data zoom, tick is not the original
    // index of axis.data. So tick should not be exposed to user
    // in category axis.
    return axis.type === 'category' ? axis.scale.getLabel(value) : value;
}

/**
 * @param axis
 * @return Be null/undefined if no labels.
 */
export function estimateLabelUnionRect(axis: Axis) {
    const axisModel = axis.model;
    const scale = axis.scale;

    if (!axisModel.get(['axisLabel', 'show']) || scale.isBlank()) {
        return;
    }

    let realNumberScaleTicks;
    let tickCount;
    const categoryScaleExtent = scale.getExtent();

    // Optimize for large category data, avoid call `getTicks()`.
    if (scale instanceof OrdinalScale) {
        tickCount = scale.count();
    }
    else {
        realNumberScaleTicks = scale.getTicks();
        tickCount = realNumberScaleTicks.length;
    }

    const axisLabelModel = axis.getLabelModel();
    const labelFormatter = makeLabelFormatter(axis);

    let rect;
    let step = 1;
    // Simple optimization for large amount of labels
    if (tickCount > 40) {
        step = Math.ceil(tickCount / 40);
    }
    for (let i = 0; i < tickCount; i += step) {
        const tickValue = realNumberScaleTicks ? realNumberScaleTicks[i] : categoryScaleExtent[0] + i;
        const label = labelFormatter(tickValue, i);
        const unrotatedSingleRect = axisLabelModel.getTextRect(label);
        const singleRect = rotateTextRect(unrotatedSingleRect, axisLabelModel.get('rotate') || 0);

        rect ? rect.union(singleRect) : (rect = singleRect);
    }

    return rect;
}

function rotateTextRect(textRect: RectLike, rotate: number) {
    const rotateRadians = rotate * Math.PI / 180;
    const beforeWidth = textRect.width;
    const beforeHeight = textRect.height;
    const afterWidth = beforeWidth * Math.cos(rotateRadians) + beforeHeight * Math.sin(rotateRadians);
    const afterHeight = beforeWidth * Math.sin(rotateRadians) + beforeHeight * Math.cos(rotateRadians);
    const rotatedRect = new BoundingRect(textRect.x, textRect.y, afterWidth, afterHeight);

    return rotatedRect;
}

/**
 * @param model axisLabelModel or axisTickModel
 * @return {number|String} Can be null|'auto'|number|function
 */
export function getOptionCategoryInterval(model: Model<AxisBaseOption['axisLabel']>) {
    const interval = model.get('interval');
    return interval == null ? 'auto' : interval;
}

/**
 * Set `categoryInterval` as 0 implicitly indicates that
 * show all labels reguardless of overlap.
 * @param {Object} axis axisModel.axis
 * @return {boolean}
 */
export function shouldShowAllLabels(axis: Axis) {
    return axis.type === 'category'
        && getOptionCategoryInterval(axis.getLabelModel()) === 0;
}

