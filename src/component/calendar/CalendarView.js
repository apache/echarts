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

            var coordSys = calendarModel.coordinateSystem;

            // range info
            var rangeData = coordSys.getRangeInfo();
            var orient = coordSys.getOrient();

            var lineStyleModel = calendarModel.getModel('lineStyle').getLineStyle();

            var infoData = {
                wrapRect: coordSys.getRect(),
                sw: coordSys.getswidth(),
                sh: coordSys.getsheight(),

                // separate line
                lw: lineStyleModel.lineWidth || 1
            };


            this._renderDayRect(calendarModel, rangeData, infoData, orient, group);

            this._renderLines(calendarModel, orient, lineStyleModel, group);

            // this._renderYearText(calendarModel, rangeData, infoData, orient, group);

            this._renderMonthText(calendarModel, rangeData, infoData, orient, group);

            this._renderWeekText(calendarModel, infoData, orient, group);
        },

        // render day rect
        _renderDayRect: function (calendarModel, rangeData, infoData, orient, group) {
            var start = rangeData.start.time;
            var end = rangeData.end.time;
            var coordSys = calendarModel.coordinateSystem;
            var itemRectStyleModel = calendarModel.getModel('itemStyle.normal').getItemStyle();

            var rect;
            var point = [];

            for (var i = start; i <= end; i = i + 86400000) {
                point = coordSys.dateToPonitFour(i).TL;

                // every rect
                rect = new graphic.Rect({
                    shape: {
                        x: point[0],
                        y: point[1],
                        width: infoData.sw,
                        height: infoData.sh
                    },
                    style: itemRectStyleModel
                });

                group.add(rect);
            }

        },

        // render separate line
        _renderLines: function (calendarModel, orient, lineStyleModel, group) {

            var coordSys = calendarModel.coordinateSystem;

            var points = [];

            var ms = coordSys.getRangeMonths();

            this.tlpoints = [];
            this.blpoints = [];

            for (var i = 0; i < ms.num; i++) {

                if (i === ms.num - 1) {
                    ms.months[i] = new Date(new Date(ms.months[i]).getTime() + 86400000);
                }

                points = this._getLinePointsOfSeven(calendarModel, ms.months[i], orient);

                this.tlpoints.push(points[0]);
                this.blpoints.push(points[points.length - 1]);

                this._renderPolyline(points, lineStyleModel, group);
            }

            // render top line
            this._renderPolyline(this.tlpoints, lineStyleModel, group);

            // render bottom line
            this._renderPolyline(this.blpoints, lineStyleModel, group);

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

            date = new Date(date);

            var time = date.getTime();

            var pos1 = orient === 'horizontal' ? 'BL' : 'TR';

            var coordSys = calendarModel.coordinateSystem;

            var points = [];
            var point;
            var tmpD = date;
            var idx = 0;

            // note: there need to use =
            for (var i = 0; i <= 7; i++) {

                if (i === 7 && tmpD.getDay() === 6) {
                    continue;
                }

                tmpD = new Date(time + 86400000 * i);

                point = coordSys.dateToPonitFour(tmpD);

                points.push(point.TL);

                if (i !== 7 && tmpD.getDay() === 6) {
                    points.push(point[pos1]);
                    idx = points.length;
                }

            }

            Array.prototype.unshift.apply(points, points.splice(idx));

            return points;

        },

        // render year
        _renderYearText: function (calendarModel, rangeData, infoData, orient, group) {
            // ...
        },

        // render month and year text
        _renderMonthText: function (calendarModel, rangeData, infoData, orient, group) {
            var monthLabel = calendarModel.getModel('monthLabel');
            var yearLabel = calendarModel.getModel('yearLabel');

            if (monthLabel.get('show')) {
                var monthLabelStyleModel = calendarModel.getModel('monthLabel.textStyle');
                var MONTH = monthLabel.get('data');
                var padding = monthLabel.get('padding');
                var yearLabelStyleModel = calendarModel.getModel('yearLabel.textStyle');
                var yearpadding = yearLabel.get('padding');
                var monthText;
                var yearText;
                var monthPoints = this.tlpoints;
                var vAlign = 'top';
                var align = 'left';
                var vAlignY = 'top';
                var alignY = 'right';
                var x;
                var y;

                var coordSys = calendarModel.coordinateSystem;
                if (monthLabel.get('position') === 'bottom') {
                    monthPoints = this.blpoints;
                }

                if (monthLabel.get('position') === 'top') {

                    if (orient === 'horizontal') {
                        vAlign = 'bottom';
                        vAlignY = 'bottom';

                    }
                    else {
                        align = 'right';
                        alignY = 'left';
                    }
                }

                for (var i = 0; i < monthPoints.length - 1; i++) {
                    var month = new Date(coordSys.pointToData(monthPoints[i])).getMonth();
                    var year = new Date(coordSys.pointToData(monthPoints[i])).getFullYear();

                    if (orient === 'horizontal') {
                        x = monthPoints[i][0];
                        y = monthPoints[i][1] + padding;
                    }
                    else {
                        x = monthPoints[i][0] + padding;
                        y = monthPoints[i][1];
                    }
                    if (month === 0 && yearLabel.get('show')) {

                        yearText = new graphic.Text({
                            style: {
                                text: year,
                                x: x,
                                y: y,
                                textAlign: align,
                                textVerticalAlign: vAlign,
                                font: yearLabelStyleModel.getFont(),
                                fill: yearLabelStyleModel.getTextColor()
                            }
                        });

                        group.add(yearText);
                    }

                    monthText = new graphic.Text({
                        style: {
                            text: MONTH[+month],
                            x: x,
                            y: y,
                            textAlign: align,
                            textVerticalAlign: vAlign,
                            font: monthLabelStyleModel.getFont(),
                            fill: monthLabelStyleModel.getTextColor()
                        }
                    });

                    group.add(monthText);
                }
            }
        },

        // render weeks
        _renderWeekText: function (calendarModel, infoData, orient, group) {
            var dayLabel = calendarModel.getModel('dayLabel');
            var coordSys = calendarModel.coordinateSystem;
            if (dayLabel.get('show')) {
                var dayLabelStyleModel = calendarModel.getModel('dayLabel.textStyle');
                var WEEK = dayLabel.get('data');
                var padding = dayLabel.get('padding') || 0;
                var weekText;

                var start = coordSys.pointToData([infoData.wrapRect.x, infoData.wrapRect.y]);
                var date = new Date(start);
                var time = date.getTime();

                var tmpD;
                var point;
                var x;
                var y;

                for (var i = 0; i < 7; i++) {

                    tmpD = new Date(time + 86400000 * i);
                    point = coordSys.dateToPonitFour(tmpD).TL;

                    if (orient === 'horizontal') {
                        x = point[0] - infoData.sw / 2 - padding;
                        y = point[1] + infoData.sh * 0.8;
                    }
                    else {
                        x = point[0] + infoData.sw * 0.8 - padding;
                        y = point[1] - infoData.sh / 2;
                    }

                    weekText = new graphic.Text({
                        style: {
                            text: WEEK[i],
                            x: x,
                            y: y,
                            textAlign: 'right',
                            textVeticalAlign: 'middle',
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
