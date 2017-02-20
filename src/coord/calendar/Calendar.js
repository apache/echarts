/**
 * @file Calendar.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var layout = require('../../util/layout');
    var number = require('../../util/number');

    // (24*60*60*1000)
    var ONEDAY = 86400000;

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

        getFirstDayWeek: function () {
            return this._firstDayWeek;
        },

        handlerRangeOption: function () {
            this._range = this._model.get('range');

            var rg = this._range;

            if (/^\d{4}$/.test(rg)) {
                this._range = [rg + '-01-01', rg + '-12-31'];
            }

            if (/^\d{4}[\/|-]\d{1,2}$/.test(rg)) {

                var start = this.getYMDInfo(rg);
                var firstDay = start.date;
                firstDay.setMonth(firstDay.getMonth() + 1);

                var end = this.getNextNDay(firstDay, -1);
                this._range = [start.format, end.format];
            }

            if (/^\d{4}[\/|-]\d{1,2}[\/|-]\d{1,2}$/.test(rg)) {
                this._range = [rg, rg];
            }

            var tmp = this.getRangeInfo(this._range);

            if (tmp.start.time > tmp.end.time) {
                this._range.reverse();
            }
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

            this._firstDayWeek = this._model.getModel('dayLabel').get('firstDay');

            this.handlerRangeOption();

            this._rangeInfo = this.getRangeInfo(this._range);

            this._sw = this._model.get('cellSize');

            this._sh = this._sw;

            this._orient = this._model.get('orient');

            this._lineWidth = this._model.getModel('itemStyle.normal').getItemStyle().lineWidth || 1;
        },


        /**
         * Convert a time data(time, value) item to (x, y) point.
         *
         * @override
         * @param  {string} data  data
         * @param  {string} noClip  out of range
         * @return {string}       point
         */
        dataToPoint: function (data, noClip) {

            var dayInfo = this.getYMDInfo(data[0]);
            var range = this._rangeInfo.range;
            var date = dayInfo.format;

            // if not in range return [NaN, NaN]
            if (!noClip && !this.isInRangeOfDate(date, range)) {
                return [NaN, NaN, data[1]];
            }

            var week = dayInfo.day;
            var nthWeek = this.getRangeInfo([range[0], date]).weeks;

            if (this._orient === 'vertical') {
                return [
                    this._rect.x + week * this._sw + this._sw / 2,
                    this._rect.y + (nthWeek - 1) * this._sh + this._sh / 2,
                    data[1]
                ];

            }

            return [
                this._rect.x + (nthWeek - 1) * this._sw + this._sw / 2,
                this._rect.y + week * this._sh + this._sh / 2,
                data[1]
            ];

        },

        /**
         * Convert a time data(time, value) item to rect shape option.
         *
         * @param  {string} data  data
         * @return {Object}      obj
         */
        dataToRectShape: function (data) {

            var point = this.dataToPoint(data);

            var shape = {
                x: point[0] - (this._sw - this._lineWidth) / 2,
                y: point[1] - (this._sh - this._lineWidth) / 2,
                width: this._sw - this._lineWidth,
                height: this._sh - this._lineWidth
            };

            return shape;
        },

        /**
         * Convert a (x, y) point to time data
         *
         * @param  {string} point point
         * @return {string}       data
         */
        pointToData: function (point) {

            var date = this.pointToDate(point);

            return date && date.format;
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
                return this.getRangeDateOfWeek(nthY, nthX - 1, range);
            }

            return this.getRangeDateOfWeek(nthX, nthY - 1, range);
        },

        /**
         * Convert a time date item to (x, y) four point.
         *
         * @param  {string} date  date
         * @return {Object}       point
         */
        dateToPonitFour: function (date) {

            var point = this.dataToPoint([date, 0], true);

            return {

                CENTER: point,

                TL: [
                    point[0] - this._sw / 2,
                    point[1] - this._sh / 2
                ],

                TR: [
                    point[0] + this._sw / 2,
                    point[1] - this._sh / 2
                ],

                BR: [
                    point[0] + this._sw / 2,
                    point[1] + this._sh / 2
                ],

                BL: [
                    point[0] - this._sw / 2,
                    point[1] + this._sh / 2
                ]

            };
        },
        /**
         * range info
         *
         * @param  {Array} range range ['2017-01-01', '2017-07-08']
         * @return {Object}       obj
         */
        getRangeInfo: function (range) {

            var start = this.getYMDInfo(range[0]);
            var end = this.getYMDInfo(range[1]);

            var allDay = Math.floor(end.time / ONEDAY) - Math.floor(start.time / ONEDAY) + 1;

            var weeks = Math.floor((allDay + start.day + 6) / 7);

            return {
                range: [start.format, end.format],
                start: start,
                end: end,
                allDay: allDay,
                weeks: weeks,
                fweek: start.day,
                lweek: end.day
            };
        },

        /**
         * According to nthWeeks and week day  get date
         *
         * @param  {number} nthWeek the week
         * @param  {[number]} day   the week day
         * @param  {Array} range [d1, d2]
         * @return {string}         'YYYY-MM-DD'
         */
        getRangeDateOfWeek: function (nthWeek, day, range) {
            var rangeInfo = this.getRangeInfo(range);

            if (nthWeek > rangeInfo.weeks
                || (nthWeek === 0 && day < rangeInfo.fweek)
                || (nthWeek === rangeInfo.weeks && day > rangeInfo.lweek)) {
                return false;
            }

            var nthDay = (nthWeek - 1) * 7 - rangeInfo.fweek + day;

            var time = this.getYMDInfo(rangeInfo.range[0]).time + nthDay * ONEDAY;

            return this.getYMDInfo(time);

        },

        /**
         * judge the date within range
         *
         * @param  {string|number}  date  date
         * @param  {Array} range [d1, d2]
         * @return {Boolean}       true | false
         */
        isInRangeOfDate: function (date, range) {
            var start = this.getYMDInfo(range[0]).time;
            var end = this.getYMDInfo(range[1]).time;
            var cur = this.getYMDInfo(date).time;

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
        getYMDInfo: function (date) {

            date = number.parseDate(date);

            var y = date.getFullYear();

            var m = date.getMonth() + 1;
            m = m < 10 ? '0' + m : m;

            var d = date.getDate();
            d = d < 10 ? '0' + d : d;

            var day = date.getDay();

            day = Math.abs((day + 7 - this._firstDayWeek) % 7);

            var time = date.getTime();

            var format = y + '-' + m + '-' + d;

            return {
                y: y,
                m: +m,
                d: +d,
                day: day,
                time: time,
                format: format,
                date: date
            };
        },

        getNextNDay: function (date, n) {
            n = n || 0;
            if (n === 0) {
                return this.getYMDInfo(date);
            }

            var time = this.getYMDInfo(date).time;

            return this.getYMDInfo(time + ONEDAY * n);
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
