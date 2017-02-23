/**
 * @file Calendar.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var layout = require('../../util/layout');
    var number = require('../../util/number');
    var zrUtil = require('zrender/core/util');

    // (24*60*60*1000)
    var ONE_DAY = 86400000;

    /**
     * Calendar
     *
     * @constructor
     */
    function Calendar(calendarModel, ecModel, api) {
        this._model = calendarModel;
    };

    Calendar.prototype = {

        constructor: Calendar,

        type: 'calendar',

        dimensions: ['time'],

        getHandledRangeInfo: function () {
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

            var tmp = this.getRangeInfo(range);

            if (tmp.start.time > tmp.end.time) {
                range.reverse();
            }

            return range;
        },

        update: function (ecModel, api) {
            var calendarRect = layout.getLayoutRect(
                this._model.getBoxLayoutParams(),

                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._rect = calendarRect;

            this._firstDayOfWeek = this._model.getModel('dayLabel').get('firstDay');

            this._rangeInfo = this.getRangeInfo(this._initRangeOption());

            var size = this._model.get('cellSize');

            if (zrUtil.isArray(size)) {
                this._sw = size[0];
                this._sh = size[1] || this._sw;
            }
            else {
                this._sw = size;
                this._sh = this._sw;
            }


            this._orient = this._model.get('orient');
            this._lineWidth = this._model.getModel('itemStyle.normal').getItemStyle().lineWidth || 0;
        },


        /**
         * Convert a time data(time, value) item to (x, y) point.
         *
         * @override
         * @param  {Array} data  data
         * @param  {boolean} noClip  out of range
         * @return {Array}       point
         */
        dataToPoint: function (data, noClip) {

            var dayInfo = this.getDateInfo(data[0]);
            var range = this._rangeInfo.range;
            var date = dayInfo.formatedDate;

            // if not in range return [NaN, NaN]
            if (!noClip && !this.isInRangeOfDate(date, range)) {
                return [NaN, NaN];
            }

            var week = dayInfo.day;
            var nthWeek = this.getRangeInfo([range[0], date]).weeks;

            if (this._orient === 'vertical') {
                return [
                    this._rect.x + week * this._sw + this._sw / 2,
                    this._rect.y + (nthWeek - 1) * this._sh + this._sh / 2
                ];

            }

            return [
                this._rect.x + (nthWeek - 1) * this._sw + this._sw / 2,
                this._rect.y + week * this._sh + this._sh / 2
            ];

        },

        /**
         * Convert a time date item to (x, y) four point.
         *
         * @param  {Array} data  date[0] is date
         * @param  {boolean} noClip  out of range
         * @return {Object}       point
         */
        dataToRect: function (data, noClip) {

            var point = this.dataToPoint(data, noClip);

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
         * Convert a (x, y) point to time data
         *
         * @param  {string} point point
         * @return {string}       data
         */
        pointToData: function (point) {

            var date = this.pointToDate(point);

            return date && date.time;
        },

        /**
         * Convert a (x, y) point to time date
         *
         * @param  {string} point point
         * @return {Object}       date
         */
        pointToDate: function (point) {
            var nthX = Math.floor((point[0] - this._rect.x) / this._sw) + 1;
            var nthY = Math.floor((point[1] - this._rect.y) / this._sh) + 1;
            var range = this._rangeInfo.range;

            if (this._orient === 'vertical') {
                return this.getDateByWeeksAndDay(nthY, nthX - 1, range);
            }

            return this.getDateByWeeksAndDay(nthX, nthY - 1, range);
        },

        /**
         * range info
         *
         * @param  {Array} range range ['2017-01-01', '2017-07-08']
         * @return {Object}       obj
         */
        getRangeInfo: function (range) {

            var start = this.getDateInfo(range[0]);
            var end = this.getDateInfo(range[1]);

            var allDay = Math.floor(end.time / ONE_DAY) - Math.floor(start.time / ONE_DAY) + 1;

            var weeks = Math.floor((allDay + start.day + 6) / 7);

            return {
                range: [start.formatedDate, end.formatedDate],
                start: start,
                end: end,
                allDay: allDay,
                weeks: weeks,
                fweek: start.day,
                lweek: end.day
            };
        },

        /**
         * get date by nthWeeks and week day in range
         *
         * @param  {number} nthWeek the week
         * @param  {number} day   the week day
         * @param  {Array} range [d1, d2]
         * @return {string}         'YYYY-MM-DD'
         */
        getDateByWeeksAndDay: function (nthWeek, day, range) {
            var rangeInfo = this.getRangeInfo(range);

            if (nthWeek > rangeInfo.weeks
                || (nthWeek === 0 && day < rangeInfo.fweek)
                || (nthWeek === rangeInfo.weeks && day > rangeInfo.lweek)
            ) {
                return false;
            }

            var nthDay = (nthWeek - 1) * 7 - rangeInfo.fweek + day;

            var time = this.getDateInfo(rangeInfo.range[0]).time + nthDay * ONE_DAY;

            return this.getDateInfo(time);

        },

        /**
         * judge the date within range
         *
         * @param  {string|number}  date  date
         * @param  {Array} range [d1, d2]
         * @return {Boolean}       true | false
         */
        isInRangeOfDate: function (date, range) {
            var start = this.getDateInfo(range[0]).time;
            var end = this.getDateInfo(range[1]).time;
            var cur = this.getDateInfo(date).time;

            if (cur >= start && cur <= end) {
                return true;
            }

            return false;
        },

        /**
         * get date info
         *
         * @param  {string|number} date date
         * @return {Object}      info
         */
        getDateInfo: function (date) {

            date = number.parseDate(date);

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

            var time = this.getDateInfo(date).time;

            return this.getDateInfo(time + ONE_DAY * n);
        }
    };
    Calendar.dimensions =  Calendar.prototype.dimensions,
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


    require('../../CoordinateSystem').register('calendar', Calendar);

    return Calendar;
});
