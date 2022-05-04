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

import { isString, extend, map, isFunction } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import {createTextStyle} from '../../label/labelStyle';
import { formatTplSimple } from '../../util/format';
import { parsePercent } from '../../util/number';
import type CalendarModel from '../../coord/calendar/CalendarModel';
import {CalendarParsedDateRangeInfo, CalendarParsedDateInfo} from '../../coord/calendar/Calendar';
import type GlobalModel from '../../model/Global';
import type ExtensionAPI from '../../core/ExtensionAPI';
import { LayoutOrient, OptionDataValueDate, ZRTextAlign, ZRTextVerticalAlign } from '../../util/types';
import ComponentView from '../../view/Component';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { TextStyleProps, TextProps } from 'zrender/src/graphic/Text';
import { LocaleOption, getLocaleModel } from '../../core/locale';
import type Model from '../../model/Model';

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

        const group = this.group;

        group.removeAll();

        const coordSys = calendarModel.coordinateSystem;

        // range info
        const rangeData = coordSys.getRangeInfo();
        const orient = coordSys.getOrient();

        // locale
        const localeModel = ecModel.getLocaleModel();

        this._renderDayRect(calendarModel, rangeData, group);

        // _renderLines must be called prior to following function
        this._renderLines(calendarModel, rangeData, orient, group);

        this._renderYearText(calendarModel, rangeData, orient, group);

        this._renderMonthText(calendarModel, localeModel, orient, group);

        this._renderWeekText(calendarModel, localeModel, rangeData, orient, group);
    }

    // render day rect
    _renderDayRect(calendarModel: CalendarModel, rangeData: CalendarParsedDateRangeInfo, group: graphic.Group) {
        const coordSys = calendarModel.coordinateSystem;
        const itemRectStyleModel = calendarModel.getModel('itemStyle').getItemStyle();
        const sw = coordSys.getCellWidth();
        const sh = coordSys.getCellHeight();

        for (let i = rangeData.start.time;
            i <= rangeData.end.time;
            i = coordSys.getNextNDay(i, 1).time
        ) {

            const point = coordSys.dataToRect([i], false).tl;

            // every rect
            const rect = new graphic.Rect({
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

        const self = this;

        const coordSys = calendarModel.coordinateSystem;

        const lineStyleModel = calendarModel.getModel(['splitLine', 'lineStyle']).getLineStyle();
        const show = calendarModel.get(['splitLine', 'show']);

        const lineWidth = lineStyleModel.lineWidth;

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

            const date = firstDay.date;
            date.setMonth(date.getMonth() + 1);
            firstDay = coordSys.getDateInfo(date);
        }

        addPoints(coordSys.getNextNDay(rangeData.end.time, 1).formatedDate);

        function addPoints(date: OptionDataValueDate) {

            self._firstDayOfMonth.push(coordSys.getDateInfo(date));
            self._firstDayPoints.push(coordSys.dataToRect([date], false).tl);

            const points = self._getLinePointsOfOneWeek(calendarModel, date, orient);

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
        const rs = [points[0].slice(), points[points.length - 1].slice()];
        const idx = orient === 'horizontal' ? 0 : 1;

        // both ends of the line are extend half lineWidth
        rs[0][idx] = rs[0][idx] - lineWidth / 2;
        rs[1][idx] = rs[1][idx] + lineWidth / 2;

        return rs;
    }

    // render split line
    _drawSplitline(points: number[][], lineStyle: PathStyleProps, group: graphic.Group) {

        const poyline = new graphic.Polyline({
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

        const coordSys = calendarModel.coordinateSystem;
        const parsedDate = coordSys.getDateInfo(date);

        const points = [];

        for (let i = 0; i < 7; i++) {

            const tmpD = coordSys.getNextNDay(parsedDate.time, i);
            const point = coordSys.dataToRect([tmpD.time], false);

            points[2 * tmpD.day] = point.tl;
            points[2 * tmpD.day + 1] = point[orient === 'horizontal' ? 'bl' : 'tr'];
        }

        return points;

    }

    _formatterLabel<T extends { nameMap: string }>(
        formatter: string | ((params: T) => string),
        params: T
    ) {

        if (isString(formatter) && formatter) {
            return formatTplSimple(formatter, params);
        }

        if (isFunction(formatter)) {
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
    ): TextProps {

        let x = point[0];
        let y = point[1];
        let aligns: [ZRTextAlign, ZRTextVerticalAlign] = ['center', 'bottom'];

        if (position === 'bottom') {
            y += margin;
            aligns = ['center', 'top'];
        }
        else if (position === 'left') {
            x -= margin;
        }
        else if (position === 'right') {
            x += margin;
            aligns = ['center', 'top'];
        }
        else { // top
            y -= margin;
        }

        let rotate = 0;
        if (position === 'left' || position === 'right') {
            rotate = Math.PI / 2;
        }

        return {
            rotation: rotate,
            x,
            y,
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
        const yearLabel = calendarModel.getModel('yearLabel');

        if (!yearLabel.get('show')) {
            return;
        }

        const margin = yearLabel.get('margin');
        let pos = yearLabel.get('position');

        if (!pos) {
            pos = orient !== 'horizontal' ? 'top' : 'left';
        }

        const points = [this._tlpoints[this._tlpoints.length - 1], this._blpoints[0]];
        const xc = (points[0][0] + points[1][0]) / 2;
        const yc = (points[0][1] + points[1][1]) / 2;

        const idx = orient === 'horizontal' ? 0 : 1;

        const posPoints = {
            top: [xc, points[idx][1]],
            bottom: [xc, points[1 - idx][1]],
            left: [points[1 - idx][0], yc],
            right: [points[idx][0], yc]
        };

        let name = rangeData.start.y;

        if (+rangeData.end.y > +rangeData.start.y) {
            name = name + '-' + rangeData.end.y;
        }

        const formatter = yearLabel.get('formatter');

        const params = {
            start: rangeData.start.y,
            end: rangeData.end.y,
            nameMap: name
        };

        const content = this._formatterLabel(formatter, params);

        const yearText = new graphic.Text({
            z2: 30,
            style: createTextStyle(yearLabel, {
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
    ): TextStyleProps {
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
    _renderMonthText(
        calendarModel: CalendarModel,
        localeModel: Model<LocaleOption>,
        orient: LayoutOrient,
        group: graphic.Group
    ) {
        const monthLabel = calendarModel.getModel('monthLabel');

        if (!monthLabel.get('show')) {
            return;
        }

        let nameMap = monthLabel.get('nameMap');
        let margin = monthLabel.get('margin');
        const pos = monthLabel.get('position');
        const align = monthLabel.get('align');

        const termPoints = [this._tlpoints, this._blpoints];

        if (!nameMap || isString(nameMap)) {
            if (nameMap) {
                // case-sensitive
                localeModel = getLocaleModel(nameMap as string) || localeModel;
            }
            // PENDING
            // for ZH locale, original form is `一月` but current form is `1月`
            nameMap = localeModel.get(['time', 'monthAbbr']) || [];
        }

        const idx = pos === 'start' ? 0 : 1;
        const axis = orient === 'horizontal' ? 0 : 1;
        margin = pos === 'start' ? -margin : margin;
        const isCenter = (align === 'center');

        for (let i = 0; i < termPoints[idx].length - 1; i++) {

            const tmp = termPoints[idx][i].slice();
            const firstDay = this._firstDayOfMonth[i];

            if (isCenter) {
                const firstDayPoints = this._firstDayPoints[i];
                tmp[axis] = (firstDayPoints[axis] + termPoints[0][i + 1][axis]) / 2;
            }

            const formatter = monthLabel.get('formatter');
            const name = nameMap[+firstDay.m - 1];
            const params = {
                yyyy: firstDay.y,
                yy: (firstDay.y + '').slice(2),
                MM: firstDay.m,
                M: +firstDay.m,
                nameMap: name
            };

            const content = this._formatterLabel(formatter, params);

            const monthText = new graphic.Text({
                z2: 30,
                style: extend(
                    createTextStyle(monthLabel, {text: content}),
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
    ): TextStyleProps {
        let align: ZRTextAlign = 'center';
        let vAlign: ZRTextVerticalAlign = 'middle';
        let x = point[0];
        let y = point[1];
        const isStart = position === 'start';

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
        localeModel: Model<LocaleOption>,
        rangeData: CalendarParsedDateRangeInfo,
        orient: LayoutOrient,
        group: graphic.Group
    ) {
        const dayLabel = calendarModel.getModel('dayLabel');

        if (!dayLabel.get('show')) {
            return;
        }

        const coordSys = calendarModel.coordinateSystem;
        const pos = dayLabel.get('position');
        let nameMap = dayLabel.get('nameMap');
        let margin = dayLabel.get('margin');
        const firstDayOfWeek = coordSys.getFirstDayOfWeek();

        if (!nameMap || isString(nameMap)) {
            if (nameMap) {
                // case-sensitive
                localeModel = getLocaleModel(nameMap as string) || localeModel;
            }
            // Use the first letter of `dayOfWeekAbbr` if `dayOfWeekShort` doesn't exist in the locale file
            const dayOfWeekShort = localeModel.get(['time', 'dayOfWeekShort' as any]);
            nameMap = dayOfWeekShort || map(
                localeModel.get(['time', 'dayOfWeekAbbr']),
                val => val[0]
            );
        }

        let start = coordSys.getNextNDay(
            rangeData.end.time, (7 - rangeData.lweek)
        ).time;

        const cellSize = [coordSys.getCellWidth(), coordSys.getCellHeight()];
        margin = parsePercent(margin, Math.min(cellSize[1], cellSize[0]));

        if (pos === 'start') {
            start = coordSys.getNextNDay(
                rangeData.start.time, -(7 + rangeData.fweek)
            ).time;
            margin = -margin;
        }

        for (let i = 0; i < 7; i++) {

            const tmpD = coordSys.getNextNDay(start, i);
            const point = coordSys.dataToRect([tmpD.time], false).center;
            let day = i;
            day = Math.abs((i + firstDayOfWeek) % 7);
            const weekText = new graphic.Text({
                z2: 30,
                style: extend(
                    createTextStyle(dayLabel, {text: nameMap[day]}),
                    this._weekTextPositionControl(point, orient, pos, margin, cellSize)
                )
            });

            group.add(weekText);
        }
    }
}

export default CalendarView;
