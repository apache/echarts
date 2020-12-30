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
import * as layout from '../../util/layout';
import * as numberUtil from '../../util/number';
import BoundingRect, {RectLike} from 'zrender/src/core/BoundingRect';
import CalendarModel from './CalendarModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import {
    LayoutOrient,
    ScaleDataValue,
    OptionDataValueDate,
    SeriesOption,
    SeriesOnCalendarOptionMixin
} from '../../util/types';
import { ParsedModelFinder, ParsedModelFinderKnown } from '../../util/model';
import { CoordinateSystem, CoordinateSystemMaster } from '../CoordinateSystem';
import SeriesModel from '../../model/Series';
import CoordinateSystemManager from '../../core/CoordinateSystem';

// (24*60*60*1000)
const PROXIMATE_ONE_DAY = 86400000;


export interface CalendarParsedDateRangeInfo {
    range: [string, string],
    start: CalendarParsedDateInfo
    end: CalendarParsedDateInfo
    allDay: number
    weeks: number
    nthWeek: number
    fweek: number
    lweek: number
}

export interface CalendarParsedDateInfo {
    /**
     * local full year, eg., '1940'
     */
    y: string
    /**
     * local month, from '01' ot '12',
     */
    m: string
    /**
     * local date, from '01' to '31' (if exists),
     */
    d: string
    /**
     * It is not date.getDay(). It is the location of the cell in a week, from 0 to 6,
     */
    day: number
    /**
     * Timestamp
     */
    time: number
    /**
     * yyyy-MM-dd
     */
    formatedDate: string
    /**
     * The original date object
     */
    date: Date
}

export interface CalendarCellRect {
    contentShape: RectLike
    center: number[]
    tl: number[]
    tr: number[]
    br: number[]
    bl: number[]
}

class Calendar implements CoordinateSystem, CoordinateSystemMaster {

    static readonly dimensions = ['time', 'value'];
    static getDimensionsInfo() {
        return [{
            name: 'time', type: 'time' as const
        }, 'value'];
    }

    readonly type = 'calendar';

    readonly dimensions = Calendar.dimensions;

    private _model: CalendarModel;

    private _rect: BoundingRect;

    private _sw: number;
    private _sh: number;
    private _orient: LayoutOrient;

    private _firstDayOfWeek: number;

    private _rangeInfo: CalendarParsedDateRangeInfo;

    private _lineWidth: number;

    constructor(calendarModel: CalendarModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._model = calendarModel;
    }
    // Required in createListFromData
    getDimensionsInfo = Calendar.getDimensionsInfo;

    getRangeInfo() {
        return this._rangeInfo;
    }

    getModel() {
        return this._model;
    }

    getRect() {
        return this._rect;
    }

    getCellWidth() {
        return this._sw;
    }

    getCellHeight() {
        return this._sh;
    }

    getOrient() {
        return this._orient;
    }

    /**
     * getFirstDayOfWeek
     *
     * @example
     *     0 : start at Sunday
     *     1 : start at Monday
     *
     * @return {number}
     */
    getFirstDayOfWeek() {
        return this._firstDayOfWeek;
    }

    /**
     * get date info
     * }
     */
    getDateInfo(date: OptionDataValueDate): CalendarParsedDateInfo {

        date = numberUtil.parseDate(date);

        const y = date.getFullYear();

        const m = date.getMonth() + 1;
        const mStr = m < 10 ? '0' + m : '' + m;

        const d = date.getDate();
        const dStr = d < 10 ? '0' + d : '' + d;

        let day = date.getDay();

        day = Math.abs((day + 7 - this.getFirstDayOfWeek()) % 7);

        return {
            y: y + '',
            m: mStr,
            d: dStr,
            day: day,
            time: date.getTime(),
            formatedDate: y + '-' + mStr + '-' + dStr,
            date: date
        };
    }

    getNextNDay(date: OptionDataValueDate, n: number) {
        n = n || 0;
        if (n === 0) {
            return this.getDateInfo(date);
        }

        date = new Date(this.getDateInfo(date).time);
        date.setDate(date.getDate() + n);

        return this.getDateInfo(date);
    }

    update(ecModel: GlobalModel, api: ExtensionAPI) {

        this._firstDayOfWeek = +this._model.getModel('dayLabel').get('firstDay');
        this._orient = this._model.get('orient');
        this._lineWidth = this._model.getModel('itemStyle').getItemStyle().lineWidth || 0;


        this._rangeInfo = this._getRangeInfo(this._initRangeOption());
        const weeks = this._rangeInfo.weeks || 1;
        const whNames = ['width', 'height'] as const;
        const cellSize = this._model.getCellSize().slice();
        const layoutParams = this._model.getBoxLayoutParams();
        const cellNumbers = this._orient === 'horizontal' ? [weeks, 7] : [7, weeks];

        zrUtil.each([0, 1] as const, function (idx) {
            if (cellSizeSpecified(cellSize, idx)) {
                layoutParams[whNames[idx]] = cellSize[idx] * cellNumbers[idx];
            }
        });

        const whGlobal = {
            width: api.getWidth(),
            height: api.getHeight()
        };
        const calendarRect = this._rect = layout.getLayoutRect(layoutParams, whGlobal);

        zrUtil.each([0, 1], function (idx) {
            if (!cellSizeSpecified(cellSize, idx)) {
                cellSize[idx] = calendarRect[whNames[idx]] / cellNumbers[idx];
            }
        });

        function cellSizeSpecified(cellSize: (number | 'auto')[], idx: number): cellSize is number[] {
            return cellSize[idx] != null && cellSize[idx] !== 'auto';
        }

        // Has been calculated out number.
        this._sw = cellSize[0] as number;
        this._sh = cellSize[1] as number;
    }


    /**
     * Convert a time data(time, value) item to (x, y) point.
     */
    // TODO Clamp of calendar is not same with cartesian coordinate systems.
    // It will return NaN if data exceeds.
    dataToPoint(data: OptionDataValueDate | OptionDataValueDate[], clamp?: boolean) {
        zrUtil.isArray(data) && (data = data[0]);
        clamp == null && (clamp = true);

        const dayInfo = this.getDateInfo(data);
        const range = this._rangeInfo;
        const date = dayInfo.formatedDate;

        // if not in range return [NaN, NaN]
        if (clamp && !(
            dayInfo.time >= range.start.time
            && dayInfo.time < range.end.time + PROXIMATE_ONE_DAY
        )) {
            return [NaN, NaN];
        }

        const week = dayInfo.day;
        const nthWeek = this._getRangeInfo([range.start.time, date]).nthWeek;

        if (this._orient === 'vertical') {
            return [
                this._rect.x + week * this._sw + this._sw / 2,
                this._rect.y + nthWeek * this._sh + this._sh / 2
            ];

        }

        return [
            this._rect.x + nthWeek * this._sw + this._sw / 2,
            this._rect.y + week * this._sh + this._sh / 2
        ];

    }

    /**
     * Convert a (x, y) point to time data
     */
    pointToData(point: number[]): number {

        const date = this.pointToDate(point);

        return date && date.time;
    }

    /**
     * Convert a time date item to (x, y) four point.
     */
    dataToRect(data: OptionDataValueDate | OptionDataValueDate[], clamp?: boolean): CalendarCellRect {
        const point = this.dataToPoint(data, clamp);

        return {
            contentShape: {
                x: point[0] - (this._sw - this._lineWidth) / 2,
                y: point[1] - (this._sh - this._lineWidth) / 2,
                width: this._sw - this._lineWidth,
                height: this._sh - this._lineWidth
            },

            center: point,

            tl: [
                point[0] - this._sw / 2,
                point[1] - this._sh / 2
            ],

            tr: [
                point[0] + this._sw / 2,
                point[1] - this._sh / 2
            ],

            br: [
                point[0] + this._sw / 2,
                point[1] + this._sh / 2
            ],

            bl: [
                point[0] - this._sw / 2,
                point[1] + this._sh / 2
            ]

        };
    }

    /**
     * Convert a (x, y) point to time date
     *
     * @param  {Array} point point
     * @return {Object}       date
     */
    pointToDate(point: number[]): CalendarParsedDateInfo {
        const nthX = Math.floor((point[0] - this._rect.x) / this._sw) + 1;
        const nthY = Math.floor((point[1] - this._rect.y) / this._sh) + 1;
        const range = this._rangeInfo.range;

        if (this._orient === 'vertical') {
            return this._getDateByWeeksAndDay(nthY, nthX - 1, range);
        }

        return this._getDateByWeeksAndDay(nthX, nthY - 1, range);
    }

    convertToPixel(ecModel: GlobalModel, finder: ParsedModelFinder, value: ScaleDataValue | ScaleDataValue[]) {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.dataToPoint(value) : null;
    }

    convertFromPixel(ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]) {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.pointToData(pixel) : null;
    }

    containPoint(point: number[]): boolean {
        console.warn('Not implemented.');
        return false;
    }

    /**
     * initRange
     * Normalize to an [start, end] array
     */
    private _initRangeOption(): OptionDataValueDate[] {
        let range = this._model.get('range');
        let normalizedRange: OptionDataValueDate[];

        // Convert [1990] to 1990
        if (zrUtil.isArray(range) && range.length === 1) {
            range = range[0];
        }

        if (!zrUtil.isArray(range)) {
            const rangeStr = range.toString();
            // One year.
            if (/^\d{4}$/.test(rangeStr)) {
                normalizedRange = [rangeStr + '-01-01', rangeStr + '-12-31'];
            }
            // One month
            if (/^\d{4}[\/|-]\d{1,2}$/.test(rangeStr)) {

                const start = this.getDateInfo(rangeStr);
                const firstDay = start.date;
                firstDay.setMonth(firstDay.getMonth() + 1);

                const end = this.getNextNDay(firstDay, -1);
                normalizedRange = [start.formatedDate, end.formatedDate];
            }
            // One day
            if (/^\d{4}[\/|-]\d{1,2}[\/|-]\d{1,2}$/.test(rangeStr)) {
                normalizedRange = [rangeStr, rangeStr];
            }
        }
        else {
            normalizedRange = range;
        }

        if (!normalizedRange) {
            if (__DEV__) {
                zrUtil.logError('Invalid date range.');
            }
            // Not handling it.
            return range as OptionDataValueDate[];
        }

        const tmp = this._getRangeInfo(normalizedRange);

        if (tmp.start.time > tmp.end.time) {
            normalizedRange.reverse();
        }

        return normalizedRange;
    }

    /**
     * range info
     *
     * @private
     * @param  {Array} range range ['2017-01-01', '2017-07-08']
     *  If range[0] > range[1], they will not be reversed.
     * @return {Object}       obj
     */
    _getRangeInfo(range: OptionDataValueDate[]): CalendarParsedDateRangeInfo {
        const parsedRange = [
            this.getDateInfo(range[0]),
            this.getDateInfo(range[1])
        ];

        let reversed;
        if (parsedRange[0].time > parsedRange[1].time) {
            reversed = true;
            parsedRange.reverse();
        }

        let allDay = Math.floor(parsedRange[1].time / PROXIMATE_ONE_DAY)
            - Math.floor(parsedRange[0].time / PROXIMATE_ONE_DAY) + 1;

        // Consider case1 (#11677 #10430):
        // Set the system timezone as "UK", set the range to `['2016-07-01', '2016-12-31']`

        // Consider case2:
        // Firstly set system timezone as "Time Zone: America/Toronto",
        // ```
        // let first = new Date(1478412000000 - 3600 * 1000 * 2.5);
        // let second = new Date(1478412000000);
        // let allDays = Math.floor(second / ONE_DAY) - Math.floor(first / ONE_DAY) + 1;
        // ```
        // will get wrong result because of DST. So we should fix it.
        const date = new Date(parsedRange[0].time);
        const startDateNum = date.getDate();
        const endDateNum = parsedRange[1].date.getDate();
        date.setDate(startDateNum + allDay - 1);
        // The bias can not over a month, so just compare date.
        let dateNum = date.getDate();
        if (dateNum !== endDateNum) {
            const sign = date.getTime() - parsedRange[1].time > 0 ? 1 : -1;
            while (
                (dateNum = date.getDate()) !== endDateNum
                && (date.getTime() - parsedRange[1].time) * sign > 0
            ) {
                allDay -= sign;
                date.setDate(dateNum - sign);
            }
        }

        const weeks = Math.floor((allDay + parsedRange[0].day + 6) / 7);
        const nthWeek = reversed ? -weeks + 1 : weeks - 1;

        reversed && parsedRange.reverse();

        return {
            range: [parsedRange[0].formatedDate, parsedRange[1].formatedDate],
            start: parsedRange[0],
            end: parsedRange[1],
            allDay: allDay,
            weeks: weeks,
            // From 0.
            nthWeek: nthWeek,
            fweek: parsedRange[0].day,
            lweek: parsedRange[1].day
        };
    }

    /**
     * get date by nthWeeks and week day in range
     *
     * @private
     * @param  {number} nthWeek the week
     * @param  {number} day   the week day
     * @param  {Array} range [d1, d2]
     * @return {Object}
     */
    private _getDateByWeeksAndDay(nthWeek: number, day: number, range: OptionDataValueDate[]): CalendarParsedDateInfo {
        const rangeInfo = this._getRangeInfo(range);

        if (nthWeek > rangeInfo.weeks
            || (nthWeek === 0 && day < rangeInfo.fweek)
            || (nthWeek === rangeInfo.weeks && day > rangeInfo.lweek)
        ) {
            return null;
        }

        const nthDay = (nthWeek - 1) * 7 - rangeInfo.fweek + day;
        const date = new Date(rangeInfo.start.time);
        date.setDate(+rangeInfo.start.d + nthDay);

        return this.getDateInfo(date);
    }

    static create(ecModel: GlobalModel, api: ExtensionAPI) {
        const calendarList: Calendar[] = [];

        ecModel.eachComponent('calendar', function (calendarModel: CalendarModel) {
            const calendar = new Calendar(calendarModel, ecModel, api);
            calendarList.push(calendar);
            calendarModel.coordinateSystem = calendar;
        });

        ecModel.eachSeries(function (calendarSeries: SeriesModel<SeriesOption & SeriesOnCalendarOptionMixin>) {
            if (calendarSeries.get('coordinateSystem') === 'calendar') {
                // Inject coordinate system
                calendarSeries.coordinateSystem = calendarList[calendarSeries.get('calendarIndex') || 0];
            }
        });
        return calendarList;
    }
}

function getCoordSys(finder: ParsedModelFinderKnown): Calendar {
    const calendarModel = finder.calendarModel as CalendarModel;
    const seriesModel = finder.seriesModel;

    const coordSys = calendarModel
        ? calendarModel.coordinateSystem
        : seriesModel
        ? seriesModel.coordinateSystem
        : null;

    return coordSys as Calendar;
}

export default Calendar;
