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

import type Group from 'zrender/src/graphic/Group';
import type Element from 'zrender/src/Element';
import { CoordinateSystemClipArea } from '../../coord/CoordinateSystem';
import type SeriesData from '../../data/SeriesData';
import type Model from '../../model/Model';
import {
    AnimationOptionMixin, ColorString, DefaultEmphasisFocus, ItemStyleOption, LabelOption,
    LineLabelOption,
    LineStyleOption,
    StageHandlerProgressParams, StatesOptionMixin, SymbolOptionMixin,
    ZRColor
} from '../../util/types';
import type Displayable from 'zrender/src/graphic/Displayable';


// ------ START: I_SYMBOL_DRAW ------

export interface ISymbolDraw {
    group: Group;

    updateData(data: ListForSymbolDraw, opt?: SymbolDrawUpdateOpt): void;

    incrementalPrepareUpdate(data: ListForSymbolDraw): void;

    incrementalUpdate(
        taskParams: StageHandlerProgressParams,
        data: ListForSymbolDraw,
        incrementalId: Displayable['incremental'],
        opt?: SymbolDrawUpdateOpt
    ): void;

    /**
     * NOTICE: `updateLayout` only works for the result of `updateData`.
     * The caller should ensure `updateLayout` to not be called if the result
     * does not exists or cleared by `incrementalPrepareUpdate` or `remove`.
     */
    updateLayout(opt?: SymbolDrawUpdateOpt): void;

    eachRendered(cb: (el: Element) => boolean | void): void;

    /**
     * It is typicall called on `ChartView['remove']` or `ChartView['dispose']`.
     */
    remove(enableAnimation?: boolean): void;
}

export interface SymbolDrawUpdateOpt {
    isIgnore?(idx: number): boolean
    clipShape?: CoordinateSystemClipArea,
    getSymbolPoint?(idx: number): number[]

    disableAnimation?: boolean
}

interface SymbolDrawStateOption {
    itemStyle?: ItemStyleOption
    label?: LabelOption
}

export type ListForSymbolDraw = SeriesData<Model<SymbolDrawItemModelOption & AnimationOptionMixin>>;

// TODO Separate series and item?
export interface SymbolDrawItemModelOption extends SymbolOptionMixin<object>,
    StatesOptionMixin<SymbolDrawStateOption, {
        emphasis?: {
            focus?: DefaultEmphasisFocus
            scale?: boolean | number
        }
    }>,
    SymbolDrawStateOption {

    cursor?: string

    // If has ripple effect
    rippleEffect?: RippleEffectOption
}

interface RippleEffectOption {
    period?: number
    /**
     * Scale of ripple
     */
    scale?: number

    brushType?: 'fill' | 'stroke'

    color?: ZRColor,

    /**
     * ripple number
     */
    number?: number
}

// ------ END: I_SYMBOL_DRAW ------


// ------ START: I_LINE_DRAW ------

export interface ILineDraw {
    group: Group;

    updateData(lineData: ListForLineDraw): void

    incrementalPrepareUpdate(lineData: ListForLineDraw): void;

    incrementalUpdate(
        taskParams: StageHandlerProgressParams,
        lineData: ListForLineDraw,
        incrementalId: Displayable['incremental']
    ): void;

    /**
     * NOTICE: `updateLayout` only works for the result of `updateData`.
     * The caller should ensure `updateLayout` to not be called if the result
     * does not exists or cleared by `incrementalPrepareUpdate` or `remove`.
     */
    updateLayout?: () => void;

    eachRendered(cb: (el: Element) => boolean | void): void;

    /**
     * It is typicall called on `ChartView['remove']` or `ChartView['dispose']`.
     */
    remove(): void
}

export type ListForLineDraw = SeriesData<Model<LineDrawModelOption & AnimationOptionMixin>>;

interface LineDrawStateOption {
    lineStyle?: LineStyleOption
    label?: LineLabelOption
}

export interface LineDrawModelOption extends LineDrawStateOption,
    StatesOptionMixin<LineDrawStateOption, {
        emphasis?: {
            focus?: DefaultEmphasisFocus
        }
    }> {
    // If has effect
    effect?: {
        show?: boolean
        period?: number
        delay?: number | ((idx: number) => number)
        /**
         * If move with constant speed px/sec
         * period will be ignored if this property is > 0,
         */
        constantSpeed?: number

        symbol?: string
        symbolSize?: number | number[]
        loop?: boolean
        roundTrip?: boolean
        /**
         * Length of trail, 0 - 1
         */
        trailLength?: number
        /**
         * Default to be same with lineStyle.color
         */
        color?: ColorString
    }
}

// ------ END: I_LINE_DRAW ------
