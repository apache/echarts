/**
 * @file Calendar.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var layout = require('../../util/layout');
    var time = require('../../util/time');

    /**
     *  Calendar
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

        getAllWeek: function () {
            return this._allweeks;
        },

        getModel: function () {
            return this._model;
        },

        getRect: function () {
            return this._rect;
        },

        getswidth: function () {
            return this._swidth;
        },

        getsheight: function () {
            return this._sheight;
        },

        update: function (ecModel, api) {
            var calendarRect = layout.getLayoutRect(
                this._model.getBoxLayoutParams(),

                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._allweeks = time.getWdwByDays(this._model.option.range + '-12-31').weeks;
            this._rect = calendarRect;

            this._swidth = (this._rect.width - (this._allweeks - 1)) / this._allweeks;
            this._sheight = this._swidth;

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
            var obj = time.getWdwByDays(data[0]);

            // 获得年份
            var year = new Date(data[0]).getFullYear();

            // 如果数据年份 和设置范围不等 则返回空
            if (+this._model.option.range !== +year) {
                return [NaN, NaN];
            }

            return [
                (obj.weeks - 1) * (this._swidth) + this._rect.x + this._swidth / 2,
                obj.weekDay * (this._sheight) + this._rect.y + this._sheight / 2,
                data[1]
            ];
        },

        /**
         * Convert a time data(time, value) item to rect shape option.
         *
         * @override
         * @param  {string} data  data
         * @return {Object}      obj
         */
        pointToRectShape: function (data) {

            var point = this.dataToPoint(data);

            var shape = {
                x: point[0] - (this._swidth - this._lineWidth) / 2,
                y: point[1] - (this._sheight - this._lineWidth) / 2,
                width: this._swidth - this._lineWidth,
                height: this._sheight - this._lineWidth
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

            // 知道是第几周
            var week = (point[0] - this._rect.x) / (this._swidth) + 1;

            // 星期几
            var weekDay = (point[1] - this._rect.y) / (this._sheight);

            return new Date(time.getDateByWdw(this._model.option.range, week, weekDay));

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
