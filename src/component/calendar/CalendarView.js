/**
 * @file CalendarView.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var calendarTime = require('../../util/time');

    return require('../../echarts').extendComponentView({

        type: 'calendar',

        render: function (calendarModel, ecModel, api) {

            var self = this;
            var group = self.group;
            group.removeAll();

            var coordSys = calendarModel.coordinateSystem;

            // range info
            var rangeData = coordSys.getRangeInfo();
            var orient = coordSys.getOrient();

            this._renderDayRect(calendarModel, rangeData, group);

            this._renderLines(calendarModel, orient, group);

            this._renderYearText(calendarModel, orient, group);

            this._renderMonthText(calendarModel, orient, group);

            this._renderWeekText(calendarModel, rangeData, orient, group);
        },

        // render day rect
        _renderDayRect: function (calendarModel, rangeData, group) {
            var start = rangeData.start.time;
            var end = rangeData.end.time;
            var coordSys = calendarModel.coordinateSystem;
            var itemRectStyleModel = calendarModel.getModel('itemStyle.normal').getItemStyle();
            var sw = coordSys.getswidth();
            var sh = coordSys.getsheight();
            var rect;
            var point = [];

            for (var i = start; i <= end; i = i + 86400000) {
                point = coordSys.dateToPonitFour(i).TL;

                // every rect
                rect = new graphic.Rect({
                    shape: {
                        x: point[0],
                        y: point[1],
                        width: sw,
                        height: sh
                    },
                    style: itemRectStyleModel
                });

                group.add(rect);
            }

        },

        // render separate line
        _renderLines: function (calendarModel, orient, group) {

            var coordSys = calendarModel.coordinateSystem;
            var lineStyleModel = calendarModel.getModel('separateline.lineStyle').getLineStyle();
            var show = calendarModel.getModel('separateline').get('show');
            var points = [];

            var ms = coordSys.getRangeMonths();

            this.tlpoints = [];
            this.blpoints = [];

            for (var i = 0; i < ms.num; i++) {

                if (i === ms.num - 1) {
                    ms.months[i] = calendarTime.getNextNDay(ms.months[i], 1).format;
                }

                points = this._getLinePointsOfSeven(calendarModel, ms.months[i], orient);

                this.tlpoints.push(points[0]);
                this.blpoints.push(points[points.length - 1]);

                show && this._renderPolyline(points, lineStyleModel, group);
            }

            // render top/left line
            show && this._renderPolyline(this.tlpoints, lineStyleModel, group);

            // render bottom/right line
            show && this._renderPolyline(this.blpoints, lineStyleModel, group);

        },

        // render polyline
        _renderPolyline: function (points, lineStyleModel, group) {

            var poyline = new graphic.Polyline({
                z2: 20,
                shape: {
                    points: points
                },
                style: lineStyleModel
            });

            group.add(poyline);
        },

        // render month line of seven day points
        _getLinePointsOfSeven: function (calendarModel, date, orient) {

            date = calendarTime.getYMDInfo(date);
            var start = date.time;

            var pos = orient === 'horizontal' ? 'BL' : 'TR';

            var coordSys = calendarModel.coordinateSystem;

            var points = [];
            var point;
            var tmpD = date;
            var idx = 0;

            // note: there need to use =
            for (var i = 0; i <= 7; i++) {

                if (i === 7 && tmpD.day === 6) {
                    continue;
                }

                tmpD = calendarTime.getNextNDay(start, i);

                point = coordSys.dateToPonitFour(tmpD.time);

                points.push(point.TL);

                if (i !== 7 && tmpD.day === 6) {
                    points.push(point[pos]);
                    idx = points.length;
                }

            }

            Array.prototype.unshift.apply(points, points.splice(idx));

            return points;

        },

        // render year
        _renderYearText: function (calendarModel, orient, group) {
            var yearLabel = calendarModel.getModel('yearLabel');

            if (yearLabel.get('show')) {
                var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
                var padding = yearLabel.get('padding');
                var pos = yearLabel.get('position');
                var yearText;
                var monthPoints = this.tlpoints;
                var mdate;

                var coordSys = calendarModel.coordinateSystem;
                if (pos !== 'top') {
                    monthPoints = this.blpoints;
                }

                for (var i = 0; i < monthPoints.length - 1; i++) {
                    mdate = coordSys.pointToDate(monthPoints[i]);

                    if (!mdate) {
                        continue;
                    }

                    if (mdate.m === 1) {
                        yearText = new graphic.Text({
                            style: zrUtil.extend({
                                text: mdate.y,
                                font: yearLabelStyleModel.getFont(),
                                fill: yearLabelStyleModel.getTextColor()
                            }, this._monthTextPositionControl(monthPoints[i], orient, pos, padding))
                        });

                        group.add(yearText);
                    }
                }
            }
        },

        _monthTextPositionControl: function (point, orient, position, padding) {
            var align = 'left';
            var vAlign = 'top';
            var x = point[0];
            var y = point[1];

            if (orient === 'horizontal') {
                y = y + padding;

                if (position === 'top') {
                    vAlign = 'bottom';
                }
            }
            else {
                x = x + padding;

                if (position === 'top') {
                    align = 'right';
                }
            }

            return {
                x: x,
                y: y,
                textAlign: align,
                textVerticalAlign: vAlign
            };
        },

        // render month and year text
        _renderMonthText: function (calendarModel, orient, group) {
            var monthLabel = calendarModel.getModel('monthLabel');

            if (monthLabel.get('show')) {
                var monthLabelStyleModel = calendarModel.getModel('monthLabel.textStyle');
                var MONTH = monthLabel.get('data');
                var padding = monthLabel.get('padding');
                var pos = monthLabel.get('position');
                var monthPoints = this.tlpoints;
                var monthText;
                var mdate;

                var coordSys = calendarModel.coordinateSystem;
                if (pos !== 'top') {
                    monthPoints = this.blpoints;
                }

                for (var i = 0; i < monthPoints.length - 1; i++) {
                    mdate = coordSys.pointToDate(monthPoints[i]);

                    if (!mdate) {
                        continue;
                    }

                    monthText = new graphic.Text({
                        style: zrUtil.extend({
                            text: MONTH[+mdate.m - 1],
                            font: monthLabelStyleModel.getFont(),
                            fill: monthLabelStyleModel.getTextColor()
                        }, this._monthTextPositionControl(monthPoints[i], orient, pos, padding))
                    });

                    group.add(monthText);
                }
            }
        },

        _weekTextPositionControl: function (point, orient, position, padding) {
            var align = 'left';
            var vAlign = 'middle';
            var x = point[0];
            var y = point[1];

            if (orient === 'horizontal') {
                x = x + padding;

                if (position === 'top') {
                    align = 'right';
                }
            }
            else {
                y = y + padding;
                align = 'center';
            }

            return {
                x: x,
                y: y,
                textAlign: align,
                textVerticalAlign: vAlign
            };
        },

        // render weeks
        _renderWeekText: function (calendarModel, rangeData, orient, group) {
            var dayLabel = calendarModel.getModel('dayLabel');

            if (dayLabel.get('show')) {
                var coordSys = calendarModel.coordinateSystem;
                var pos = dayLabel.get('position');

                var start = calendarTime.getNextNDay(rangeData.start.time, -(7 + rangeData.fweek)).time;

                if (pos !== 'top') {
                    start = calendarTime.getNextNDay(rangeData.end.time, (7 - rangeData.lweek)).time;
                }

                var dayLabelStyleModel = calendarModel.getModel('dayLabel.textStyle');
                var WEEK = dayLabel.get('data');
                var padding = dayLabel.get('padding') || 0;
                var weekText;

                var tmpD;
                var point;

                for (var i = 0; i < 7; i++) {

                    tmpD = calendarTime.getNextNDay(start, i);
                    point = coordSys.dateToPonitFour(tmpD.time).CENTER;

                    weekText = new graphic.Text({
                        style: zrUtil.extend({
                            text: WEEK[i],
                            font: dayLabelStyleModel.getFont(),
                            fill: dayLabelStyleModel.getTextColor()
                        }, this._weekTextPositionControl(point, orient, pos, padding))
                    });
                    group.add(weekText);
                }

            }
        }
    });
});
