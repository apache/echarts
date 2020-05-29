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
import * as layout from '../../util/layout';
import * as numberUtil from '../../util/number';
import CoordinateSystem from '../../CoordinateSystem';

// (24*60*60*1000)
var PROXIMATE_ONE_DAY = 86400000;

/**
 * Calendar
 *
 * @constructor
 *
 * @param {Object} calendarModel calendarModel
 * @param {Object} ecModel       ecModel
 * @param {Object} api           api
 */
function Calendar(calendarModel, ecModel, api) {
    this._model = calendarModel;
}

Calendar.prototype = {

    constructor: Calendar,

    type: 'calendar',

    dimensions: ['time', 'value'],

    // Required in createListFromData
    getDimensionsInfo: function () {
        return [{name: 'time', type: 'time'}, 'value'];
    },

    getRangeInfo: function () {
        return this._rangeInfo;
    },

    getModel: function () {
        return this._model;
    },

    getRect: function () {
        return this._rect;
    },

    getCellWidth: function () {
        return this._sw;
    },

    getCellHeight: function () {
        return this._sh;
    },

    getOrient: function () {
        return this._orient;
    },

    /**
     * getFirstDayOfWeek
     *
     * @example
     *     0 : start at Sunday
     *     1 : start at Monday
     *
     * @return {number}
     */
    getFirstDayOfWeek: function () {
        return this._firstDayOfWeek;
    },

    /**
     * get date info
     *
     * @param  {string|number} date date
     * @return {Object}
     * {
     *      y: string, local full year, eg., '1940',
     *      m: string, local month, from '01' ot '12',
     *      d: string, local date, from '01' to '31' (if exists),
     *      day: It is not date.getDay(). It is the location of the cell in a week, from 0 to 6,
     *      time: timestamp,
     *      formatedDate: string, yyyy-MM-dd,
     *      date: original date object.
     * }
     */
    getDateInfo: function (date) {

        date = numberUtil.parseDate(date);

        var y = date.getFullYear();

        var m = date.getMonth() + 1;
        m = m < 10 ? '0' + m : m;

        var d = date.getDate();
        d = d < 10 ? '0' + d : d;

        var day = date.getDay();

        day = Math.abs((day + 7 - this.getFirstDayOfWeek()) % 7);

        return {
            y: y,
            m: m,
            d: d,
            day: day,
            time: date.getTime(),
            formatedDate: y + '-' + m + '-' + d,
            date: date
        };
    },

    getNextNDay: function (date, n) {
        n = n || 0;
        if (n === 0) {
            return this.getDateInfo(date);
        }

        date = new Date(this.getDateInfo(date).time);
        date.setDate(date.getDate() + n);

        return this.getDateInfo(date);
    },

    update: function (ecModel, api) {

        this._firstDayOfWeek = +this._model.getModel('dayLabel').get('firstDay');
        this._orient = this._model.get('orient');
        this._lineWidth = this._model.getModel('itemStyle').getItemStyle().lineWidth || 0;


        this._rangeInfo = this._getRangeInfo(this._initRangeOption());
        var weeks = this._rangeInfo.weeks || 1;
        var whNames = ['width', 'height'];
        var cellSize = this._model.get('cellSize').slice();
        var layoutParams = this._model.getBoxLayoutParams();
        var cellNumbers = this._orient === 'horizontal' ? [weeks, 7] : [7, weeks];

        zrUtil.each([0, 1], function (idx) {
            if (cellSizeSpecified(cellSize, idx)) {
                layoutParams[whNames[idx]] = cellSize[idx] * cellNumbers[idx];
            }
        });

        var whGlobal = {
            width: api.getWidth(),
            height: api.getHeight()
        };
        var calendarRect = this._rect = layout.getLayoutRect(layoutParams, whGlobal);

        zrUtil.each([0, 1], function (idx) {
            if (!cellSizeSpecified(cellSize, idx)) {
                cellSize[idx] = calendarRect[whNames[idx]] / cellNumbers[idx];
            }
        });

        function cellSizeSpecified(cellSize, idx) {
            return cellSize[idx] != null && cellSize[idx] !== 'auto';
        }

        this._sw = cellSize[0];
        this._sh = cellSize[1];
    },


    /**
     * Convert a time data(time, value) item to (x, y) point.
     *
     * @override
     * @param  {Array|number} data data
     * @param  {boolean} [clamp=true] out of range
     * @return {Array} point
     */
    dataToPoint: function (data, clamp) {
        zrUtil.isArray(data) && (data = data[0]);
        clamp == null && (clamp = true);

        var dayInfo = this.getDateInfo(data);
        var range = this._rangeInfo;
        var date = dayInfo.formatedDate;

        // if not in range return [NaN, NaN]
        if (clamp && !(
            dayInfo.time >= range.start.time
            && dayInfo.time < range.end.time + PROXIMATE_ONE_DAY
        )) {
            return [NaN, NaN];
        }

        var week = dayInfo.day;
        var nthWeek = this._getRangeInfo([range.start.time, date]).nthWeek;

        if (this._orient === 'vertical') {
            return [
                this._rect.x + week * this._sw + this._sw / 2,
                this._rect.y + nthWeek * this._sh + this._sh / 2
            ];

        }

        return [
            this._rect.x + nthWeek * this._sw + this._sw / 2,
            this._rect.y + week * this._sh + this._sh / 2
        ];

    },

    /**
     * Convert a (x, y) point to time data
     *
     * @override
     * @param  {string} point point
     * @return {string}       data
     */
    pointToData: function (point) {

        var date = this.pointToDate(point);

        return date && date.time;
    },

    /**
     * Convert a time date item to (x, y) four point.
     *
     * @param  {Array} data  date[0] is date
     * @param  {boolean} [clamp=true]  out of range
     * @return {Object}       point
     */
    dataToRect: function (data, clamp) {
        var point = this.dataToPoint(data, clamp);

        return {
            contentShape: {
                x: point[0] - (this._sw - this._lineWidth) / 2,
                y: point[1] - (this._sh - this._lineWidth) / 2,
                width: this._sw - this._lineWidth,
                height: this._sh - this._lineWidth
            },

            center: point,

            tl: [
                point[0] - this._sw / 2,
                point[1] - this._sh / 2
            ],

            tr: [
                point[0] + this._sw / 2,
                point[1] - this._sh / 2
            ],

            br: [
                point[0] + this._sw / 2,
                point[1] + this._sh / 2
            ],

            bl: [
                point[0] - this._sw / 2,
                point[1] + this._sh / 2
            ]

        };
    },

    /**
     * Convert a (x, y) point to time date
     *
     * @param  {Array} point point
     * @return {Object}       date
     */
    pointToDate: function (point) {
        var nthX = Math.floor((point[0] - this._rect.x) / this._sw) + 1;
        var nthY = Math.floor((point[1] - this._rect.y) / this._sh) + 1;
        var range = this._rangeInfo.range;

        if (this._orient === 'vertical') {
            return this._getDateByWeeksAndDay(nthY, nthX - 1, range);
        }

        return this._getDateByWeeksAndDay(nthX, nthY - 1, range);
    },

    /**
     * @inheritDoc
     */
    convertToPixel: zrUtil.curry(doConvert, 'dataToPoint'),

    /**
     * @inheritDoc
     */
    convertFromPixel: zrUtil.curry(doConvert, 'pointToData'),

    /**
     * initRange
     *
     * @private
     * @return {Array} [start, end]
     */
    _initRangeOption: function () {
        var range = this._model.get('range');

        var rg = range;

        if (zrUtil.isArray(rg) && rg.length === 1) {
            rg = rg[0];
        }

        if (/^\d{4}$/.test(rg)) {
            range = [rg + '-01-01', rg + '-12-31'];
        }

        if (/^\d{4}[\/|-]\d{1,2}$/.test(rg)) {

            var start = this.getDateInfo(rg);
            var firstDay = start.date;
            firstDay.setMonth(firstDay.getMonth() + 1);

            var end = this.getNextNDay(firstDay, -1);
            range = [start.formatedDate, end.formatedDate];
        }

        if (/^\d{4}[\/|-]\d{1,2}[\/|-]\d{1,2}$/.test(rg)) {
            range = [rg, rg];
        }

        var tmp = this._getRangeInfo(range);

        if (tmp.start.time > tmp.end.time) {
            range.reverse();
        }

        return range;
    },

    /**
     * range info
     *
     * @private
     * @param  {Array} range range ['2017-01-01', '2017-07-08']
     *  If range[0] > range[1], they will not be reversed.
     * @return {Object}       obj
     */
    _getRangeInfo: function (range) {
        range = [
            this.getDateInfo(range[0]),
            this.getDateInfo(range[1])
        ];

        var reversed;
        if (range[0].time > range[1].time) {
            reversed = true;
            range.reverse();
        }

        var allDay = Math.floor(range[1].time / PROXIMATE_ONE_DAY)
            - Math.floor(range[0].time / PROXIMATE_ONE_DAY) + 1;

        // Consider case1 (#11677 #10430):
        // Set the system timezone as "UK", set the range to `['2016-07-01', '2016-12-31']`

        // Consider case2:
        // Firstly set system timezone as "Time Zone: America/Toronto",
        // ```
        // var first = new Date(1478412000000 - 3600 * 1000 * 2.5);
        // var second = new Date(1478412000000);
        // var allDays = Math.floor(second / ONE_DAY) - Math.floor(first / ONE_DAY) + 1;
        // ```
        // will get wrong result because of DST. So we should fix it.
        var date = new Date(range[0].time);
        var startDateNum = date.getDate();
        var endDateNum = range[1].date.getDate();
        date.setDate(startDateNum + allDay - 1);
        // The bias can not over a month, so just compare date.
        var dateNum = date.getDate();
        if (dateNum !== endDateNum) {
            var sign = date.getTime() - range[1].time > 0 ? 1 : -1;
            while (
                (dateNum = date.getDate()) !== endDateNum
                && (date.getTime() - range[1].time) * sign > 0
            ) {
                allDay -= sign;
                date.setDate(dateNum - sign);
            }
        }

        var weeks = Math.floor((allDay + range[0].day + 6) / 7);
        var nthWeek = reversed ? -weeks + 1 : weeks - 1;

        reversed && range.reverse();

        return {
            range: [range[0].formatedDate, range[1].formatedDate],
            start: range[0],
            end: range[1],
            allDay: allDay,
            weeks: weeks,
            // From 0.
            nthWeek: nthWeek,
            fweek: range[0].day,
            lweek: range[1].day
        };
    },

    /**
     * get date by nthWeeks and week day in range
     *
     * @private
     * @param  {number} nthWeek the week
     * @param  {number} day   the week day
     * @param  {Array} range [d1, d2]
     * @return {Object}
     */
    _getDateByWeeksAndDay: function (nthWeek, day, range) {
        var rangeInfo = this._getRangeInfo(range);

        if (nthWeek > rangeInfo.weeks
            || (nthWeek === 0 && day < rangeInfo.fweek)
            || (nthWeek === rangeInfo.weeks && day > rangeInfo.lweek)
        ) {
            return false;
        }

        var nthDay = (nthWeek - 1) * 7 - rangeInfo.fweek + day;
        var date = new Date(rangeInfo.start.time);
        date.setDate(rangeInfo.start.d + nthDay);

        return this.getDateInfo(date);
    }
};

Calendar.dimensions = Calendar.prototype.dimensions;

Calendar.getDimensionsInfo = Calendar.prototype.getDimensionsInfo;

Calendar.create = function (ecModel, api) {
    var calendarList = [];

    ecModel.eachComponent('calendar', function (calendarModel) {
        var calendar = new Calendar(calendarModel, ecModel, api);
        calendarList.push(calendar);
        calendarModel.coordinateSystem = calendar;
    });

    ecModel.eachSeries(function (calendarSeries) {
        if (calendarSeries.get('coordinateSystem') === 'calendar') {
            // Inject coordinate system
            calendarSeries.coordinateSystem = calendarList[calendarSeries.get('calendarIndex') || 0];
        }
    });
    return calendarList;
};

function doConvert(methodName, ecModel, finder, value) {
    var calendarModel = finder.calendarModel;
    var seriesModel = finder.seriesModel;

    var coordSys = calendarModel
        ? calendarModel.coordinateSystem
        : seriesModel
        ? seriesModel.coordinateSystem
        : null;

    return coordSys === this ? coordSys[methodName](value) : null;
}

CoordinateSystem.register('calendar', Calendar);

export default Calendar;
