define(function (require) {

    var OrdinalScale = require('../scale/Ordinal');
    var IntervalScale = require('../scale/Interval');
    require('../scale/Time');
    require('../scale/Log');
    var Scale = require('../scale/Scale');

    var numberUtil = require('../util/number');
    var zrUtil = require('zrender/core/util');
    var textContain = require('zrender/contain/text');
    var axisHelper = {};

    /**
     * Get axis scale extent before niced.
     * Item of returned array can only be number (including Infinity and NaN).
     */
    axisHelper.getScaleExtent = function (scale, model) {
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
            axisDataLen = (model.get('data') || []).length;
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
        if (max === 'dataMax') {
            max = originalExtent[1];
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

        return [min, max];
    };

    axisHelper.niceScaleExtent = function (scale, model) {
        var extent = axisHelper.getScaleExtent(scale, model);
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
    };

    /**
     * @param {module:echarts/model/Model} model
     * @param {string} [axisType] Default retrieve from model.type
     * @return {module:echarts/scale/*}
     */
    axisHelper.createScaleByModel = function(model, axisType) {
        axisType = axisType || model.get('type');
        if (axisType) {
            switch (axisType) {
                // Buildin scale
                case 'category':
                    return new OrdinalScale(
                        model.getCategories(), [Infinity, -Infinity]
                    );
                case 'value':
                    return new IntervalScale();
                // Extended scale, like time and log
                default:
                    return (Scale.getClass(axisType) || IntervalScale).create(model);
            }
        }
    };

    /**
     * Check if the axis corss 0
     */
    axisHelper.ifAxisCrossZero = function (axis) {
        var dataExtent = axis.scale.getExtent();
        var min = dataExtent[0];
        var max = dataExtent[1];
        return !((min > 0 && max > 0) || (min < 0 && max < 0));
    };

    /**
     * @param {Array.<number>} tickCoords In axis self coordinate.
     * @param {Array.<string>} labels
     * @param {string} font
     * @param {boolean} isAxisHorizontal
     * @return {number}
     */
    axisHelper.getAxisLabelInterval = function (tickCoords, labels, font, isAxisHorizontal) {
        // FIXME
        // 不同角的axis和label，不只是horizontal和vertical.

        var textSpaceTakenRect;
        var autoLabelInterval = 0;
        var accumulatedLabelInterval = 0;

        var step = 1;
        if (labels.length > 40) {
            // Simple optimization for large amount of labels
            step = Math.floor(labels.length / 40);
        }

        for (var i = 0; i < tickCoords.length; i += step) {
            var tickCoord = tickCoords[i];
            var rect = textContain.getBoundingRect(
                labels[i], font, 'center', 'top'
            );
            rect[isAxisHorizontal ? 'x' : 'y'] += tickCoord;
            // FIXME Magic number 1.5
            rect[isAxisHorizontal ? 'width' : 'height'] *= 1.3;
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
    };

    /**
     * @param {Object} axis
     * @param {Function} labelFormatter
     * @return {Array.<string>}
     */
    axisHelper.getFormattedLabels = function (axis, labelFormatter) {
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
                    axisHelper.getAxisRawValue(axis, tick),
                    idx
                );
            }, this);
        }
        else {
            return labels;
        }
    };

    axisHelper.getAxisRawValue = function (axis, value) {
        // In category axis with data zoom, tick is not the original
        // index of axis.data. So tick should not be exposed to user
        // in category axis.
        return axis.type === 'category' ? axis.scale.getLabel(value) : value;
    };

    return axisHelper;
});