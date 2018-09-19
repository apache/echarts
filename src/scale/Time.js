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

/*
* The `scaleLevels` references to d3.js. The use of the source
* code of this file is also subject to the terms and consitions
* of its license (BSD-3Clause, see <echarts/src/licenses/LICENSE-d3>).
*/

// [About UTC and local time zone]:
// In most cases, `number.parseDate` will treat input data string as local time
// (except time zone is specified in time string). And `format.formateTime` returns
// local time by default. option.useUTC is false by default. This design have
// concidered these common case:
// (1) Time that is persistent in server is in UTC, but it is needed to be diplayed
// in local time by default.
// (2) By default, the input data string (e.g., '2011-01-02') should be displayed
// as its original time, without any time difference.

import * as zrUtil from 'zrender/src/core/util';
import * as numberUtil from '../util/number';
import * as formatUtil from '../util/format';
import * as scaleHelper from './helper';
import IntervalScale from './Interval';

var intervalScaleProto = IntervalScale.prototype;

var mathCeil = Math.ceil;
var mathFloor = Math.floor;
var ONE_SECOND = 1000;
var ONE_MINUTE = ONE_SECOND * 60;
var ONE_HOUR = ONE_MINUTE * 60;
var ONE_DAY = ONE_HOUR * 24;

// FIXME 公用？
var bisect = function (a, x, lo, hi) {
    while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (a[mid][1] < x) {
            lo = mid + 1;
        }
        else {
            hi = mid;
        }
    }
    return lo;
};

/**
 * @alias module:echarts/coord/scale/Time
 * @constructor
 */
var TimeScale = IntervalScale.extend({
    type: 'time',

    /**
     * @override
     */
    getLabel: function (val) {
        var stepLvl = this._stepLvl;

        var date = new Date(val);

        return formatUtil.formatTime(stepLvl[0], date, this.getSetting('useUTC'));
    },

    /**
     * @override
     */
    niceExtent: function (opt) {
        var extent = this._extent;
        // If extent start and end are same, expand them
        if (extent[0] === extent[1]) {
            // Expand extent
            extent[0] -= ONE_DAY;
            extent[1] += ONE_DAY;
        }
        // If there are no data and extent are [Infinity, -Infinity]
        if (extent[1] === -Infinity && extent[0] === Infinity) {
            var d = new Date();
            extent[1] = +new Date(d.getFullYear(), d.getMonth(), d.getDate());
            extent[0] = extent[1] - ONE_DAY;
        }

        this.niceTicks(opt.splitNumber, opt.minInterval, opt.maxInterval);

        // var extent = this._extent;
        var interval = this._interval;

        if (!opt.fixMin) {
            extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
        }
        if (!opt.fixMax) {
            extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
        }
    },

    /**
     * @override
     */
    niceTicks: function (approxTickNum, minInterval, maxInterval) {
        approxTickNum = approxTickNum || 10;

        var extent = this._extent;
        var span = extent[1] - extent[0];
        var approxInterval = span / approxTickNum;

        if (minInterval != null && approxInterval < minInterval) {
            approxInterval = minInterval;
        }
        if (maxInterval != null && approxInterval > maxInterval) {
            approxInterval = maxInterval;
        }

        var scaleLevelsLen = scaleLevels.length;
        var idx = bisect(scaleLevels, approxInterval, 0, scaleLevelsLen);

        var level = scaleLevels[Math.min(idx, scaleLevelsLen - 1)];
        var interval = level[1];
        // Same with interval scale if span is much larger than 1 year
        if (level[0] === 'year') {
            var yearSpan = span / interval;

            // From "Nice Numbers for Graph Labels" of Graphic Gems
            // var niceYearSpan = numberUtil.nice(yearSpan, false);
            var yearStep = numberUtil.nice(yearSpan / approxTickNum, true);

            interval *= yearStep;
        }

        var timezoneOffset = this.getSetting('useUTC')
            ? 0 : (new Date(+extent[0] || +extent[1])).getTimezoneOffset() * 60 * 1000;
        var niceExtent = [
            Math.round(mathCeil((extent[0] - timezoneOffset) / interval) * interval + timezoneOffset),
            Math.round(mathFloor((extent[1] - timezoneOffset) / interval) * interval + timezoneOffset)
        ];

        scaleHelper.fixExtent(niceExtent, extent);

        this._stepLvl = level;
        // Interval will be used in getTicks
        this._interval = interval;
        this._niceExtent = niceExtent;
    },

    parse: function (val) {
        // val might be float.
        return +numberUtil.parseDate(val);
    }
});

zrUtil.each(['contain', 'normalize'], function (methodName) {
    TimeScale.prototype[methodName] = function (val) {
        return intervalScaleProto[methodName].call(this, this.parse(val));
    };
});

// Steps from d3, see the license statement at the top of this file.
var scaleLevels = [
    // Format              interval
    ['hh:mm:ss', ONE_SECOND],          // 1s
    ['hh:mm:ss', ONE_SECOND * 5],      // 5s
    ['hh:mm:ss', ONE_SECOND * 10],     // 10s
    ['hh:mm:ss', ONE_SECOND * 15],     // 15s
    ['hh:mm:ss', ONE_SECOND * 30],     // 30s
    ['hh:mm\nMM-dd', ONE_MINUTE],      // 1m
    ['hh:mm\nMM-dd', ONE_MINUTE * 5],  // 5m
    ['hh:mm\nMM-dd', ONE_MINUTE * 10], // 10m
    ['hh:mm\nMM-dd', ONE_MINUTE * 15], // 15m
    ['hh:mm\nMM-dd', ONE_MINUTE * 30], // 30m
    ['hh:mm\nMM-dd', ONE_HOUR],        // 1h
    ['hh:mm\nMM-dd', ONE_HOUR * 2],    // 2h
    ['hh:mm\nMM-dd', ONE_HOUR * 6],    // 6h
    ['hh:mm\nMM-dd', ONE_HOUR * 12],   // 12h
    ['MM-dd\nyyyy', ONE_DAY],          // 1d
    ['MM-dd\nyyyy', ONE_DAY * 2],      // 2d
    ['MM-dd\nyyyy', ONE_DAY * 3],      // 3d
    ['MM-dd\nyyyy', ONE_DAY * 4],      // 4d
    ['MM-dd\nyyyy', ONE_DAY * 5],      // 5d
    ['MM-dd\nyyyy', ONE_DAY * 6],      // 6d
    ['week', ONE_DAY * 7],             // 7d
    ['MM-dd\nyyyy', ONE_DAY * 10],     // 10d
    ['week', ONE_DAY * 14],            // 2w
    ['week', ONE_DAY * 21],            // 3w
    ['month', ONE_DAY * 31],           // 1M
    ['week', ONE_DAY * 42],            // 6w
    ['month', ONE_DAY * 62],           // 2M
    ['week', ONE_DAY * 70],            // 10w
    ['quarter', ONE_DAY * 95],         // 3M
    ['month', ONE_DAY * 31 * 4],       // 4M
    ['month', ONE_DAY * 31 * 5],       // 5M
    ['half-year', ONE_DAY * 380 / 2],  // 6M
    ['month', ONE_DAY * 31 * 8],       // 8M
    ['month', ONE_DAY * 31 * 10],      // 10M
    ['year', ONE_DAY * 380]            // 1Y
];

/**
 * @param {module:echarts/model/Model}
 * @return {module:echarts/scale/Time}
 */
TimeScale.create = function (model) {
    return new TimeScale({useUTC: model.ecModel.get('useUTC')});
};

export default TimeScale;