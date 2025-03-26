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

import type {
    NullUndefined, ParsedScaleBreak, ParsedScaleBreakList, ScaleBreakOption,
    ScaleBreakOptionIdentifier, ScaleTick, VisualScaleBreak
} from '../util/types';
import type Scale from './Scale';

/**
 * @file The fasade of scale break.
 *  Separate the impl to reduce code size.
 *
 * @caution
 *  Must not import `scale/breakImpl.ts` directly or indirectly.
 *  Must not implement anything in this file.
 */

export interface ScaleBreakContext {

    readonly breaks: ParsedScaleBreakList;

    setBreaks(parsed: ScaleBreakParsingResult): void;

    update(scaleExtent: [number, number]): void;

    hasBreaks(): boolean;

    calcNiceTickMultiple(
        tickVal: number,
        estimateNiceMultiple: (tickVal: number, brkEnd: number) => number
    ): number;

    getExtentSpan(): number;

    normalize(val: number): number;

    scale(val: number): number;

    elapse(val: number): number;

    unelapse(elapsedVal: number): number;

};

export type ScaleBreakParsingResult = {
    breaks: ParsedScaleBreakList;
};

export type ScaleBreakHelper = {
    createScaleBreakContext(): ScaleBreakContext;
    pruneTicksByBreak<TItem extends ScaleTick | number>(
        ticks: TItem[],
        breaks: ParsedScaleBreakList,
        getValue: (item: TItem) => number,
        interval: number,
        scaleExtent: [number, number]
    ): void;
    addBreaksToTicks(
        ticks: ScaleTick[],
        breaks: ParsedScaleBreakList,
        scaleExtent: [number, number],
        getTimeProps?: (clampedBrk: ParsedScaleBreak) => ScaleTick['time'],
    ): void;
    parseAxisBreakOption(
        breakOptionList: ScaleBreakOption[] | NullUndefined,
        parse: Scale['parse'],
        opt?: {
            noNegative: boolean;
        }
    ): ScaleBreakParsingResult;
    identifyAxisBreak(
        brk: ScaleBreakOption,
        identifier: ScaleBreakOptionIdentifier
    ): boolean;
    serializeAxisBreakIdentifier(
        identifier: ScaleBreakOptionIdentifier
    ): string;
    retrieveAxisBreakPairs<TItem>(
        itemList: TItem[],
        getVisualScaleBreak: (item: TItem) => VisualScaleBreak
    ): TItem[][];
    getTicksLogTransformBreak(
        tick: ScaleTick,
        logBase: number,
        logOriginalBreaks: ParsedScaleBreakList,
        fixRoundingError: (val: number, originalVal: number) => number
    ): {
        brkRoundingCriterion: number | NullUndefined;
        vBreak: VisualScaleBreak | NullUndefined;
    };
    logarithmicParseBreaksFromOption(
        breakOptionList: ScaleBreakOption[],
        logBase: number,
        parse: Scale['parse'],
    ): {
        parsedOriginal: ScaleBreakParsingResult;
        parsedLogged: ScaleBreakParsingResult;
    };
};

let _impl: ScaleBreakHelper = null;

export function registerScaleBreakHelperImpl(impl: ScaleBreakHelper): void {
    if (!_impl) {
        _impl = impl;
    }
}

export function getScaleBreakHelper(): ScaleBreakHelper | NullUndefined {
    return _impl;
}
