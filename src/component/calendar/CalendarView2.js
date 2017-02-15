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
            var WEEK = calendarModel.getModel('dayLabel').get('data');
            var MONTH = calendarModel.getModel('monthLabel').get('data');

            var self = this;
            var group = self.group;

            var coordSys = calendarModel.coordinateSystem;

            var itemRectStyleModel = calendarModel.getModel('itemStyle.normal').getItemStyle();
            var lineStyleModel = calendarModel.getModel('lineStyle').getLineStyle();
            var dayLabelStyleModel = calendarModel.getModel('dayLabel.textStyle');
            var monthLabelStyleModel = calendarModel.getModel('monthLabel.textStyle');
            var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
            var lineWidth = lineStyleModel.lineWidth / 2 || 0;
            group.removeAll();

            var wrapRect =  coordSys.getRect();
            var width =  coordSys.getswidth();
            var height =  width;

            // 当前年所有周数
            var allweek = coordSys.getAllWeek();

            var curYear = calendarModel.get('range');

            // 第一天是星期几
            var fweek = time.getWdwByDays(curYear).weekDay;

            // 最后一天是星期几
            var lastday = time.getWdwByDays(curYear + '-12-31');
            var lweek = lastday.weekDay;



            // 年信息
            if (calendarModel.getModel('yearLabel').get('show')) {

                var yearText;
                var yearLabel = calendarModel.getModel('yearLabel');
                var padding = yearLabel.get('padding') || 0;

                if (yearLabel.get('position') === 'center') {
                    yearText = new graphic.Text({
                        style: {
                            text: curYear,
                            x: wrapRect.x - width / 2 + allweek * width / 2,
                            y: wrapRect.y - padding,
                            textAlign: 'right',
                            textVerticalAlign: 'bottom',
                            font: yearLabelStyleModel.getFont(),
                            fill: yearLabelStyleModel.getTextColor()
                        }
                    });
                }
                else {
                    yearText = new graphic.Text({
                        style: {
                            text: curYear,
                            x: wrapRect.x - width / 2 - padding,
                            y: wrapRect.y,
                            textAlign: 'right',
                            textVerticalAlign: 'bottom',
                            font: yearLabelStyleModel.getFont(),
                            fill: yearLabelStyleModel.getTextColor()
                        }
                    });
                }
                group.add(yearText);
            }

            var i;
            var j;

            var dayLabel = calendarModel.getModel('dayLabel');

            padding = dayLabel.get('padding') || 0;
            // 日网格
            for (i = 0; i < allweek; i++) {

                for (j = 0; j < 7; j++) {

                    // 第一列 星期文字坐标
                    if (dayLabel.get('show') && i === 0) {
                        var y = j * height + wrapRect.y + height;


                        var weekText = new graphic.Text({
                            style: {
                                text: WEEK[j],
                                x: wrapRect.x - width / 2 - lineWidth - padding,
                                y: y,
                                textAlign: 'right',
                                font: dayLabelStyleModel.getFont(),
                                fill: dayLabelStyleModel.getTextColor()
                            }
                        });


                        group.add(weekText);
                    }

                    if ((i === 0 && j < fweek) || (i === allweek - 1 && j > lweek)) {
                        continue;
                    }

                    // 每个方格
                    var rects = self._renderRect(
                        i, j,
                        width, height,
                        {
                            x: wrapRect.x,
                            y: wrapRect.y
                        }, itemRectStyleModel
                    );

                    /*graphic.setHoverStyle(rects, {
                        fill: 'red',
                        stroke: '#000'
                    });*/
                    group.add(rects);

                }
            }

            var monthLabel = calendarModel.getModel('monthLabel');
            padding = monthLabel.get('padding');

            // 月文字坐标 && 月分隔线
            for (i = 0; i < 12; i++) {

                // 当前年每月第一天
                var yd = curYear + '-' + (i + 1) + '-1';
                var info = time.getWdwByDays(yd);

                var w = info.weeks - 1;
                var d = info.weekDay;

                if (monthLabel.get('show')) {
                    var start = d > 0 ? 1 : 0;
                    var monthText;

                    if (monthLabel.get('position') === 'bottom') {
                        monthText = new graphic.Text({
                            style: {
                                text: MONTH[i],
                                x: w * width + wrapRect.x,
                                y: wrapRect.y + lineWidth + 7 * width + padding,
                                textVerticalAlign: 'top',
                                font: monthLabelStyleModel.getFont(),
                                fill: monthLabelStyleModel.getTextColor()
                            }
                        });
                    }
                    else {
                        monthText = new graphic.Text({
                            style: {
                                text: MONTH[i],
                                x: w * width + wrapRect.x + start * width,
                                y: wrapRect.y - lineWidth - padding,
                                textVerticalAlign: 'bottom',
                                font: monthLabelStyleModel.getFont(),
                                fill: monthLabelStyleModel.getTextColor()
                            }
                        });
                    }


                    group.add(monthText);
                }

                self._renderMonthLine(
                    self.group, w, d,
                    width, height,
                    {
                        x: wrapRect.x,
                        y: wrapRect.y
                    },
                    lineStyleModel
                );
            }

            // ---- 12月最后一栏 ----
            var info12 = time.getWdwByDays(curYear + '-12-31');
            var w12 = info12.weeks - 1;
            var d12 = info12.weekDay + 1;

            if (d12 === 7) {
                // 竖线
                var tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: wrapRect.x + (w12 + 1) * width,
                        y1: wrapRect.y,
                        x2: wrapRect.x + (w12 + 1) * width,
                        y2: wrapRect.y + d12 * height
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);
            }
            else {
                self._renderMonthLine(
                    self.group, w12, d12,
                    width, height,
                    {
                        x: wrapRect.x,
                        y: wrapRect.y
                    },
                    lineStyleModel
                );
            }

            // ---- 12月最后一栏 end ----


            var firstx = fweek > 0 ? 1 : 0;

            // 上横线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: wrapRect.x + firstx * width - lineWidth,
                    y1: wrapRect.y,
                    x2: wrapRect.x + allweek * width + lineWidth,
                    y2: wrapRect.y
                },

                style: lineStyleModel
            });

            group.add(tickLine);


            var lastx = d12 === 7 ? (w12 + 1) : w12;

            // 下横线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: wrapRect.x - lineWidth,
                    y1: wrapRect.y + 7 * height,
                    x2: wrapRect.x + lastx * width + lineWidth,
                    y2: wrapRect.y + 7 * height
                },

                style: lineStyleModel
            });

            group.add(tickLine);
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
         * @param  {string} itemRectStyle  样式
         * @return {Object}         {}
         */
        _renderRect: function (i, j, width, height, offset, itemRectStyle) {

            return new graphic.Rect({
                shape: {
                    x: i * width + offset.x,
                    y: j * height + offset.y,
                    width: width,
                    height: height
                },
                style: itemRectStyle
            });
        },

        /**
         * 以某天为准的 竖分隔线  这里主要用作画月分隔线
         *
         * @param  {Object} group  this group
         * @param  {number} i       数值i
         * @param  {number} j       数值j
         * @param  {number} width   宽度
         * @param  {number} height  高度
         * @param  {Object} offset  偏移配置
         * @param  {Object} lineStyleModel  样式
         */
        _renderMonthLine: function (group, i, j, width, height, offset, lineStyleModel) {
            var tickLine;
            var lineWidth = lineStyleModel.lineWidth / 2 || 0;

            // 当前竖线
            tickLine = new graphic.Line({
                z2: 20,
                shape: {
                    x1: offset.x + i * width,
                    y1: offset.y + j * height,
                    x2: offset.x + i * width,
                    y2: offset.y + 7 * height
                },

                style: lineStyleModel
            });

            group.add(tickLine);

            if (j !== 0) {
                // 横线
                tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: offset.x + i * width - lineWidth,
                        y1: offset.y + j * height,
                        x2: offset.x + (i + 1) * width + lineWidth,
                        y2: offset.y + j * height
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);

                // 往上的竖线
                tickLine = new graphic.Line({
                    z2: 20,
                    shape: {
                        x1: offset.x + (i + 1) * width,
                        y1: offset.y,
                        x2: offset.x + (i + 1) * width,
                        y2: offset.y + j * height
                    },

                    style: lineStyleModel
                });

                group.add(tickLine);
            }

        }
    });
});
