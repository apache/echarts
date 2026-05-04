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

import { AxisLabelFormatterExtraParams } from '../coord/axisCommonTypes';
import type {
    NullUndefined, ParsedAxisBreak, ParsedAxisBreakList, AxisBreakOption,
    AxisBreakOptionIdentifierInAxis, ScaleTick, VisualAxisBreak,
} from '../util/types';
import { ValueTransformLookupOpt } from './helper';
import type Scale from './Scale';
import { ScaleMapper } from './scaleMapper';

/**
 * @file The facade of scale break.
 *  Separate the impl to reduce code size.
 *
 * @caution
 *  Must not import `scale/breakImpl.ts` directly or indirectly.
 *  Must not implement anything in this file.
 */


export interface BreakScaleMapper extends ScaleMapper {

    readonly breaks: ParsedAxisBreakList;

    hasBreaks(): boolean;

    calcNiceTickMultiple(
        tickVal: number,
        estimateNiceMultiple: (tickVal: number, brkEnd: number) => number
    ): number;

};

export type AxisBreakParsingResult = {
    breaks: ParsedAxisBreakList;
};

export type ParseBreakOptionOpt = {
    noNegative?: boolean;
};

export type ParseAxisBreakOptionInwardTransformOut = {
    lookup: ValueTransformLookupOpt['lookup'];
    original?: AxisBreakParsingResult;
    transformed?: AxisBreakParsingResult;
};

/**
 * Whether to remove any normal ticks that are too close to axis breaks.
 *  - 'auto': Default. Remove any normal ticks that are too close to axis breaks.
 *  - 'no': Do nothing pruning.
 *  - 'exclude_scale_bound': Prune but keep scale extent boundary.
 * For example:
 *  - For splitLine, if remove the tick on extent, split line on the boundary of cartesian
 *   will not be displayed, causing weird effect.
 *  - For labels, scale extent boundary should be pruned if in break, otherwise duplicated
 *   labels will displayed.
 */
export type ParamPruneByBreak = 'auto' | 'no' | 'preserve_extent_bound' | NullUndefined;

type BreakScaleHelper = {
    createBreakScaleMapper(
        breakParsed: AxisBreakParsingResult | NullUndefined,
        initialExtent: number[] | NullUndefined
    ): BreakScaleMapper;
    pruneTicksByBreak<TItem extends ScaleTick | number>(
        pruneByBreak: ParamPruneByBreak,
        ticks: TItem[],
        breaks: ParsedAxisBreakList,
        getValue: (item: TItem) => number,
        interval: number,
        scaleExtent: number[]
    ): void;
    addBreaksToTicks(
        ticks: ScaleTick[],
        breaks: ParsedAxisBreakList,
        scaleExtent: number[],
        getTimeProps?: (clampedBrk: ParsedAxisBreak) => ScaleTick['time'],
    ): void;
    parseAxisBreakOption(
        // raw user input breaks, retrieved from axis model.
        breakOptionList: AxisBreakOption[] | NullUndefined,
        scale: {parse: Scale['parse']},
        opt?: {
            noNegative: boolean;
        }
    ): AxisBreakParsingResult;
    identifyAxisBreak(
        brk: AxisBreakOption,
        identifier: AxisBreakOptionIdentifierInAxis
    ): boolean;
    serializeAxisBreakIdentifier(
        identifier: AxisBreakOptionIdentifierInAxis
    ): string;
    retrieveAxisBreakPairs<TItem, TReturnIdx extends boolean>(
        itemList: TItem[],
        getVisualAxisBreak: (item: TItem) => VisualAxisBreak | NullUndefined,
        returnIdx: TReturnIdx
    ): (
        TReturnIdx extends false ? TItem[][] : number[][]
    );
    getTicksBreakOutwardTransform(
        scale: ScaleMapper,
        tick: ScaleTick,
        outermostBreaks: ParsedAxisBreakList,
        lookup: ValueTransformLookupOpt['lookup']
    ): {
        tickVal: number | NullUndefined;
        vBreak: VisualAxisBreak | NullUndefined;
    } | NullUndefined;
    parseAxisBreakOptionInwardTransform(
        breakOptionList: AxisBreakOption[] | NullUndefined,
        scale: Scale,
        parseOpt: ParseBreakOptionOpt,
        lookupStartIdx: number,
        out: ParseAxisBreakOptionInwardTransformOut
    ): void;
    makeAxisLabelFormatterParamBreak(
        extraParam: AxisLabelFormatterExtraParams | NullUndefined,
        vBreak: VisualAxisBreak | NullUndefined
    ): AxisLabelFormatterExtraParams | NullUndefined;
};

let _impl: BreakScaleHelper = null;

export function registerScaleBreakHelperImpl(impl: BreakScaleHelper): void {
    if (!_impl) {
        _impl = impl;
    }
}

export function getScaleBreakHelper(): BreakScaleHelper | NullUndefined {
    return _impl;
}

export function simplyParseBreakOption(
    scale: {parse: Scale['parse']},
    opt: {
        breakOption?: AxisBreakOption[] | NullUndefined;
        breakParsed?: AxisBreakParsingResult | NullUndefined;
    }
): AxisBreakParsingResult | NullUndefined {
    const scaleBreakHelper = getScaleBreakHelper();
    const breakOption = opt.breakOption;
    let breakParsed = opt.breakParsed;
    if (!breakParsed && scaleBreakHelper) {
        breakParsed = scaleBreakHelper.parseAxisBreakOption(breakOption, scale);
    }
    return breakParsed;
}

export function getBreaksUnsafe(scale: Scale): ParsedAxisBreakList {
    const brk = scale.brk;
    return brk ? brk.breaks : [];
}

export function hasBreaks(scale: Scale): boolean {
    const brk = scale.brk;
    return brk ? brk.hasBreaks() : false;
}
