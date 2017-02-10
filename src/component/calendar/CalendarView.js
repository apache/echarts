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

            var wrapRect =  calendarModel.coordinateSystem.getRect();
            var width =  calendarModel.coordinateSystem.getswidth();
            var height =  width;

            var year = calendarModel.option.range;

            // 第一天是星期几
            var fweek = time.getWdwByDays(year).weekDay;

            // 最后一天是星期几
            var lastday = time.getWdwByDays(year + '-12-31');
            var lweek = lastday.weekDay;

            var allweek = lastday.weeks;

            var WEEK = ['Sun', 'Sat', 'Fri', 'Thu', 'Wed', 'Tue', 'Mon'];
            var MOUTH = [
                    'Jan', 'Feb', 'Mar',
                    'Apr', 'May', 'June',
                    'Jul', 'Aug', 'Sep',
                    'Oct', 'Nov', 'Dec'
                ];

            // 年信息
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


            // 日网格
            for (var i = 0; i < allweek; i++) {

                for (var j = 0; j < 7; j++) {

                    // 第一列 星期文字坐标
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

                    if ((i === 0 && j < fweek) || (i === allweek - 1 && j > lweek)) {
                        continue;
                    }

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

            // 月文字坐标 && 月分隔线
            for (var i = 0; i < 12; i++) {
                var yd = year + '-' + (i + 1) + '-1';

                var info = time.getWdwByDays(yd);
                var w = info.weeks - 1;
                var d = info.weekDay;
                var start = d > 0 ? 1 : 0;
                var mouthText = new graphic.Text({
                    style: {
                        text: MOUTH[i],
                        x: w * width + wrapRect.x + start * width,
                        y: wrapRect.y,
                        textVerticalAlign: 'bottom'
                    }
                });
                group.add(mouthText);

                self._renderMouthLine(
                    self.group, w, d,
                    width, height,
                    {
                        x: wrapRect.x,
                        y: wrapRect.y
                    }
                );
            }

            // 12月最后一栏
            var info12 = time.getWdwByDays(year + '-12-31');
            var w12 = info12.weeks - 1;
            var d12 = info12.weekDay + 1;

            if (d12 === 7) {
                // 竖线
                var tickLine = new graphic.Line({
                    shape: {
                        x1: wrapRect.x + (w12 + 1) * width,
                        y1: wrapRect.y,
                        x2: wrapRect.x + (w12 + 1) * width,
                        y2: wrapRect.y + d12 * height
                    }
                });

                group.add(tickLine);
            }
            else {
                self._renderMouthLine(
                    self.group, w12, d12,
                    width, height,
                    {
                        x: wrapRect.x,
                        y: wrapRect.y
                    }
                );
            }

            var firstx = fweek > 0 ? 1 : 0;

            // 上横线
            tickLine = new graphic.Line({
                shape: {
                    x1: wrapRect.x + firstx * width,
                    y1: wrapRect.y,
                    x2: wrapRect.x + allweek * width,
                    y2: wrapRect.y
                }
            });

            group.add(tickLine);

            var lastx = d12 === 7 ? (w12 + 1) : w12;

            // 下横线
            tickLine = new graphic.Line({
                shape: {
                    x1: wrapRect.x,
                    y1: wrapRect.y + 7 * height,
                    x2: wrapRect.x + lastx * width,
                    y2: wrapRect.y + 7 * height
                }
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
         * @param  {string} bgcolor     背景颜色
         * @param  {string} bordercolor 边框颜色
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
         * 以某天为准的 竖分隔线  这里主要用作画月分隔线
         * @param  {[type]} group  [description]
         * @param  {[type]} i      [description]
         * @param  {[type]} j      [description]
         * @param  {[type]} width  [description]
         * @param  {[type]} height [description]
         * @param  {[type]} offset [description]
         * @return {[type]}        [description]
         */
        _renderMouthLine: function (group, i, j, width, height, offset) {
            var tickLine;

            // 当前竖线
            tickLine = new graphic.Line({
                shape: {
                    x1: offset.x + i * width,
                    y1: offset.y + j * height,
                    x2: offset.x + i * width,
                    y2: offset.y + 7 * height
                }
            });

            group.add(tickLine);

            if (j !== 0) {
                // 横线
                tickLine = new graphic.Line({
                    shape: {
                        x1: offset.x + i * width,
                        y1: offset.y + j * height,
                        x2: offset.x + (i + 1) * width,
                        y2: offset.y + j * height
                    }
                });

                group.add(tickLine);

                // 往上的竖线
                tickLine = new graphic.Line({
                    shape: {
                        x1: offset.x + (i + 1) * width,
                        y1: offset.y,
                        x2: offset.x + (i + 1) * width,
                        y2: offset.y + j * height
                    }
                });

                group.add(tickLine);
            }

        }
    });
});
