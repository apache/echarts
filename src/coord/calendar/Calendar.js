/**
 * @file Calendar.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var graphic = require('../../util/graphic');
    var layout = require('../../util/layout');

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

            this._rect = calendarRect;

            this._swidth = (this._rect.width - 52) / 53;
            this._sheight = this._swidth;
        },


        /**
         * Convert a time data(time, value) item to (x, y) point.
         *
         * @override
         * @param  {string} data  data
         * @return {string}       point
         */
        dataToPoint: function (data) {
            var self = this;
            var obj = {};
            obj = self._days(data[0]);

            return [
                (obj.weeks - 1) * (this._swidth) + this._rect.x + this._swidth / 2,
                obj.weekDay * (this._sheight) + this._rect.y + this._sheight / 2,
                data[1]
            ];
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

            return new Date(this._getDate(week, weekDay));

        },

        /**
         * 一天是某年的第几周第几天星期几
         *
         * @private
         * @param  {number} date 具体日期(年-月-日)
         * @return {Object}      {}
         */
        _days: function (date) {

            // 获得年份
            var year = new Date(date).getFullYear();
            var month = new Date(date).getMonth() + 1;
            var day = new Date(date).getDate();

            // 表示改日期为当年的第几天
            var days = 0;

            // 累加月天数
            for (var i = 1; i < month; i++) {

                switch (i) {

                    // 大月的情况加31
                    case 1:
                    case 3:
                    case 5:
                    case 7:
                    case 8:
                    case 10:
                    case 12: {
                        days += 31;
                        break;
                    }

                    // 小月的情况加30
                    case 4:
                    case 6:
                    case 9:
                    case 11: {
                        days += 30;
                        break;
                    }

                    // 二月的情况，根据年类型来加
                    case 2: {
                        if (this._isLeapYear(year)) {
                            // 闰年加29
                            days += 29;
                        }
                        else {
                            days += 28;
                        }
                        break;
                    }
                }
            }

            day = day * 1;

            // 月天数之和加上日天数
            days += day;

            // 当年的第一天是周几
            var date0 = new Date(year, 0, 1);

            // 将日期值格式化,0-11代表1月-12月;
            var date1 = new Date(year, month - 1, day);

            // 向下取整
            var nthOfWeek = Math.floor((days + date0.getDay() + 6) / 7);

            return {

                // 第几天
                days: days,

                // 第几周
                weeks: nthOfWeek,

                // 星期几
                weekDay: date1.getDay()
            };
        },

        /**
         * 知道年份  第几周 和  星期几 获取日期
         *
         * @private
         * @param  {number} period 第几周
         * @param  {number} week   星期几
         * @return {string}        日期
         */
        _getDate: function (period, week) {

            if (/^([1-4]?\d|5[123])$/.test(period) && /^[0-6]$/.test(week)) {
                var year = this._model.option.range;
                var ymd = new Date(year, 0, 1);
                ymd.setDate(1 + (period - 1) * 7 - ymd.getDay() + week);

                var mouth = ymd.getMonth() + 1;

                mouth = mouth < 10 ? '0' + mouth : mouth;
                var day = ymd.getDate();

                day = day < 10 ? '0' + day : day;

                return year + '-' + mouth + '-' + day;
            }

            console.log('参数错误:第', period, '周，星期', week);

        },

        /**
         * 是不是闰年
         *
         * @private
         * @param  {number}  year 年份
         * @return {boolean}      是否是闰年
         */
        _isLeapYear: function (year) {

            // 条件1：年份必须要能被4整除
            var cond1 = year % 4 === 0;

            // 条件2：年份不能是整百数
            var cond2 = year % 100 !== 0;

            // 条件3：年份是400的倍数
            var cond3 = year % 400 === 0;

            // 当条件1和条件2同时成立时，就肯定是闰年，所以条件1和条件2之间为“与”的关系。
            // 如果条件1和条件2不能同时成立，但如果条件3能成立，则仍然是闰年。所以条件3与前2项为“或”的关系。
            // 所以得出判断闰年的表达式：
            var cond = cond1 && cond2 || cond3;

            return !!cond;
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
