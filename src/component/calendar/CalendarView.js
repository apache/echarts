/**
 * @file CalendarView.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var graphic = require('../../util/graphic');

    return require('../../echarts').extendComponentView({

        type: 'calendar',

        render: function (calendarModel, ecModel, api) {

            var self = this;
            var group = self.group;

            group.removeAll();

            var wrapRect =  calendarModel.coordinateSystem.getRect();
            var width =  calendarModel.coordinateSystem.getswidth();
            var height =  width;

            var year = calendarModel.option.range;
            var fweek = self._days(year).weekDay;
            var lweek = self._days(year + '-12-31').weekDay;

            var WEEK = ['Sun', 'Sat', 'Fri', 'Thu', 'Wed', 'Tue', 'Mon'];
            var MOUTH = [
                            'Jan', 'Feb', 'Mar',
                            'Apr', 'May', 'June',
                            'Jul', 'Aug', 'Sep',
                            'Oc', 'Nov', 'Dec'
                        ];

            var yearText = new graphic.Text({
                style: {
                    text: year,
                    x: wrapRect.x - width / 2,
                    y: wrapRect.y,
                    textAlign: 'right',
                    textVerticalAlign: 'bottom',
                    font: 'bolder 1em "Microsoft YaHei", sans-serif'
                }
            });
            group.add(yearText);

            // 月坐标
            for (var i = 0; i < 12; i++) {
                var w = self._days(year + '-' + (i + 1) + '-1').weeks - 1;
                var mouthText = new graphic.Text({
                    style: {
                        text: MOUTH[i],
                        x: w * width + wrapRect.x,
                        y: wrapRect.y,
                        textVerticalAlign: 'bottom'
                    }
                });
                group.add(mouthText);
            }

            for (var i = 0; i < 53; i++) {

                for (var j = 0; j < 7; j++) {

                    // 第一列 星期坐标
                    if (i === 0) {
                        var y = j * height + wrapRect.y + height;
                        var weekText = new graphic.Text({
                            style: {
                                text: WEEK[j],
                                x: wrapRect.x - width / 2,
                                y: y,
                                textAlign: 'right'
                            }
                        });
                        group.add(weekText);
                    }

                    if ((i === 0 && j < fweek) || (i === 52 && j > lweek)) {
                        continue;
                    }

                    if (j === 0) {
                        var tickLine = new graphic.Line({
                            z: 100,
                            shape: {
                                x1: i * width + wrapRect.x,
                                y1: j * height + wrapRect.y,
                                x2: i * width + wrapRect.x + width,
                                y2: j * height + wrapRect.y
                            },
                            silent: true,
                            style: {
                                fill: '#B03A5B',
                                stroke: '#000'
                            }
                        });

                        group.add(tickLine);
                    }

                    if (j === 6) {
                        var tickLine = new graphic.Line({
                            z: 100,
                            shape: {
                                x1: i * width + wrapRect.x,
                                y1: j * height + wrapRect.y + height,
                                x2: i * width + wrapRect.x + width,
                                y2: j * height + wrapRect.y + height
                            },
                            silent: true,
                            style: {
                                fill: '#B03A5B',
                                stroke: '#000'
                            }
                        });

                        group.add(tickLine);
                    }

                    tickLine = new graphic.Line({
                        shape: {
                            x1: 100,
                            y1: 100,
                            x2: 600,
                            y2: 600
                        },
                        silent: true,
                        style: {
                            fill: '#B03A5B',
                            stroke: '#000'
                        }
                    });
                    group.add(tickLine);

                    // 小方格
                    group.add(self._renderRect(
                        i, j,
                        width, height,
                        {
                            x: wrapRect.x,
                            y: wrapRect.y
                        }
                    ));
                }
            }
        },

        /**
         * render small rect
         *
         * @private
         * @param  {number} i       数值i
         * @param  {number} j       数值j
         * @param  {number} width   宽度
         * @param  {number} height  高度
         * @param  {Object} offset  偏移配置
         * @param  {string} color   颜色
         * @param  {number} opacity 透明度
         * @return {Object}         {}
         */
        _renderRect: function (i, j, width, height, offset, bgcolor, bordercolor, opacity) {

            return new graphic.Rect({
                shape: {
                    x: i * width + offset.x,
                    y: j * height + offset.y,
                    width: width,
                    height: height
                },
                style: {
                    fill: bgcolor || '#fff',
                    stroke: bordercolor || '#ccc',
                    opacity: opacity || 1
                }
            });
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

    });
});
