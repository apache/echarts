/**
 * @file Calendar.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var layout = require('../../util/layout');
    var calendarTime = require('../../util/time');

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

        getRangeInfo: function () {
            return this._rangeInfo;
        },

        getModel: function () {
            return this._model;
        },

        getRangeMonths: function () {
            var rs =  calendarTime.getMonthOfRange(this._rangeInfo.range);
            Array.prototype.push.apply(rs.months, this._rangeInfo.range);
            rs.num = rs.num + 2;
            return rs;
        },

        getRect: function () {
            return this._rect;
        },

        getswidth: function () {
            return this._sw;
        },

        getsheight: function () {
            return this._sh;
        },

        getOrient: function () {
            return this._orient;
        },

        handlerRangeOption: function () {
            this._range = this._model.get('range');

            var rg = this._range;

            if (/^\d{4}$/.test(rg)) {
                this._range = [rg + '-01-01', rg + '-12-31'];
            }

            if (/^\d{4}[\/|-]\d{1,2}$/.test(rg)) {
                var cur = calendarTime.getYMDInfo(rg);
                var days = calendarTime.getMonthDays(cur.m, cur.y);
                this._range = [cur.format, cur.y + '-' + cur.m + '-' + days];
            }

            if (/^\d{4}[\/|-]\d{1,2}[\/|-]\d{1,2}$/.test(rg)) {
                this._range = [rg, rg];
            }

            var tmp = calendarTime.getRangeInfo(this._range);

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

            this.handlerRangeOption();

            this._rangeInfo = calendarTime.getRangeInfo(this._range);

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
         * @return {string}       point
         */
        dataToPoint: function (data) {

            var dayInfo = calendarTime.getYMDInfo(data[0]);
            var range = this._rangeInfo.range;
            var date = dayInfo.format;

            // if not in range return [NaN, NaN]
            if (!calendarTime.isInRangeOfDate(date, range) && data[1] !== 'NONE') {
                return [NaN, NaN, data[1]];
            }

            var week = dayInfo.day;
            var nthWeek = calendarTime.getRangeInfo([range[0], date]).weeks;

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
         * @return {string}       data
         */
        pointToDate: function (point) {
            var nthX = Math.floor((point[0] - this._rect.x) / this._sw) + 1;
            var nthY = Math.floor((point[1] - this._rect.y) / this._sh) + 1;
            var range = this._rangeInfo.range;

            if (this._orient === 'vertical') {
                return calendarTime.getRangeDateOfWeek(nthY, nthX - 1, range);
            }

            return calendarTime.getRangeDateOfWeek(nthX, nthY - 1, range);
        },

        /**
         * Convert a time date item to (x, y) four point.
         *
         * @param  {string} date  date
         * @return {Object}       point
         */
        dateToPonitFour: function (date) {

            // use 'NONE' to making a distinction
            var point = this.dataToPoint([date, 'NONE']);

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
