import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import * as textContain from 'zrender/src/contain/text';
import OrdinalScale from '../scale/Ordinal';
import IntervalScale from '../scale/Interval';
import Scale from '../scale/Scale';
import * as numberUtil from '../util/number';
import {calBarWidthAndOffset} from '../layout/barGrid';

import '../scale/Time';
import '../scale/Log';

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
 * @param {Array.<number>} tickCoords In axis self coordinate.
 * @param {Array.<string>} labels
 * @param {string} font
 * @param {number} axisRotate 0: towards right horizontally, clock-wise is negative.
 * @param {number} [labelRotate=0] 0: towards right horizontally, clock-wise is negative.
 * @return {number}
 */
export function getAxisLabelInterval(tickCoords, labels, font, axisRotate, labelRotate) {
    var textSpaceTakenRect;
    var autoLabelInterval = 0;
    var accumulatedLabelInterval = 0;
    var rotation = (axisRotate - labelRotate) / 180 * Math.PI;

    var step = 1;
    if (labels.length > 40) {
        // Simple optimization for large amount of labels
        step = Math.floor(labels.length / 40);
    }

    for (var i = 0; i < tickCoords.length; i += step) {
        var tickCoord = tickCoords[i];

        // Not precise, do not consider align and vertical align
        // and each distance from axis line yet.
        var rect = textContain.getBoundingRect(
            labels[i], font, 'center', 'top'
        );
        rect.x += tickCoord * Math.cos(rotation);
        rect.y += tickCoord * Math.sin(rotation);

        // Magic number
        rect.width *= 1.3;
        rect.height *= 1.3;

        if (!textSpaceTakenRect) {
            textSpaceTakenRect = rect.clone();
        }
        // There is no space for current label;
        else if (textSpaceTakenRect.intersect(rect)) {
            accumulatedLabelInterval++;
            autoLabelInterval = Math.max(autoLabelInterval, accumulatedLabelInterval);
        }
        else {
            textSpaceTakenRect.union(rect);
            // Reset
            accumulatedLabelInterval = 0;
        }
    }
    if (autoLabelInterval === 0 && step > 1) {
        return step;
    }
    return (autoLabelInterval + 1) * step - 1;
}

/**
 * @param {Object} axis
 * @param {Function} labelFormatter
 * @return {Array.<string>}
 */
export function getFormattedLabels(axis, labelFormatter) {
    var scale = axis.scale;
    var labels = scale.getTicksLabels();
    var ticks = scale.getTicks();
    if (typeof labelFormatter === 'string') {
        labelFormatter = (function (tpl) {
            return function (val) {
                return tpl.replace('{value}', val != null ? val : '');
            };
        })(labelFormatter);
        // Consider empty array
        return zrUtil.map(labels, labelFormatter);
    }
    else if (typeof labelFormatter === 'function') {
        return zrUtil.map(ticks, function (tick, idx) {
            return labelFormatter(
                getAxisRawValue(axis, tick),
                idx
            );
        }, this);
    }
    else {
        return labels;
    }
}

export function getAxisRawValue(axis, value) {
    // In category axis with data zoom, tick is not the original
    // index of axis.data. So tick should not be exposed to user
    // in category axis.
    return axis.type === 'category' ? axis.scale.getLabel(value) : value;
}
