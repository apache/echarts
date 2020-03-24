/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import * as formatUtil from '../../util/format';
import * as numberUtil from '../../util/number';
import CalendarModel from '../../coord/calendar/CalendarModel';
import {CalendarParsedDateRangeInfo, CalendarParsedDateInfo} from '../../coord/calendar/Calendar';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { LayoutOrient, OptionDataValueDate, ZRTextAlign, ZRTextVerticalAlign } from '../../util/types';
import ComponentView from '../../view/Component';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { RichTextStyleProps, RichTextProps } from 'zrender/src/graphic/RichText';

const MONTH_TEXT = {
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

const WEEK_TEXT = {
    EN: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    CN: ['日', '一', '二', '三', '四', '五', '六']
};

class CalendarView extends ComponentView {

    static type = 'calendar';
    type = CalendarView.type;

    /**
     * top/left line points
     */
    private _tlpoints: number[][];

    /**
     * bottom/right line points
     */
    private _blpoints: number[][];

    /**
     * first day of month
     */
    private _firstDayOfMonth: CalendarParsedDateInfo[];

    /**
     * first day point of month
     */
    private _firstDayPoints: number[][];

    render(calendarModel: CalendarModel, ecModel: GlobalModel, api: ExtensionAPI) {

        let group = this.group;

        group.removeAll();

        let coordSys = calendarModel.coordinateSystem;

        // range info
        let rangeData = coordSys.getRangeInfo();
        let orient = coordSys.getOrient();

        this._renderDayRect(calendarModel, rangeData, group);

        // _renderLines must be called prior to following function
        this._renderLines(calendarModel, rangeData, orient, group);

        this._renderYearText(calendarModel, rangeData, orient, group);

        this._renderMonthText(calendarModel, orient, group);

        this._renderWeekText(calendarModel, rangeData, orient, group);
    }

    // render day rect
    _renderDayRect(calendarModel: CalendarModel, rangeData: CalendarParsedDateRangeInfo, group: graphic.Group) {
        let coordSys = calendarModel.coordinateSystem;
        let itemRectStyleModel = calendarModel.getModel('itemStyle').getItemStyle();
        let sw = coordSys.getCellWidth();
        let sh = coordSys.getCellHeight();

        for (let i = rangeData.start.time;
            i <= rangeData.end.time;
            i = coordSys.getNextNDay(i, 1).time
        ) {

            let point = coordSys.dataToRect([i], false).tl;

            // every rect
            let rect = new graphic.Rect({
                shape: {
                    x: point[0],
                    y: point[1],
                    width: sw,
                    height: sh
                },
                cursor: 'default',
                style: itemRectStyleModel
            });

            group.add(rect);
        }

    }

    // render separate line
    _renderLines(
        calendarModel: CalendarModel,
        rangeData: CalendarParsedDateRangeInfo,
        orient: LayoutOrient,
        group: graphic.Group
    ) {

        let self = this;

        let coordSys = calendarModel.coordinateSystem;

        let lineStyleModel = calendarModel.getModel(['splitLine', 'lineStyle']).getLineStyle();
        let show = calendarModel.get(['splitLine', 'show']);

        let lineWidth = lineStyleModel.lineWidth;

        this._tlpoints = [];
        this._blpoints = [];
        this._firstDayOfMonth = [];
        this._firstDayPoints = [];


        let firstDay = rangeData.start;

        for (let i = 0; firstDay.time <= rangeData.end.time; i++) {
            addPoints(firstDay.formatedDate);

            if (i === 0) {
                firstDay = coordSys.getDateInfo(rangeData.start.y + '-' + rangeData.start.m);
            }

            let date = firstDay.date;
            date.setMonth(date.getMonth() + 1);
            firstDay = coordSys.getDateInfo(date);
        }

        addPoints(coordSys.getNextNDay(rangeData.end.time, 1).formatedDate);

        function addPoints(date: OptionDataValueDate) {

            self._firstDayOfMonth.push(coordSys.getDateInfo(date));
            self._firstDayPoints.push(coordSys.dataToRect([date], false).tl);

            let points = self._getLinePointsOfOneWeek(calendarModel, date, orient);

            self._tlpoints.push(points[0]);
            self._blpoints.push(points[points.length - 1]);

            show && self._drawSplitline(points, lineStyleModel, group);
        }


        // render top/left line
        show && this._drawSplitline(self._getEdgesPoints(self._tlpoints, lineWidth, orient), lineStyleModel, group);

        // render bottom/right line
        show && this._drawSplitline(self._getEdgesPoints(self._blpoints, lineWidth, orient), lineStyleModel, group);

    }

    // get points at both ends
    _getEdgesPoints(points: number[][], lineWidth: number, orient: LayoutOrient) {
        let rs = [points[0].slice(), points[points.length - 1].slice()];
        let idx = orient === 'horizontal' ? 0 : 1;

        // both ends of the line are extend half lineWidth
        rs[0][idx] = rs[0][idx] - lineWidth / 2;
        rs[1][idx] = rs[1][idx] + lineWidth / 2;

        return rs;
    }

    // render split line
    _drawSplitline(points: number[][], lineStyle: PathStyleProps, group: graphic.Group) {

        let poyline = new graphic.Polyline({
            z2: 20,
            shape: {
                points: points
            },
            style: lineStyle
        });

        group.add(poyline);
    }

    // render month line of one week points
    _getLinePointsOfOneWeek(calendarModel: CalendarModel, date: OptionDataValueDate, orient: LayoutOrient) {

        let coordSys = calendarModel.coordinateSystem;
        let parsedDate = coordSys.getDateInfo(date);

        let points = [];

        for (let i = 0; i < 7; i++) {

            let tmpD = coordSys.getNextNDay(parsedDate.time, i);
            let point = coordSys.dataToRect([tmpD.time], false);

            points[2 * tmpD.day] = point.tl;
            points[2 * tmpD.day + 1] = point[orient === 'horizontal' ? 'bl' : 'tr'];
        }

        return points;

    }

    _formatterLabel<T extends { nameMap: string }>(
        formatter: string | ((params: T) => string),
        params: T
    ) {

        if (typeof formatter === 'string' && formatter) {
            return formatUtil.formatTplSimple(formatter, params);
        }

        if (typeof formatter === 'function') {
            return formatter(params);
        }

        return params.nameMap;

    }

    _yearTextPositionControl(
        textEl: graphic.Text,
        point: number[],
        orient: LayoutOrient,
        position: 'left' | 'right' | 'top' | 'bottom',
        margin: number
    ): RichTextProps {

        point = point.slice();
        let aligns: [ZRTextAlign, ZRTextVerticalAlign] = ['center', 'bottom'];

        if (position === 'bottom') {
            point[1] += margin;
            aligns = ['center', 'top'];
        }
        else if (position === 'left') {
            point[0] -= margin;
        }
        else if (position === 'right') {
            point[0] += margin;
            aligns = ['center', 'top'];
        }
        else { // top
            point[1] -= margin;
        }

        let rotate = 0;
        if (position === 'left' || position === 'right') {
            rotate = Math.PI / 2;
        }

        return {
            rotation: rotate,
            position: point,
            style: {
                align: aligns[0],
                verticalAlign: aligns[1]
            }
        };
    }

    // render year
    _renderYearText(
        calendarModel: CalendarModel,
        rangeData: CalendarParsedDateRangeInfo,
        orient: LayoutOrient,
        group: graphic.Group
    ) {
        let yearLabel = calendarModel.getModel('yearLabel');

        if (!yearLabel.get('show')) {
            return;
        }

        let margin = yearLabel.get('margin');
        let pos = yearLabel.get('position');

        if (!pos) {
            pos = orient !== 'horizontal' ? 'top' : 'left';
        }

        let points = [this._tlpoints[this._tlpoints.length - 1], this._blpoints[0]];
        let xc = (points[0][0] + points[1][0]) / 2;
        let yc = (points[0][1] + points[1][1]) / 2;

        let idx = orient === 'horizontal' ? 0 : 1;

        let posPoints = {
            top: [xc, points[idx][1]],
            bottom: [xc, points[1 - idx][1]],
            left: [points[1 - idx][0], yc],
            right: [points[idx][0], yc]
        };

        let name = rangeData.start.y;

        if (+rangeData.end.y > +rangeData.start.y) {
            name = name + '-' + rangeData.end.y;
        }

        let formatter = yearLabel.get('formatter');

        let params = {
            start: rangeData.start.y,
            end: rangeData.end.y,
            nameMap: name
        };

        let content = this._formatterLabel(formatter, params);

        let yearText = new graphic.Text({
            z2: 30,
            style: graphic.createTextStyle(yearLabel, {
                text: content
            })
        });
        yearText.attr(this._yearTextPositionControl(yearText, posPoints[pos], orient, pos, margin));

        group.add(yearText);
    }

    _monthTextPositionControl(
        point: number[],
        isCenter: boolean,
        orient: LayoutOrient,
        position: 'start' | 'end',
        margin: number
    ): RichTextStyleProps {
        let align: ZRTextAlign = 'left';
        let vAlign: ZRTextVerticalAlign = 'top';
        let x = point[0];
        let y = point[1];

        if (orient === 'horizontal') {
            y = y + margin;

            if (isCenter) {
                align = 'center';
            }

            if (position === 'start') {
                vAlign = 'bottom';
            }
        }
        else {
            x = x + margin;

            if (isCenter) {
                vAlign = 'middle';
            }

            if (position === 'start') {
                align = 'right';
            }
        }

        return {
            x: x,
            y: y,
            align: align,
            verticalAlign: vAlign
        };
    }

    // render month and year text
    _renderMonthText(calendarModel: CalendarModel, orient: LayoutOrient, group: graphic.Group) {
        let monthLabel = calendarModel.getModel('monthLabel');

        if (!monthLabel.get('show')) {
            return;
        }

        let nameMap = monthLabel.get('nameMap');
        let margin = monthLabel.get('margin');
        let pos = monthLabel.get('position');
        let align = monthLabel.get('align');

        let termPoints = [this._tlpoints, this._blpoints];

        if (zrUtil.isString(nameMap)) {
            nameMap = MONTH_TEXT[nameMap.toUpperCase() as 'CN' | 'EN'] || [];
        }

        let idx = pos === 'start' ? 0 : 1;
        let axis = orient === 'horizontal' ? 0 : 1;
        margin = pos === 'start' ? -margin : margin;
        let isCenter = (align === 'center');

        for (let i = 0; i < termPoints[idx].length - 1; i++) {

            let tmp = termPoints[idx][i].slice();
            let firstDay = this._firstDayOfMonth[i];

            if (isCenter) {
                let firstDayPoints = this._firstDayPoints[i];
                tmp[axis] = (firstDayPoints[axis] + termPoints[0][i + 1][axis]) / 2;
            }

            let formatter = monthLabel.get('formatter');
            let name = nameMap[+firstDay.m - 1];
            let params = {
                yyyy: firstDay.y,
                yy: (firstDay.y + '').slice(2),
                MM: firstDay.m,
                M: +firstDay.m,
                nameMap: name
            };

            let content = this._formatterLabel(formatter, params);

            let monthText = new graphic.Text({
                z2: 30,
                style: zrUtil.extend(
                    graphic.createTextStyle(monthLabel, {text: content}),
                    this._monthTextPositionControl(tmp, isCenter, orient, pos, margin)
                )
            });

            group.add(monthText);
        }
    }

    _weekTextPositionControl(
        point: number[],
        orient: LayoutOrient,
        position: 'start' | 'end',
        margin: number,
        cellSize: number[]
    ): RichTextStyleProps {
        let align: ZRTextAlign = 'center';
        let vAlign: ZRTextVerticalAlign = 'middle';
        let x = point[0];
        let y = point[1];
        let isStart = position === 'start';

        if (orient === 'horizontal') {
            x = x + margin + (isStart ? 1 : -1) * cellSize[0] / 2;
            align = isStart ? 'right' : 'left';
        }
        else {
            y = y + margin + (isStart ? 1 : -1) * cellSize[1] / 2;
            vAlign = isStart ? 'bottom' : 'top';
        }

        return {
            x: x,
            y: y,
            align: align,
            verticalAlign: vAlign
        };
    }

    // render weeks
    _renderWeekText(
        calendarModel: CalendarModel,
        rangeData: CalendarParsedDateRangeInfo,
        orient: LayoutOrient,
        group: graphic.Group
    ) {
        let dayLabel = calendarModel.getModel('dayLabel');

        if (!dayLabel.get('show')) {
            return;
        }

        let coordSys = calendarModel.coordinateSystem;
        let pos = dayLabel.get('position');
        let nameMap = dayLabel.get('nameMap');
        let margin = dayLabel.get('margin');
        let firstDayOfWeek = coordSys.getFirstDayOfWeek();

        if (zrUtil.isString(nameMap)) {
            nameMap = WEEK_TEXT[nameMap.toUpperCase() as 'CN' | 'EN'] || [];
        }

        let start = coordSys.getNextNDay(
            rangeData.end.time, (7 - rangeData.lweek)
        ).time;

        let cellSize = [coordSys.getCellWidth(), coordSys.getCellHeight()];
        margin = numberUtil.parsePercent(margin, cellSize[orient === 'horizontal' ? 0 : 1]);

        if (pos === 'start') {
            start = coordSys.getNextNDay(
                rangeData.start.time, -(7 + rangeData.fweek)
            ).time;
            margin = -margin;
        }

        for (let i = 0; i < 7; i++) {

            let tmpD = coordSys.getNextNDay(start, i);
            let point = coordSys.dataToRect([tmpD.time], false).center;
            let day = i;
            day = Math.abs((i + firstDayOfWeek) % 7);
            let weekText = new graphic.Text({
                z2: 30,
                style: zrUtil.extend(
                    graphic.createTextStyle(dayLabel, {text: nameMap[day]}),
                    this._weekTextPositionControl(point, orient, pos, margin, cellSize)
                )
            });

            group.add(weekText);
        }
    }
}

ComponentView.registerClass(CalendarView);