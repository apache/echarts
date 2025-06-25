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


import * as clazzUtil from '../util/clazz';
import { Dictionary } from 'zrender/src/core/types';
import SeriesData from '../data/SeriesData';
import {
    DimensionName,
    ScaleDataValue,
    DimensionLoose,
    ScaleTick,
    AxisBreakOption,
    NullUndefined,
    ParsedAxisBreakList,
} from '../util/types';
import {
    ScaleCalculator
} from './helper';
import { ScaleRawExtentInfo } from '../coord/scaleRawExtentInfo';
import { bind } from 'zrender/src/core/util';
import { ScaleBreakContext, AxisBreakParsingResult, getScaleBreakHelper, ParamPruneByBreak } from './break';

export type ScaleGetTicksOpt = {
    // Whether expand the ticks to niced extent.
    expandToNicedExtent?: boolean;
    pruneByBreak?: ParamPruneByBreak;
    // - not specified or undefined(default): insert the breaks as items into the tick array.
    // - 'only-break': return break ticks only without any normal ticks.
    // - 'none': return only normal ticks without any break ticks. Useful when creating split
    //      line / split area, where break area is rendered using zigzag line.
    // NOTE: The returned break ticks do not outside axis extent. And if a break only intersects
    //  with axis extent at start or end, it does not count as a tick.
    breakTicks?: 'only_break' | 'none' | NullUndefined;
};

export type ScaleSettingDefault = Dictionary<unknown>;

abstract class Scale<SETTING extends ScaleSettingDefault = ScaleSettingDefault> {

    type: string;

    private _setting: SETTING;

    // [CAVEAT]: Should update only by `_innerSetExtent`!
    // Make sure that extent[0] always <= extent[1].
    protected _extent: [number, number];

    // FIXME: Effectively, both logorithmic scale and break scale are numeric axis transformation
    //  mechanisms. However, for historical reason, logorithmic scale is implemented as a subclass,
    //  while break scale is implemented inside the base class `Scale`. If more transformations
    //  need to be introduced in futher, we should probably refactor them for better orthogonal
    //  composition. (e.g. use decorator-like patterns rather than the current class inheritance?)
    protected _brkCtx: ScaleBreakContext | NullUndefined;

    protected _calculator: ScaleCalculator = new ScaleCalculator();

    private _isBlank: boolean;

    // Inject
    readonly rawExtentInfo: ScaleRawExtentInfo;

    constructor(setting?: SETTING) {
        this._setting = setting || {} as SETTING;
        this._extent = [Infinity, -Infinity];
        const scaleBreakHelper = getScaleBreakHelper();
        if (scaleBreakHelper) {
            this._brkCtx = scaleBreakHelper.createScaleBreakContext();
            this._brkCtx!.update(this._extent);
        }
    }

    getSetting<KEY extends keyof SETTING>(name: KEY): SETTING[KEY] {
        return this._setting[name];
    }

    /**
     * Parse input val to valid inner number.
     * Notice: This would be a trap here, If the implementation
     * of this method depends on extent, and this method is used
     * before extent set (like in dataZoom), it would be wrong.
     * Nevertheless, parse does not depend on extent generally.
     */
    abstract parse(val: ScaleDataValue): number;

    /**
     * Whether contain the given value.
     */
    abstract contain(val: number): boolean;

    /**
     * Normalize value to linear [0, 1], return 0.5 if extent span is 0.
     */
    abstract normalize(val: number): number;

    /**
     * Scale normalized value to extent.
     */
    abstract scale(val: number): number;

    /**
     * [CAVEAT]: It should not be overridden!
     */
    _innerUnionExtent(other: [number, number]): void {
        const extent = this._extent;
        // Considered that number could be NaN and should not write into the extent.
        this._innerSetExtent(
            other[0] < extent[0] ? other[0] : extent[0],
            other[1] > extent[1] ? other[1] : extent[1]
        );
    }

    /**
     * Set extent from data
     */
    unionExtentFromData(data: SeriesData, dim: DimensionName | DimensionLoose): void {
        this._innerUnionExtent(data.getApproximateExtent(dim));
    }

    /**
     * Get a new slice of extent.
     * Extent is always in increase order.
     */
    getExtent(): [number, number] {
        return this._extent.slice() as [number, number];
    }

    setExtent(start: number, end: number): void {
        this._innerSetExtent(start, end);
    }

    /**
     * [CAVEAT]: It should not be overridden!
     */
    protected _innerSetExtent(start: number, end: number): void {
        const thisExtent = this._extent;
        if (!isNaN(start)) {
            thisExtent[0] = start;
        }
        if (!isNaN(end)) {
            thisExtent[1] = end;
        }
        this._brkCtx && this._brkCtx.update(thisExtent);
    }

    /**
     * Prerequisite: Scale#parse is ready.
     */
    setBreaksFromOption(
        breakOptionList: AxisBreakOption[],
    ): void {
        const scaleBreakHelper = getScaleBreakHelper();
        if (scaleBreakHelper) {
            this._innerSetBreak(
                scaleBreakHelper.parseAxisBreakOption(breakOptionList, bind(this.parse, this))
            );
        }
    }

    /**
     * [CAVEAT]: It should not be overridden!
     */
    _innerSetBreak(parsed: AxisBreakParsingResult) {
        if (this._brkCtx) {
            this._brkCtx.setBreaks(parsed);
            this._calculator.updateMethods(this._brkCtx);
            this._brkCtx.update(this._extent);
        }
    }

    /**
     * [CAVEAT]: It should not be overridden!
     */
    _innerGetBreaks(): ParsedAxisBreakList {
        return this._brkCtx ? this._brkCtx.breaks : [];
    }

    /**
     * Do not expose the internal `_breaks` unless necessary.
     */
    hasBreaks(): boolean {
        return this._brkCtx ? this._brkCtx.hasBreaks() : false;
    }

    protected _getExtentSpanWithBreaks() {
        return (this._brkCtx && this._brkCtx.hasBreaks())
            ? this._brkCtx.getExtentSpan()
            : this._extent[1] - this._extent[0];
    }

    /**
     * If value is in extent range
     */
    isInExtentRange(value: number): boolean {
        return this._extent[0] <= value && this._extent[1] >= value;
    }

    /**
     * When axis extent depends on data and no data exists,
     * axis ticks should not be drawn, which is named 'blank'.
     */
    isBlank(): boolean {
        return this._isBlank;
    }

    /**
     * When axis extent depends on data and no data exists,
     * axis ticks should not be drawn, which is named 'blank'.
     */
    setBlank(isBlank: boolean) {
        this._isBlank = isBlank;
    }

    /**
     * Update interval and extent of intervals for nice ticks
     *
     * @param splitNumber Approximated tick numbers. Optional.
     *        The implementation of `niceTicks` should decide tick numbers
     *        whether `splitNumber` is given.
     * @param minInterval Optional.
     * @param maxInterval Optional.
     */
    abstract calcNiceTicks(
        // FIXME:TS make them in a "opt", the same with `niceExtent`?
        splitNumber?: number,
        minInterval?: number,
        maxInterval?: number
    ): void;

    abstract calcNiceExtent(
        opt?: {
            splitNumber?: number,
            fixMin?: boolean,
            fixMax?: boolean,
            minInterval?: number,
            maxInterval?: number
        }
    ): void;

    /**
     * @return label of the tick.
     */
    abstract getLabel(tick: ScaleTick): string;

    abstract getTicks(opt?: ScaleGetTicksOpt): ScaleTick[];

    abstract getMinorTicks(splitNumber: number): number[][];

    static registerClass: clazzUtil.ClassManager['registerClass'];

    static getClass: clazzUtil.ClassManager['getClass'];
}

type ScaleConstructor = typeof Scale & clazzUtil.ClassManager;
clazzUtil.enableClassManagement(Scale as ScaleConstructor);

export default Scale;