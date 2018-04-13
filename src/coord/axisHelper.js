import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import * as textContain from 'zrender/src/contain/text';
import OrdinalScale from '../scale/Ordinal';
import IntervalScale from '../scale/Interval';
import Scale from '../scale/Scale';
import * as numberUtil from '../util/number';
import {calBarWidthAndOffset} from '../layout/barGrid';
import {makeInner} from '../util/model';
import BoundingRect from 'zrender/src/core/BoundingRect';

import '../scale/Time';
import '../scale/Log';

var inner = makeInner();

/**
 * Get axis scale extent before niced.
 * Item of returned array can only be number (including Infinity and NaN).
 */
export function getScaleExtent(scale, model) {
    var scaleType = scale.type;

    var min = model.getMin();
    var max = model.getMax();
    var fixMin = min != null;
    var fixMax = max != null;
    var originalExtent = scale.getExtent();

    var axisDataLen;
    var boundaryGap;
    var span;
    if (scaleType === 'ordinal') {
        axisDataLen = model.getCategories().length;
    }
    else {
        boundaryGap = model.get('boundaryGap');
        if (!zrUtil.isArray(boundaryGap)) {
            boundaryGap = [boundaryGap || 0, boundaryGap || 0];
        }
        if (typeof boundaryGap[0] === 'boolean') {
            if (__DEV__) {
                console.warn('Boolean type for boundaryGap is only '
                    + 'allowed for ordinal axis. Please use string in '
                    + 'percentage instead, e.g., "20%". Currently, '
                    + 'boundaryGap is set to be 0.');
            }
            boundaryGap = [0, 0];
        }
        boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], 1);
        boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], 1);
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
            : originalExtent[0] - boundaryGap[0] * span;
    }
    if (max == null) {
        max = scaleType === 'ordinal'
            ? (axisDataLen ? axisDataLen - 1 : NaN)
            : originalExtent[1] + boundaryGap[1] * span;
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

    scale.setBlank(zrUtil.eqNaN(min) || zrUtil.eqNaN(max));

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
    // (2) Refactor the logic with `barGrid`. Is it not need to `calBarWidthAndOffset` twice with different extent?
    //     Should not depend on series type `bar`?
    // (3) Fix that might overlap when using dataZoom.
    // (4) Consider other chart types using `barGrid`?
    // See #6728, #4862, `test/bar-overflow-time-plot.html`
    var ecModel = model.ecModel;
    if (ecModel && (scaleType === 'time' /*|| scaleType === 'interval' */)) {
        var barSeriesModels = [];
        var isBaseAxisAndHasBarSeries;

        ecModel.eachSeriesByType('bar', function (seriesModel) {
            if (seriesModel.coordinateSystem && seriesModel.coordinateSystem.type === 'cartesian2d') {
                barSeriesModels.push(seriesModel);
                isBaseAxisAndHasBarSeries |= seriesModel.getBaseAxis() === model.axis;
            }
        });

        if (isBaseAxisAndHasBarSeries) {
            // Adjust axis min and max to account for overflow
            var adjustedScale = adjustScaleForOverflow(min, max, model, barSeriesModels);
            min = adjustedScale.min;
            max = adjustedScale.max;
        }
    }

    return [min, max];
}

function adjustScaleForOverflow(min, max, model, barSeriesModels) {

    // Get Axis Length
    var axisExtent = model.axis.getExtent();
    var axisLength = axisExtent[1] - axisExtent[0];

    // Calculate placement of bars on axis
    var barWidthAndOffset = calBarWidthAndOffset(barSeriesModels);

    // Get bars on current base axis and calculate min and max overflow
    var baseAxisKey = model.axis.dim + model.axis.index;
    var barsOnCurrentAxis = barWidthAndOffset[baseAxisKey];
    if (barsOnCurrentAxis === undefined) {
        return {min: min, max: max};
    }

    var minOverflow = Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        minOverflow = Math.min(item.offset, minOverflow);
    });
    var maxOverflow = -Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        maxOverflow = Math.max(item.offset + item.width, maxOverflow);
    });
    minOverflow = Math.abs(minOverflow);
    maxOverflow = Math.abs(maxOverflow);
    var totalOverFlow = minOverflow + maxOverflow;

    // Calulate required buffer based on old range and overflow
    var oldRange = max - min;
    var oldRangePercentOfNew = (1 - (minOverflow + maxOverflow) / axisLength);
    var overflowBuffer = ((oldRange / oldRangePercentOfNew) - oldRange);

    max += overflowBuffer * (maxOverflow / totalOverFlow);
    min -= overflowBuffer * (minOverflow / totalOverFlow);

    return {min: min, max: max};
}

export function niceScaleExtent(scale, model) {
    var extent = getScaleExtent(scale, model);
    var fixMin = model.getMin() != null;
    var fixMax = model.getMax() != null;
    var splitNumber = model.get('splitNumber');

    if (scale.type === 'log') {
        scale.base = model.get('logBase');
    }

    var scaleType = scale.type;
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
    var interval = model.get('interval');
    if (interval != null) {
        scale.setInterval && scale.setInterval(interval);
    }
}

/**
 * @param {module:echarts/model/Model} model
 * @param {string} [axisType] Default retrieve from model.type
 * @return {module:echarts/scale/*}
 */
export function createScaleByModel(model, axisType) {
    axisType = axisType || model.get('type');
    if (axisType) {
        switch (axisType) {
            // Buildin scale
            case 'category':
                return new OrdinalScale(
                    model.getOrdinalMeta
                        ? model.getOrdinalMeta()
                        : model.getCategories(),
                    [Infinity, -Infinity]
                );
            case 'value':
                return new IntervalScale();
            // Extended scale, like time and log
            default:
                return (Scale.getClass(axisType) || IntervalScale).create(model);
        }
    }
}

/**
 * Check if the axis corss 0
 */
export function ifAxisCrossZero(axis) {
    var dataExtent = axis.scale.getExtent();
    var min = dataExtent[0];
    var max = dataExtent[1];
    return !((min > 0 && max > 0) || (min < 0 && max < 0));
}

/**
 * @param {module:echarts/coord/Axis} axis
 * @return {Function} Label formatter function.
 *         param: {number} tickValue,
 *         param: {number} idx, the index in all ticks.
 *                         If category axis, this param is not requied.
 *         return: {string} label string.
 */
function makeLabelFormatter(axis) {
    var labelFormatter = axis.getLabelModel().get('formatter');
    var categoryTickStart = axis.type === 'category' ? axis.scale.getExtent()[0] : null;

    if (typeof labelFormatter === 'string') {
        labelFormatter = (function (tpl) {
            return function (val) {
                return tpl.replace('{value}', val != null ? val : '');
            };
        })(labelFormatter);
        // Consider empty array
        return labelFormatter;
    }
    else if (typeof labelFormatter === 'function') {
        return function (tickValue, idx) {
            // The original intention of `idx` is "the index of the tick in all ticks".
            // But the previous implementation of category axis do not consider the
            // `axisLabel.interval`, which cause that, for example, the `interval` is
            // `1`, then the ticks "name5", "name7", "name9" are displayed, where the
            // corresponding `idx` are `0`, `2`, `4`, but not `0`, `1`, `2`. So we keep
            // the definition here for back compatibility.
            if (categoryTickStart != null) {
                idx = tickValue - categoryTickStart;
            }
            return labelFormatter(getAxisRawValue(axis, tickValue), idx);
        };
    }
    else {
        return function (tick) {
            return axis.scale.getLabel(tick);
        };
    }
}

export function getAxisRawValue(axis, value) {
    // In category axis with data zoom, tick is not the original
    // index of axis.data. So tick should not be exposed to user
    // in category axis.
    return axis.type === 'category' ? axis.scale.getLabel(value) : value;
}

/**
 * Performance sensible in the large category data case.
 * @param {module:echats/coord/Axis} axis
 * @param {Object} opt
 * @param {number} [opt.tickCategoryInterval] Can be null/'auto'. Can also be
 *        axisTick.interval, splitLine.interval, splitArea.interval.
 * @return {Object} {
 *     ticks: [number, ...]
 *     labels: [{
 *         formattedLabel: string,
 *         rawLabel: string,
 *         tickValue: number
 *     }, ...],
 *     labelCategoryInterval,
 *     tickCategoryInterval
 * }
 */
export function createAxisTicksAndLabels(axis, opt) {
    // Only ordinal scale support tick interval
    return axis.type === 'category'
        ? createCategoryTicksAndLabels(axis, opt)
        : createRealNumberTicksAndLabels(axis, opt);
}

function createCategoryTicksAndLabels(axis, opt) {
    var labelModel = axis.getLabelModel();

    // (1) Only add min max label here but leave overlap checking
    // to render stage, which also ensure the returned list
    // suitable for splitLine and splitArea rendering.
    // (2) Scales except category always contain min max label so
    // do not need to perform this process.
    var showMinMax = {
        min: labelModel.get('showMinLabel'),
        max: labelModel.get('showMaxLabel')
    };

    // Large category data calculation is performence sensitive, and ticks and label
    // probably be fetched by multiple times. So we cache the result.
    // axis is created each time during a ec process, so we do not need to clear cache.
    var ticksCache = getListCache(axis, 'ticks');
    var labelsCache = getListCache(axis, 'labels');

    var labelCategoryInterval = normalizeAuto(labelModel.get('interval'));
    var labels = listCacheGet(labelsCache, labelCategoryInterval);
    if (!labels) {
        if (zrUtil.isFunction(labelCategoryInterval)) {
            labels = makeLabelsByCustomizedCategoryInterval(axis, labelCategoryInterval);
        }
        else {
            if (labelCategoryInterval === 'auto') {
                labelCategoryInterval = calculateAutoCategoryInterval(axis);
            }
            labels = makeLabelsByNumericCategoryInterval(axis, labelCategoryInterval, showMinMax);
        }
        listCacheSet(labelsCache, labelCategoryInterval, labels);
    }

    var tickCategoryInterval = normalizeAuto(opt.tickCategoryInterval);
    var ticks = listCacheGet(ticksCache, tickCategoryInterval);
    if (!ticks) {
        if (zrUtil.isFunction(tickCategoryInterval)) {
            ticks = makeLabelsByCustomizedCategoryInterval(axis, tickCategoryInterval, true);
        }
        else if (tickCategoryInterval === 'auto' || tickCategoryInterval === labelCategoryInterval) {
            // Always use label interval by default.
            tickCategoryInterval = labelCategoryInterval;
            ticks = zrUtil.map(labels, function (labelItem) {
                return labelItem.tickValue;
            });
        }
        else {
            ticks = makeLabelsByNumericCategoryInterval(axis, tickCategoryInterval, showMinMax, true);
        }
        listCacheSet(ticksCache, tickCategoryInterval, ticks);
    }

    return {
        ticks: ticks,
        labels: labels,
        labelCategoryInterval: labelCategoryInterval,
        tickCategoryInterval: tickCategoryInterval
    };
}

function createRealNumberTicksAndLabels(axis, opt) {
    var ticks = axis.scale.getTicks();
    var labelFormatter = makeLabelFormatter(axis);
    var labels = zrUtil.map(ticks, function (tickValue, idx) {
        return {
            formattedLabel: labelFormatter(tickValue, idx),
            rawLabel: axis.scale.getLabel(tickValue),
            tickValue: tickValue
        };
    });

    return {ticks: ticks, labels: labels};
}

function getListCache(axis, prop) {
    // Because key can be funciton, and cache size always be small, we use array cache.
    return inner(axis)[prop] || (inner(axis)[prop] = []);
}

function listCacheGet(cache, key) {
    for (var i = 0; i < cache.length; i++) {
        if (cache[i].key === key) {
            return cache[i].value;
        }
    }
}

function listCacheSet(cache, key, value) {
    cache.push({key: key, value: value});
}

/**
 * Performance sensitive for large category data.
 * Get interval of the axis label.
 * To get precise result, at least one of `getRotate` and `isHorizontal`
 * should be implemented.
 * @param {module:echarts/coord/Axis} axis
 * @return {number}
 */
function calculateAutoCategoryInterval(axis) {
    var params = fetchAutoCategoryIntervalCalculationParams(axis);
    var labelFormatter = makeLabelFormatter(axis);
    var rotation = (params.axisRotate - params.labelRotate) / 180 * Math.PI;

    var ordinalScale = axis.scale;
    var ordinalExtent = ordinalScale.getExtent();
    // Providing this method is for optimization:
    // avoid generating a long array by `getTicks`
    // in large category data case.
    var tickCount = ordinalScale.count();

    var step = 1;
    // Simple optimization. Empirical value: tick count less 40.
    if (tickCount > 40) {
        step = Math.max(1, Math.floor(tickCount / 40));
    }

    var textSpaceTakenRect;
    var accumulatedLabelInterval = 0;

    for (var tickValue = ordinalExtent[0]; tickValue <= ordinalExtent[1]; ) {
        var formattedLabel = labelFormatter(tickValue);
        // Not precise, do not consider align and vertical align
        // and each distance from axis line yet.
        var rect = textContain.getBoundingRect(
            formattedLabel, params.font, 'center', 'top'
        );
        // Polar is also calculated in assumptive linear layout here.
        var tickCoord = axis.dataToCoord(tickValue);
        rect.x += tickCoord * Math.cos(rotation);
        rect.y += tickCoord * Math.sin(rotation);

        // Magic number
        rect.width *= 1.3;
        rect.height *= 1.3;
        if (!textSpaceTakenRect) {
            textSpaceTakenRect = rect;
            tickValue += step;
        }
        // There is no space for current label.
        else if (textSpaceTakenRect.intersect(rect)) {
            accumulatedLabelInterval++;
            tickValue++;
        }
        else {
            textSpaceTakenRect.union(rect);
            if (accumulatedLabelInterval) {
                // Optimize: add step to escape uncessary loop.
                step += accumulatedLabelInterval;
                accumulatedLabelInterval = 0;
            }
            tickValue += step;
        }
    }

    if (accumulatedLabelInterval) {
        step += accumulatedLabelInterval;
    }

    var cache = inner(axis.model);
    var lastStep = cache.lastStep;
    var lastTickCount = cache.lastTickCount;

    // Use cache to keep interval stable while moving zoom window,
    // otherwise the calculated interval might jitter when the zoom
    // window size is close to the interval-changing size.
    if (lastStep != null
        && lastTickCount != null
        && Math.abs(lastStep - step) <= 1
        && Math.abs(lastTickCount - tickCount) <= 1
        // Always choose the bigger one, otherwise the critical
        // point is not the same when zooming in or zooming out.
        && lastStep > step
    ) {
        step = lastStep;
    }
    // Only update cache if cache not used, otherwise the
    // changing of interval is too insensitive.
    else {
        cache.lastTickCount = tickCount;
        cache.lastStep = step;
    }

    return step - 1;
}

function fetchAutoCategoryIntervalCalculationParams(axis) {
    var labelModel = axis.getLabelModel();
    return {
        axisRotate: axis.getRotate
            ? axis.getRotate()
            : (axis.isHorizontal && !axis.isHorizontal())
            ? 90
            : 0,
        labelRotate: labelModel.get('rotate') || 0,
        font: labelModel.getFont()
    };
}

function makeLabelsByNumericCategoryInterval(axis, categoryInterval, showMinMax, onlyTick) {
    var labelFormatter = makeLabelFormatter(axis);
    var ordinalScale = axis.scale;
    var ordinalExtent = ordinalScale.getExtent();
    var result = [];

    // TODO: axisType: ordinalTime, pick the tick from each month/day/year/...

    var step = Math.max((categoryInterval || 0) + 1, 1);
    var startTick = ordinalExtent[0];
    var tickCount = ordinalScale.count();

    // Calculate start tick based on zero if possible to keep label consistent
    // while zooming and moving while interval > 0. Otherwise the selection
    // of displayable ticks and symbols probably keep changing.
    // 3 is empirical value.
    if (startTick !== 0 && step > 1 && tickCount / step > 2) {
        startTick = Math.round(Math.ceil(startTick / step) * step);
    }

    if (showMinMax.min && startTick !== ordinalExtent[0]) {
        addItem(ordinalExtent[0]);
    }

    // Optimize: avoid generating large array by `ordinalScale.getTicks()`.
    var tickValue = startTick;
    for (; tickValue <= ordinalExtent[1]; tickValue += step) {
        addItem(tickValue);
    }

    if (showMinMax.max && tickValue !== ordinalExtent[1]) {
        addItem(ordinalExtent[1]);
    }

    function addItem(tVal) {
        result.push(onlyTick
            ? tVal
            : {
                formattedLabel: labelFormatter(tVal),
                rawLabel: ordinalScale.getLabel(tVal),
                tickValue: tVal
            }
        );
    }

    return result;
}

// When interval is function, the result `false` means ignore the tick.
// It is time consuming for large category data.
function makeLabelsByCustomizedCategoryInterval(axis, categoryInterval, onlyTick) {
    var ordinalScale = axis.scale;
    var labelFormatter = makeLabelFormatter(axis);
    var result = [];

    zrUtil.each(ordinalScale.getTicks(), function (tickValue) {
        var rawLabel = ordinalScale.getLabel(tickValue);
        if (categoryInterval(tickValue, rawLabel)) {
            result.push(onlyTick
                ? tickValue
                : {
                    formattedLabel: labelFormatter(tickValue),
                    rawLabel: rawLabel,
                    tickValue: tickValue
                }
            );
        }
    });

    return result;
}

// Can be null|'auto'
function normalizeAuto(setting) {
    return setting == null ? 'auto' : setting;
}

/**
 * @param {module:echarts/coord/Axis} axis
 * @return {module:zrender/core/BoundingRect} Be null/undefined if no labels.
 */
export function estimateLabelUnionRect(axis) {
    var axisModel = axis.model;

    if (!axisModel.get('axisLabel.show')) {
        return;
    }

    var scale = axis.scale;
    var isCategory = axis.type === 'category';

    var realNumberScaleTicks;
    var tickCount;
    var categoryScaleExtent = scale.getExtent();

    // Optimize for large category data, avoid call `getTicks()`.
    if (isCategory) {
        tickCount = scale.count();
    }
    else {
        realNumberScaleTicks = scale.getTicks();
        tickCount = realNumberScaleTicks.length;
    }

    var axisLabelModel = axis.getLabelModel();
    var labelFormatter = makeLabelFormatter(axis);

    var rect;
    var step = 1;
    // Simple optimization for large amount of labels
    if (tickCount > 40) {
        step = Math.ceil(tickCount / 40);
    }
    for (var i = 0; i < tickCount; i += step) {
        var tickValue = realNumberScaleTicks ? realNumberScaleTicks[i] : categoryScaleExtent[0] + i;
        var label = labelFormatter(tickValue);
        var unrotatedSingleRect = axisLabelModel.getTextRect(label);
        var singleRect = rotateTextRect(unrotatedSingleRect, axisLabelModel.get('rotate') || 0);

        rect ? rect.union(singleRect) : (rect = singleRect);
    }

    return rect;
}

function rotateTextRect(textRect, rotate) {
    var rotateRadians = rotate * Math.PI / 180;
    var boundingBox = textRect.plain();
    var beforeWidth = boundingBox.width;
    var beforeHeight = boundingBox.height;
    var afterWidth = beforeWidth * Math.cos(rotateRadians) + beforeHeight * Math.sin(rotateRadians);
    var afterHeight = beforeWidth * Math.sin(rotateRadians) + beforeHeight * Math.cos(rotateRadians);
    var rotatedRect = new BoundingRect(boundingBox.x, boundingBox.y, afterWidth, afterHeight);

    return rotatedRect;
}


