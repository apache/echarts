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

            this._renderLines(calendarModel, rangeData, orient, group);

            this._renderYearText(calendarModel, orient, group);

            this._renderMonthText(calendarModel, orient, group);

            this._renderWeekText(calendarModel, rangeData, orient, group);
        },

        // render day rect
        _renderDayRect: function (calendarModel, rangeData, group) {
            var coordSys = calendarModel.coordinateSystem;
            var itemRectStyleModel = calendarModel.getModel('itemStyle.normal').getItemStyle();
            var sw = coordSys.getCellWidth();
            var sh = coordSys.getCellHeight();

            for (var i = rangeData.start.time;
                i <= rangeData.end.time;
                i = calendarTime.getNextNDay(i, 1).time
            ) {

                var point = coordSys.dateToPonitFour(i).TL;

                // every rect
                var rect = new graphic.Rect({
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
        _renderLines: function (calendarModel, rangeData, orient, group) {

            var self = this;

            var lineStyleModel = calendarModel.getModel('splitLine.lineStyle').getLineStyle();
            var show = calendarModel.getModel('splitLine').get('show');

            this._tlpoints = [];
            this._blpoints = [];
            this._firstDayPoints = [];

            var firstDay = calendarTime.getYMDInfo(rangeData.range[0]);

            for (var i = 0; firstDay.time <= rangeData.end.time; i++) {
                addPoints(firstDay.format);

                if (i === 0) {
                    firstDay = calendarTime.getYMDInfo(rangeData.start.y + '-' + rangeData.start.m);
                }

                var date = firstDay.date;
                date.setMonth(date.getMonth() + 1);
                firstDay = calendarTime.getYMDInfo(date);
            }

            addPoints(calendarTime.getNextNDay(rangeData.range[1], 1).format);

            function addPoints(date) {

                self._firstDayPoints.push(calendarModel.coordinateSystem.dateToPonitFour(date).TL);

                var points = self._getLinePointsOfSeven(calendarModel, date, orient);

                self._tlpoints.push(points[0]);
                self._blpoints.push(points[points.length - 1]);

                show && self._renderPolyline(points, lineStyleModel, group);
            }

            // render top/left line
            show && this._renderPolyline(self._tlpoints, lineStyleModel, group);

            // render bottom/right line
            show && this._renderPolyline(self._blpoints, lineStyleModel, group);

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

            var pos = orient === 'horizontal' ? 'BL' : 'TR';

            var coordSys = calendarModel.coordinateSystem;

            var points = [];

            for (var i = 0; i < 7; i++) {

                var tmpD = calendarTime.getNextNDay(date.time, i);

                var point = coordSys.dateToPonitFour(tmpD.time);

                points[2 * tmpD.day] = point.TL;
                points[2 * tmpD.day + 1] = point[pos];

            }

            return points;

        },

        _yearTextPositionControl: function (point, orient, position, padding) {
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

        // render year
        _renderYearText: function (calendarModel, orient, group) {
            var yearLabel = calendarModel.getModel('yearLabel');

            if (!yearLabel.get('show')) {
                return;
            }

            var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
            var padding = yearLabel.get('padding');
            var pos = yearLabel.get('position');
            var monthPoints = this._blpoints;

            var coordSys = calendarModel.coordinateSystem;

            if (pos === 'left') {
                pos = 'top';
            }

            if (pos === 'top') {
                monthPoints = this._tlpoints;
                padding = -padding;
            }

            for (var i = 0; i < monthPoints.length - 1; i++) {
                var mdate = coordSys.pointToDate(monthPoints[i]);

                if (!mdate || mdate.m !== 1) {
                    continue;
                }

                var yearText = new graphic.Text({
                    style: zrUtil.extend({
                        z2: 30,
                        text: mdate.y,
                        font: yearLabelStyleModel.getFont(),
                        fill: yearLabelStyleModel.getTextColor()
                    }, this._yearTextPositionControl(monthPoints[i], orient, pos, padding))
                });

                group.add(yearText);
            }
        },

        _monthTextPositionControl: function (point, orient, position, padding) {
            var align = 'left';
            var vAlign = 'top';
            var x = point[0];
            var y = point[1];

            if (orient === 'horizontal') {
                y = y + padding;

                align = 'center';

                if (position === 'top') {
                    vAlign = 'bottom';
                }
            }
            else {
                x = x + padding;

                vAlign = 'middle';

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

            if (!monthLabel.get('show')) {
                return;
            }

            var monthLabelStyleModel = calendarModel.getModel('monthLabel.textStyle');
            var MONTH = monthLabel.get('data');
            var padding = monthLabel.get('padding');
            var pos = monthLabel.get('position');
            var monthPoints = this._blpoints;
            var firstDay = this._firstDayPoints;
            var axis = orient === 'horizontal' ? 0 : 1;

            var coordSys = calendarModel.coordinateSystem;

            if (pos === 'left') {
                pos = 'top';
            }

            if (pos === 'top') {
                monthPoints = this._tlpoints;
                padding = -padding;
            }

            for (var i = 0; i < monthPoints.length - 1; i++) {
                var mdate = coordSys.pointToDate(monthPoints[i]);

                if (!mdate) {
                    continue;
                }

                var tmp = monthPoints[i].concat();

                tmp[axis] = (firstDay[i][axis] + monthPoints[i + 1][axis]) / 2;

                var monthText = new graphic.Text({
                    style: zrUtil.extend({
                        z2: 30,
                        text: MONTH[+mdate.m - 1],
                        font: monthLabelStyleModel.getFont(),
                        fill: monthLabelStyleModel.getTextColor()
                    }, this._monthTextPositionControl(tmp, orient, pos, padding))
                });

                group.add(monthText);
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

            if (!dayLabel.get('show')) {
                return;
            }

            var coordSys = calendarModel.coordinateSystem;
            var dayLabelStyleModel = calendarModel.getModel('dayLabel.textStyle');
            var pos = dayLabel.get('position');
            var WEEK = dayLabel.get('data');
            var padding = dayLabel.get('padding');
            var firstDay = dayLabel.get('firstDay');


            if (pos === 'left') {
                pos = 'top';
            }

            var start = calendarTime.getNextNDay(
                rangeData.end.time, (7 - rangeData.lweek)
            ).time;

            if (pos === 'top') {
                start = calendarTime.getNextNDay(
                    rangeData.start.time, -(7 + rangeData.fweek)
                ).time;
                padding = -padding;
            }

            for (var i = 0; i < 7; i++) {

                var tmpD = calendarTime.getNextNDay(start, i);
                var point = coordSys.dateToPonitFour(tmpD.time).CENTER;
                var day = i;
                // day = Math.abs((i + firstDay) % 7);
                var weekText = new graphic.Text({
                    style: zrUtil.extend({
                        z2: 30,
                        text: WEEK[day],
                        font: dayLabelStyleModel.getFont(),
                        fill: dayLabelStyleModel.getTextColor()
                    }, this._weekTextPositionControl(point, orient, pos, padding))
                });
                group.add(weekText);
            }
        }
    });
});
