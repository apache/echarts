/**
 * @file CalendarView.js
 * @author dxh
 */

define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var matrix = require('zrender/core/matrix');
    var graphic = require('../../util/graphic');
    var formatUtil = require('../../util/format');

    var MONTHTEXT = {
        EN: [
                'Jan', 'Feb', 'Mar',
                'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'
            ],
        CN: [
                '一月', '二月', '三月',
                '四月', '五月', '六月',
                '七月', '八月', '九月',
                '十月', '十一月', '十二月'
            ]
    };

    var WEEKTEXT = {
        EN: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        CN: ['日', '一', '二', '三', '四', '五', '六']
    };

    return require('../../echarts').extendComponentView({

        type: 'calendar',

        render: function (calendarModel, ecModel, api) {

            var self = this;
            var group = self.group;
            group.removeAll();

            var coordSys = calendarModel.coordinateSystem;

            // range info
            var rangeData = coordSys.getHandledRangeInfo();
            var orient = coordSys.getOrient();

            this._renderDayRect(calendarModel, rangeData, group);

            this._renderLines(calendarModel, rangeData, orient, group);

            this._renderYearText(calendarModel, rangeData, orient, group);

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
                i = coordSys.getNextNDay(i, 1).time
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

            var coordSys = calendarModel.coordinateSystem;

            var lineStyleModel = calendarModel.getModel('splitLine.lineStyle').getLineStyle();
            var show = calendarModel.getModel('splitLine').get('show');

            this._tlpoints = [];
            this._blpoints = [];
            this._firstDayOfMonth = [];


            var firstDay = coordSys.getYMDInfo(rangeData.range[0]);

            for (var i = 0; firstDay.time <= rangeData.end.time; i++) {
                addPoints(firstDay.format);

                if (i === 0) {
                    firstDay = coordSys.getYMDInfo(rangeData.start.y + '-' + rangeData.start.m);
                }

                var date = firstDay.date;
                date.setMonth(date.getMonth() + 1);
                firstDay = coordSys.getYMDInfo(date);
            }

            addPoints(coordSys.getNextNDay(rangeData.range[1], 1).format);

            function addPoints(date) {

                self._firstDayOfMonth.push(coordSys.getYMDInfo(date));

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

            var coordSys = calendarModel.coordinateSystem;

            date = coordSys.getYMDInfo(date);

            var pos = orient === 'horizontal' ? 'BL' : 'TR';

            var points = [];

            for (var i = 0; i < 7; i++) {

                var tmpD = coordSys.getNextNDay(date.time, i);

                var point = coordSys.dateToPonitFour(tmpD.time);

                points[2 * tmpD.day] = point.TL;
                points[2 * tmpD.day + 1] = point[pos];

            }

            return points;

        },

        _yearTextPositionControl: function (point, orient, position, padding) {

            point = point.slice();
            var aligns = ['center', 'middle'];

            if (position === 'top') {
                point[1] -= padding;
                aligns = ['center', 'bottom'];
            }
            if (position === 'bottom') {
                point[1] += padding;
                aligns = ['center', 'top'];
            }
            if (position === 'left') {
                point[0] -= padding;
                aligns = ['right', 'middle'];
            }
            if (position === 'right') {
                point[0] += padding;
                aligns = ['left', 'middle'];
            }

            return {
                x: point[0],
                y: point[1],
                textAlign: aligns[0],
                textVerticalAlign: aligns[1]
            };
        },

        // render year
        _renderYearText: function (calendarModel, rangeData, orient, group) {
            var yearLabel = calendarModel.getModel('yearLabel');

            if (!yearLabel.get('show')) {
                return;
            }

            var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
            var padding = yearLabel.get('padding');
            var pos = yearLabel.get('position');

            var points = [this._tlpoints[this._tlpoints.length - 1], this._blpoints[0]];
            var xc = (points[0][0] + points[1][0]) / 2;
            var yc = (points[0][1] + points[1][1]) / 2;

            var idx = orient === 'horizontal' ? 0 : 1;


            var posPoints = {
                top: [xc, points[idx][1]],
                bottom: [xc, points[1 - idx][1]],
                left: [points[1 - idx][0], yc],
                right: [points[idx][0], yc]
            };

            var coordSys = calendarModel.coordinateSystem;

            var content = rangeData.start.y;

            if (+rangeData.end.y > +rangeData.start.y) {
                content = rangeData.start.y + '-' + rangeData.end.y;
            }

            var formatter = yearLabel.get('formatter');

            var params = {
                start: rangeData.start.y,
                end: rangeData.end.y,
                nameMap: content,
                $vars: ['start', 'end', 'nameMap']
            };

            if (typeof formatter === 'string' && formatter) {
                content = formatUtil.formatTpl(formatter, params);
            }
            else if (typeof formatter === 'function') {
                content = formatter(params);
            }

            var yearText = new graphic.Text({
                // rotation: Math.PI / 2,
                z2: 30,
                style: zrUtil.extend({
                    text: content,
                    font: yearLabelStyleModel.getFont(),
                    fill: yearLabelStyleModel.getTextColor()
                }, this._yearTextPositionControl(posPoints[pos], orient, pos, padding))
            });


            group.add(yearText);
        },

        _monthTextPositionControl: function (point, isCenter, orient, position, padding) {
            var align = 'left';
            var vAlign = 'top';
            var x = point[0];
            var y = point[1];

            if (orient === 'horizontal') {
                y = y + padding;

                if (isCenter) {
                    align = 'center';
                }

                if (position === 'top') {
                    vAlign = 'bottom';
                }
            }
            else {
                x = x + padding;

                if (isCenter) {
                    vAlign = 'middle';
                }

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
            var nameMap = monthLabel.get('nameMap');
            var padding = monthLabel.get('padding');
            var pos = monthLabel.get('position');
            var posAlign = monthLabel.get('posAlign');

            var termPoints = [this._tlpoints, this._blpoints];

            // var coordSys = calendarModel.coordinateSystem;

            if (zrUtil.isString(nameMap)) {
                nameMap = MONTHTEXT[nameMap.toUpperCase()] || [];
            }

            pos = pos === 'left' ? 'top' : pos;
            var idx = pos === 'top' ? 0 : 1;
            var axis = orient === 'horizontal' ? 0 : 1;
            padding = pos === 'top' ? -padding : padding;
            var isCenter = posAlign === 'center' ? true : false;

            for (var i = 0; i < termPoints[idx].length - 1; i++) {

                var tmp = termPoints[idx][i].slice();
                var firstDay = this._firstDayOfMonth[i];

                if (isCenter) {
                    tmp[axis] = (tmp[axis] + termPoints[1 - idx][i + 1][axis]) / 2;
                }

                var formatter = monthLabel.get('formatter');
                var content = nameMap[+firstDay.m - 1];
                var params = {
                    yyyy: firstDay.y,
                    MM: +firstDay.m,
                    nameMap: content,
                    $vars: ['yyyy', 'MM', 'nameMap']
                };

                if (typeof formatter === 'string' && formatter) {
                    content = formatUtil.formatTpl(formatter, params);
                }
                else if (typeof formatter === 'function') {
                    content = formatter(params);
                }

                var monthText = new graphic.Text({
                    z2: 30,
                    style: zrUtil.extend({
                        text: content,
                        font: monthLabelStyleModel.getFont(),
                        fill: monthLabelStyleModel.getTextColor()
                    }, this._monthTextPositionControl(tmp, isCenter, orient, pos, padding))
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
            var nameMap = dayLabel.get('nameMap');
            var padding = dayLabel.get('padding');
            var firstDay = coordSys.getFirstDayWeek();

            pos = (pos === 'left') ? 'top' : pos;

            if (zrUtil.isString(nameMap)) {
                nameMap = WEEKTEXT[nameMap.toUpperCase()] || [];
            }

            var start = coordSys.getNextNDay(
                rangeData.end.time, (7 - rangeData.lweek)
            ).time;

            if (pos === 'top') {
                start = coordSys.getNextNDay(
                    rangeData.start.time, -(7 + rangeData.fweek)
                ).time;
                padding = -padding;
            }

            for (var i = 0; i < 7; i++) {

                var tmpD = coordSys.getNextNDay(start, i);
                var point = coordSys.dateToPonitFour(tmpD.time).CENTER;
                var day = i;
                day = Math.abs((i + firstDay) % 7);
                var weekText = new graphic.Text({
                    z2: 30,
                    style: zrUtil.extend({
                        text: nameMap[day],
                        font: dayLabelStyleModel.getFont(),
                        fill: dayLabelStyleModel.getTextColor()
                    }, this._weekTextPositionControl(point, orient, pos, padding))
                });
                group.add(weekText);
            }
        }
    });
});
