/**
 * @file CalendarView.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var graphic = require('../../util/graphic');
    var time = require('../../util/time');

    return require('../../echarts').extendComponentView({

        type: 'calendar',

        render: function (calendarModel, ecModel, api) {

            var self = this;
            var group = self.group;
            group.removeAll();

            // 当前年所有周数
            var rangeData = this._handlerRangeData(calendarModel);

            var coordSys = calendarModel.coordinateSystem;
            var lineStyleModel = calendarModel.getModel('lineStyle').getLineStyle();

            var infoData = {
                wrapRect: coordSys.getRect(),
                width: coordSys.getswidth(),
                height: coordSys.getsheight(),

                // 分隔线
                lineWidth: lineStyleModel.lineWidth / 2 || 0
            };


            this._renderDayRect(calendarModel, rangeData, infoData, group);

            this._renderLines(calendarModel, rangeData, infoData, lineStyleModel, group);

            this._renderYearText(calendarModel, rangeData, infoData, group);

            this._renderMouthText(calendarModel, rangeData, infoData, group);

            this._renderWeekText(calendarModel, infoData, group);
        },

        // 获取range中的数据信息
        _handlerRangeData: function (calendarModel) {
            var curYear = calendarModel.get('range');
            // range 2015
            // range 2015-1
            // range [2015-01, 2015-12]
            // rqnge [2015-11, 2016-03]
            return {
                year: curYear,
                fweek: new Date(curYear + '').getDay(),
                lweek: new Date(curYear + '-12-31').getDay(),
                allweeks: time.getWdwByDays(curYear + '-12-31').weeks
            };
        },

        // 绘制日网格
        _renderDayRect: function (calendarModel, rangeData, infoData, group) {

            var me = this;
            var allweeks = rangeData.allweeks;
            var fweek = rangeData.fweek;
            var lweek = rangeData.lweek;
            var rect;

            var itemRectStyleModel = calendarModel.getModel('itemStyle.normal').getItemStyle();

            for (var i = 0; i < allweeks; i++) {

                for (var j = 0; j < 7; j++) {

                    if ((i === 0 && j < fweek) || (i === allweeks - 1 && j > lweek)) {
                        continue;
                    }

                    // 每个方格
                    rect = new graphic.Rect({
                        shape: {
                            x: i * infoData.width + infoData.wrapRect.x,
                            y: j * infoData.height + infoData.wrapRect.y,
                            width: infoData.width,
                            height: infoData.height
                        },
                        style: itemRectStyleModel
                    });

                    group.add(rect);

                }
            }
        },

        // 绘制分隔线
        _renderLines: function (calendarModel, rangeData, infoData, lineStyleModel, group) {
            var year = rangeData.year;
            var width = infoData.width;
            var height = infoData.height;
            var wx = infoData.wrapRect.x;
            var wy = infoData.wrapRect.y;

            // 月分隔线
            for (var i = 0; i < 12; i++) {

                // 当前年每月第一天
                var yd = year + '-' + (i + 1) + '-1';
                var info = time.getWdwByDays(yd);

                var w = info.weeks - 1;
                var d = info.weekDay;

                this._renderMouthLine(
                    w, d,
                    lineStyleModel,
                    infoData,
                    group
                );
            }

            // ---- 12月最后一栏 ----
            var info12 = time.getWdwByDays(year + '-12-31');
            var w12 = info12.weeks - 1;
            var d12 = info12.weekDay + 1;

            if (d12 === 7) {
                // 竖线
                var tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: wx + (w12 + 1) * width,
                        y1: wy,
                        x2: wx + (w12 + 1) * width,
                        y2: wy + d12 * height
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);
            }
            else {
                this._renderMouthLine(
                    w12, d12,
                    lineStyleModel,
                    infoData,
                    group
                );
            }

            // ---- 12月最后一栏 end ----


            var firstx = rangeData.fweek > 0 ? 1 : 0;

            // 上横线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: wx + firstx * width - infoData.lineWidth,
                    y1: wy,
                    x2: wx + rangeData.allweeks * width + infoData.lineWidth,
                    y2: wy
                },

                style: lineStyleModel
            });

            group.add(tickLine);


            var lastx = d12 === 7 ? (w12 + 1) : w12;

            // 下横线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: wx - infoData.lineWidth,
                    y1: wy + 7 * height,
                    x2: wx + lastx * width + infoData.lineWidth,
                    y2: wy + 7 * height
                },

                style: lineStyleModel
            });

            group.add(tickLine);
        },

        // 绘制月分隔线
        _renderMouthLine: function (i, j, lineStyleModel, infoData, group) {
            var tickLine;
            var wx = infoData.wrapRect.x;
            var wy = infoData.wrapRect.y;
            var h = infoData.height;
            var w = infoData.width;

            // 当前竖线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: wx + i * w,
                    y1: wy + j * h,
                    x2: wx + i * w,
                    y2: wy + 7 * h
                },

                style: lineStyleModel
            });

            group.add(tickLine);

            if (j !== 0) {
                // 横线
                tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: wx + i * w - infoData.lineWidth,
                        y1: wy + j * h,
                        x2: wx + (i + 1) * w + infoData.lineWidth,
                        y2: wy + j * h
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);

                // 往上的竖线
                tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: wx + (i + 1) * w,
                        y1: wy,
                        x2: wx + (i + 1) * w,
                        y2: wy + j * h
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);
            }

        },

        // 绘制年
        _renderYearText: function (calendarModel, rangeData, infoData, group) {
            var yearLabel = calendarModel.getModel('yearLabel');

            if (yearLabel.get('show')) {

                var yearText;
                var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
                var padding = yearLabel.get('padding') || 0;
                var opt = {
                    x: infoData.wrapRect.x - infoData.width / 2 - padding,
                    y: infoData.wrapRect.y
                };

                if (yearLabel.get('position') === 'center') {
                    opt = {
                        x: infoData.wrapRect.x - infoData.width / 2 + rangeData.allweeks * infoData.width / 2,
                        y: infoData.wrapRect.y - padding
                    };
                }


                yearText = new graphic.Text({
                    style: {
                        text: rangeData.year,
                        x: opt.x,
                        y: opt.y,
                        textAlign: 'right',
                        textVerticalAlign: 'bottom',
                        font: yearLabelStyleModel.getFont(),
                        fill: yearLabelStyleModel.getTextColor()
                    }
                });
                group.add(yearText);
            }
        },

        // 绘制月
        _renderMouthText: function (calendarModel, rangeData, infoData, group) {
            var mouthLabel = calendarModel.getModel('mouthLabel');

            if (mouthLabel.get('show')) {
                var mouthLabelStyleModel = calendarModel.getModel('mouthLabel.textStyle');
                var MOUTH = mouthLabel.get('data');
                var padding = mouthLabel.get('padding');

                var yd;
                var info;
                var w;
                var d;
                var mouthText;
                var start = 0;

                for (var i = 0; i < 12; i++) {

                    // 当前年每月第一天
                    yd = rangeData.year + '-' + (i + 1) + '-1';
                    info = time.getWdwByDays(yd);

                    w = info.weeks - 1;
                    d = info.weekDay;

                    start = d > 0 ? 1 : 0;

                    if (mouthLabel.get('position') === 'bottom') {
                        mouthText = new graphic.Text({
                            style: {
                                text: MOUTH[i],
                                x: w * infoData.width + infoData.wrapRect.x,
                                y: infoData.wrapRect.y + infoData.lineWidth + 7 * infoData.width + padding,
                                textVerticalAlign: 'top',
                                font: mouthLabelStyleModel.getFont(),
                                fill: mouthLabelStyleModel.getTextColor()
                            }
                        });
                    }
                    else {
                        mouthText = new graphic.Text({
                            style: {
                                text: MOUTH[i],
                                x: w * infoData.width + infoData.wrapRect.x + start * infoData.width,
                                y: infoData.wrapRect.y - infoData.lineWidth - padding,
                                textVerticalAlign: 'bottom',
                                font: mouthLabelStyleModel.getFont(),
                                fill: mouthLabelStyleModel.getTextColor()
                            }
                        });
                    }

                    group.add(mouthText);
                }
            }
        },

        // 绘制星期
        _renderWeekText: function (calendarModel, infoData, group) {
            var dayLabel = calendarModel.getModel('dayLabel');

            if (dayLabel.get('show')) {
                var dayLabelStyleModel = calendarModel.getModel('dayLabel.textStyle');
                var WEEK = dayLabel.get('data');
                var padding = dayLabel.get('padding') || 0;
                var weekText;

                for (var j = 0; j < 7; j++) {

                    var y = j * infoData.height + infoData.wrapRect.y + infoData.height;

                    weekText = new graphic.Text({
                        style: {
                            text: WEEK[j],
                            x: infoData.wrapRect.x - infoData.width / 2 - infoData.lineWidth - padding,
                            y: y,
                            textAlign: 'right',
                            font: dayLabelStyleModel.getFont(),
                            fill: dayLabelStyleModel.getTextColor()
                        }
                    });
                    group.add(weekText);
                }

            }
        }
    });
});
