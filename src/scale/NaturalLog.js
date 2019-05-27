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
 * Natural Log scale
 * @module echarts/scale/NaturalLog
 */

import * as zrUtil from 'zrender/src/core/util';
import Scale from './Scale';
import * as numberUtil from '../util/number';

// Use some method of IntervalScale
import IntervalScale from './Interval';

var scaleProto = Scale.prototype;
var intervalScaleProto = IntervalScale.prototype;

var getPrecisionSafe = numberUtil.getPrecisionSafe;
var roundingErrorFix = numberUtil.round;

var mathFloor = Math.floor;
var mathCeil = Math.ceil;
var mathPow = Math.pow;

var mathLog = Math.log;

var NaturalLogScale = Scale.extend({

    type: 'naturallog',

    base: 10,

    $constructor: function () {
        Scale.apply(this, arguments);
        this._originalScale = new IntervalScale();
    },

    /**
     * @return {Array.<number>}
     */
    getTicks: function () {
        var originalScale = this._originalScale;
        var extent = this._extent;
        var originalExtent = originalScale.getExtent();

        var max = originalExtent[1];
        var min = originalExtent[0];
        var extentLow = mathFloor(extent[0]);
        var extentHigh = mathCeil(extent[1]);
        var values = [min];

        for (var logStep = extentLow; logStep <= extentHigh; logStep++) {
            var stepSize = mathPow(this.base, logStep);
            var cancel = false;
            for (var stepIndex = 1; stepIndex < this.base; stepIndex++) {
                stepValue = (stepIndex * stepSize);
                cancel = false;

                if (stepValue <= min) {
                    continue;
                }
                if (stepValue >= max) {
                    stepValue = max;
                    cancel = true;
                }
                values.push(stepValue);
                if (cancel) {
                    break;
                }
            }
            if (cancel) {
                break;
            }
        }

        return values;
    },

    /**
     * @param {number} val
     * @return {string}
     */
    getLabel: intervalScaleProto.getLabel,

    /**
     * @param  {number} val
     * @return {number}
     */
    scale: function (val) {
        val = scaleProto.scale.call(this, val);
        return mathPow(this.base, val);
    },

    /**
     * @param {number} start
     * @param {number} end
     */
    setExtent: function (start, end) {
        var base = this.base;
        start = mathLog(start) / mathLog(base);
        end = mathLog(end) / mathLog(base);
        intervalScaleProto.setExtent.call(this, start, end);
    },

    /**
     * @return {number} end
     */
    getExtent: function () {
        var base = this.base;
        var extent = scaleProto.getExtent.call(this);
        extent[0] = mathPow(base, extent[0]);
        extent[1] = mathPow(base, extent[1]);

        // Fix #4158
        var originalScale = this._originalScale;
        var originalExtent = originalScale.getExtent();
        originalScale.__fixMin && (extent[0] = fixRoundingError(extent[0], originalExtent[0]));
        originalScale.__fixMax && (extent[1] = fixRoundingError(extent[1], originalExtent[1]));

        return extent;
    },

    /**
     * @param  {Array.<number>} extent
     */
    unionExtent: function (extent) {
        this._originalScale.unionExtent(extent);

        var base = this.base;
        extent[0] = mathLog(extent[0]) / mathLog(base);
        extent[1] = mathLog(extent[1]) / mathLog(base);
        scaleProto.unionExtent.call(this, extent);
    },

    /**
     * @override
     */
    unionExtentFromData: function (data, dim) {
        // TODO
        // filter value that <= 0
        this.unionExtent(data.getApproximateExtent(dim));
    },

    /**
     * Update interval and extent of intervals for nice ticks
     * @param  {number} [approxTickNum = 10] Given approx tick number
     */
    niceTicks: function (approxTickNum) {
        approxTickNum = approxTickNum || 10;
        var extent = this._extent;
        var span = extent[1] - extent[0];
        if (span === Infinity || span <= 0) {
            return;
        }

        var interval = numberUtil.quantity(span);
        var err = approxTickNum / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            interval *= 10;
        }

        // Interval should be integer
        while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
            interval *= 10;
        }

        var niceExtent = [
            numberUtil.round(mathCeil(extent[0] / interval) * interval),
            numberUtil.round(mathFloor(extent[1] / interval) * interval)
        ];

        this._interval = interval;
        this._niceExtent = niceExtent;
    },

    /**
     * Nice extent.
     * @override
     */
    niceExtent: function (opt) {
        intervalScaleProto.niceExtent.call(this, opt);

        var originalScale = this._originalScale;
        originalScale.__fixMin = opt.fixMin;
        originalScale.__fixMax = opt.fixMax;
    }

});

zrUtil.each(['contain', 'normalize'], function (methodName) {
    NaturalLogScale.prototype[methodName] = function (val) {
        val = mathLog(val) / mathLog(this.base);
        return scaleProto[methodName].call(this, val);
    };
});

NaturalLogScale.create = function () {
    return new NaturalLogScale();
};

function fixRoundingError(val, originalVal) {
    return roundingErrorFix(val, getPrecisionSafe(originalVal));
}

export default NaturalLogScale;
