
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

var _config = require("../config");

var __DEV__ = _config.__DEV__;

var zrUtil = require("zrender/lib/core/util");

var OrdinalScale = require("../scale/Ordinal");

var IntervalScale = require("../scale/Interval");

var Scale = require("../scale/Scale");

var numberUtil = require("../util/number");

var _barGrid = require("../layout/barGrid");

var prepareLayoutBarSeries = _barGrid.prepareLayoutBarSeries;
var makeColumnLayout = _barGrid.makeColumnLayout;
var retrieveColumnLayout = _barGrid.retrieveColumnLayout;

var BoundingRect = require("zrender/lib/core/BoundingRect");

require("../scale/Time");

require("../scale/Log");

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

/**
 * Get axis scale extent before niced.
 * Item of returned array can only be number (including Infinity and NaN).
 */
function getScaleExtent(scale, model) {
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
  } else {
    boundaryGap = model.get('boundaryGap');

    if (!zrUtil.isArray(boundaryGap)) {
      boundaryGap = [boundaryGap || 0, boundaryGap || 0];
    }

    if (typeof boundaryGap[0] === 'boolean') {
      boundaryGap = [0, 0];
    }

    boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], 1);
    boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], 1);
    span = originalExtent[1] - originalExtent[0] || Math.abs(originalExtent[0]);
  } // Notice: When min/max is not set (that is, when there are null/undefined,
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
    min = scaleType === 'ordinal' ? axisDataLen ? 0 : NaN : originalExtent[0] - boundaryGap[0] * span;
  }

  if (max == null) {
    max = scaleType === 'ordinal' ? axisDataLen ? axisDataLen - 1 : NaN : originalExtent[1] + boundaryGap[1] * span;
  }

  if (min === 'dataMin') {
    min = originalExtent[0];
  } else if (typeof min === 'function') {
    min = min({
      min: originalExtent[0],
      max: originalExtent[1]
    });
  }

  if (max === 'dataMax') {
    max = originalExtent[1];
  } else if (typeof max === 'function') {
    max = max({
      min: originalExtent[0],
      max: originalExtent[1]
    });
  }

  (min == null || !isFinite(min)) && (min = NaN);
  (max == null || !isFinite(max)) && (max = NaN);
  scale.setBlank(zrUtil.eqNaN(min) || zrUtil.eqNaN(max) || scaleType === 'ordinal' && !scale.getOrdinalMeta().categories.length); // Evaluate if axis needs cross zero

  if (model.getNeedCrossZero()) {
    // Axis is over zero and min is not set
    if (min > 0 && max > 0 && !fixMin) {
      min = 0;
    } // Axis is under zero and max is not set


    if (min < 0 && max < 0 && !fixMax) {
      max = 0;
    }
  } // If bars are placed on a base axis of type time or interval account for axis boundary overflow and current axis
  // is base axis
  // FIXME
  // (1) Consider support value axis, where below zero and axis `onZero` should be handled properly.
  // (2) Refactor the logic with `barGrid`. Is it not need to `makeBarWidthAndOffsetInfo` twice with different extent?
  //     Should not depend on series type `bar`?
  // (3) Fix that might overlap when using dataZoom.
  // (4) Consider other chart types using `barGrid`?
  // See #6728, #4862, `test/bar-overflow-time-plot.html`


  var ecModel = model.ecModel;

  if (ecModel && scaleType === 'time'
  /*|| scaleType === 'interval' */
  ) {
    var barSeriesModels = prepareLayoutBarSeries('bar', ecModel);
    var isBaseAxisAndHasBarSeries;
    zrUtil.each(barSeriesModels, function (seriesModel) {
      isBaseAxisAndHasBarSeries |= seriesModel.getBaseAxis() === model.axis;
    });

    if (isBaseAxisAndHasBarSeries) {
      // Calculate placement of bars on axis
      var barWidthAndOffset = makeColumnLayout(barSeriesModels); // Adjust axis min and max to account for overflow

      var adjustedScale = adjustScaleForOverflow(min, max, model, barWidthAndOffset);
      min = adjustedScale.min;
      max = adjustedScale.max;
    }
  }

  return [min, max];
}

function adjustScaleForOverflow(min, max, model, barWidthAndOffset) {
  // Get Axis Length
  var axisExtent = model.axis.getExtent();
  var axisLength = axisExtent[1] - axisExtent[0]; // Get bars on current base axis and calculate min and max overflow

  var barsOnCurrentAxis = retrieveColumnLayout(barWidthAndOffset, model.axis);

  if (barsOnCurrentAxis === undefined) {
    return {
      min: min,
      max: max
    };
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
  var totalOverFlow = minOverflow + maxOverflow; // Calulate required buffer based on old range and overflow

  var oldRange = max - min;
  var oldRangePercentOfNew = 1 - (minOverflow + maxOverflow) / axisLength;
  var overflowBuffer = oldRange / oldRangePercentOfNew - oldRange;
  max += overflowBuffer * (maxOverflow / totalOverFlow);
  min -= overflowBuffer * (minOverflow / totalOverFlow);
  return {
    min: min,
    max: max
  };
}

function niceScaleExtent(scale, model) {
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
    minInterval: scaleType === 'interval' || scaleType === 'time' ? model.get('minInterval') : null,
    maxInterval: scaleType === 'interval' || scaleType === 'time' ? model.get('maxInterval') : null
  }); // If some one specified the min, max. And the default calculated interval
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


function createScaleByModel(model, axisType) {
  axisType = axisType || model.get('type');

  if (axisType) {
    switch (axisType) {
      // Buildin scale
      case 'category':
        return new OrdinalScale(model.getOrdinalMeta ? model.getOrdinalMeta() : model.getCategories(), [Infinity, -Infinity]);

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


function ifAxisCrossZero(axis) {
  var dataExtent = axis.scale.getExtent();
  var min = dataExtent[0];
  var max = dataExtent[1];
  return !(min > 0 && max > 0 || min < 0 && max < 0);
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
    labelFormatter = function (tpl) {
      return function (val) {
        // For category axis, get raw value; for numeric axis,
        // get foramtted label like '1,333,444'.
        val = axis.scale.getLabel(val);
        return tpl.replace('{value}', val != null ? val : '');
      };
    }(labelFormatter); // Consider empty array


    return labelFormatter;
  } else if (typeof labelFormatter === 'function') {
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
  } else {
    return function (tick) {
      return axis.scale.getLabel(tick);
    };
  }
}

function getAxisRawValue(axis, value) {
  // In category axis with data zoom, tick is not the original
  // index of axis.data. So tick should not be exposed to user
  // in category axis.
  return axis.type === 'category' ? axis.scale.getLabel(value) : value;
}
/**
 * @param {module:echarts/coord/Axis} axis
 * @return {module:zrender/core/BoundingRect} Be null/undefined if no labels.
 */


function estimateLabelUnionRect(axis) {
  var axisModel = axis.model;
  var scale = axis.scale;

  if (!axisModel.get('axisLabel.show') || scale.isBlank()) {
    return;
  }

  var isCategory = axis.type === 'category';
  var realNumberScaleTicks;
  var tickCount;
  var categoryScaleExtent = scale.getExtent(); // Optimize for large category data, avoid call `getTicks()`.

  if (isCategory) {
    tickCount = scale.count();
  } else {
    realNumberScaleTicks = scale.getTicks();
    tickCount = realNumberScaleTicks.length;
  }

  var axisLabelModel = axis.getLabelModel();
  var labelFormatter = makeLabelFormatter(axis);
  var rect;
  var step = 1; // Simple optimization for large amount of labels

  if (tickCount > 40) {
    step = Math.ceil(tickCount / 40);
  }

  for (var i = 0; i < tickCount; i += step) {
    var tickValue = realNumberScaleTicks ? realNumberScaleTicks[i] : categoryScaleExtent[0] + i;
    var label = labelFormatter(tickValue);
    var unrotatedSingleRect = axisLabelModel.getTextRect(label);
    var singleRect = rotateTextRect(unrotatedSingleRect, axisLabelModel.get('rotate') || 0);
    rect ? rect.union(singleRect) : rect = singleRect;
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

exports.getScaleExtent = getScaleExtent;
exports.niceScaleExtent = niceScaleExtent;
exports.createScaleByModel = createScaleByModel;
exports.ifAxisCrossZero = ifAxisCrossZero;
exports.makeLabelFormatter = makeLabelFormatter;
exports.getAxisRawValue = getAxisRawValue;
exports.estimateLabelUnionRect = estimateLabelUnionRect;