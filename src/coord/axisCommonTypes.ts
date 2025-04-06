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

import { TextAlign, TextVerticalAlign } from 'zrender/src/core/types';
import {
    TextCommonOption, LineStyleOption, OrdinalRawValue, ZRColor,
    AreaStyleOption, ComponentOption, ColorString,
    AnimationOptionMixin, Dictionary, ScaleDataValue, CommonAxisPointerOption, AxisBreakOption, ItemStyleOption,
    NullUndefined,
    AxisLabelFormatterExtraBreakPart,
    TimeScaleTick,
} from '../util/types';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import type { PrimaryTimeUnit } from '../util/time';


export const AXIS_TYPES = {value: 1, category: 1, time: 1, log: 1} as const;
export type OptionAxisType = keyof typeof AXIS_TYPES;

export interface AxisBaseOptionCommon extends ComponentOption,
    AnimationOptionMixin {
    type?: OptionAxisType;
    show?: boolean;
    // Inverse the axis.
    inverse?: boolean;
    // Axis name displayed.
    name?: string;
    nameLocation?: 'start' | 'middle' | 'end';
    // By degree.
    nameRotate?: number;
    nameTruncate?: {
        maxWidth?: number;
        ellipsis?: string;
        placeholder?: string;
    };
    nameTextStyle?: AxisNameTextStyleOption;
    // The gap between axisName and axisLine.
    nameGap?: number;

    silent?: boolean;
    triggerEvent?: boolean;

    tooltip?: {
        show?: boolean;
    };

    axisLabel?: AxisLabelBaseOption;

    axisPointer?: CommonAxisPointerOption;
    axisLine?: AxisLineOption;
    axisTick?: AxisTickOption;
    minorTick?: MinorTickOption;
    splitLine?: SplitLineOption;
    minorSplitLine?: MinorSplitLineOption;
    splitArea?: SplitAreaOption;

    /**
     * Min value of the axis. can be:
     * + ScaleDataValue
     * + 'dataMin': use the min value in data.
     * + null/undefined: auto decide min value (consider pretty look and boundaryGap).
     */
    min?: ScaleDataValue | 'dataMin' | ((extent: {min: number, max: number}) => ScaleDataValue);
    /**
     * Max value of the axis. can be:
     * + ScaleDataValue
     * + 'dataMax': use the max value in data.
     * + null/undefined: auto decide max value (consider pretty look and boundaryGap).
     */
    max?: ScaleDataValue | 'dataMax' | ((extent: {min: number, max: number}) => ScaleDataValue);
    startValue?: number;

    breaks?: AxisBreakOption[];
    breakArea?: {
        show?: boolean;
        itemStyle?: ItemStyleOption;
        zigzagAmplitude?: number;
        zigzagMinSpan?: number;
        zigzagMaxSpan?: number;
        zigzagZ: number;
        expandOnClick?: boolean;
    };
    breakLabelLayout?: {
        moveOverlap?: 'auto' | boolean;
    }
}

export interface NumericAxisBaseOptionCommon extends AxisBaseOptionCommon {
    /*
     * The gap at both ends of the axis.
     * [GAP, GAP], where
     * `GAP` can be an absolute pixel number (like `35`), or percent (like `'30%'`)
     */
    boundaryGap?: [number | string, number | string]

    /**
     * AxisTick and axisLabel and splitLine are calculated based on splitNumber.
     */
    splitNumber?: number;
    /**
     * Interval specifies the span of the ticks is mandatorily.
     */
    interval?: number;
    /**
     * Specify min interval when auto calculate tick interval.
     */
    minInterval?: number;
    /**
     * Specify max interval when auto calculate tick interval.
     */
    maxInterval?: number;

    /**
     * If align ticks to the first axis that is not use alignTicks
     * If all axes has alignTicks: true. The first one will be applied.
     *
     * Will be ignored if interval is set.
     */
    alignTicks?: boolean
}

export interface CategoryAxisBaseOption extends AxisBaseOptionCommon {
    type?: 'category';
    boundaryGap?: boolean
    axisLabel?: AxisLabelOption<'category'>;
    data?: (OrdinalRawValue | {
        value: OrdinalRawValue;
        textStyle?: TextCommonOption;
    })[];
    /*
     * Set false to faster category collection.
     * Only useful in the case like: category is
     * ['2012-01-01', '2012-01-02', ...], where the input
     * data has been ensured not duplicate and is large data.
     * null means "auto":
     * if axis.data provided, do not deduplication,
     * else do deduplication.
     */
    deduplication?: boolean;

    axisTick?: AxisBaseOptionCommon['axisTick'] & {
        // If tick is align with label when boundaryGap is true
        alignWithLabel?: boolean,
        interval?: 'auto' | number | ((index: number, value: string) => boolean)
    }
}
export interface ValueAxisBaseOption extends NumericAxisBaseOptionCommon {
    type?: 'value';
    axisLabel?: AxisLabelOption<'value'>;

    /**
     * Optional value can be:
     * + `false`: always include value 0.
     * + `true`: the axis may not contain zero position.
     */
     scale?: boolean;
}
export interface LogAxisBaseOption extends NumericAxisBaseOptionCommon {
    type?: 'log';
    axisLabel?: AxisLabelOption<'log'>;
    logBase?: number;
}
export interface TimeAxisBaseOption extends NumericAxisBaseOptionCommon {
    type?: 'time';
    axisLabel?: AxisLabelOption<'time'>;
}
interface AxisNameTextStyleOption extends TextCommonOption {
    rich?: Dictionary<TextCommonOption>
}

interface AxisLineOption {
    show?: boolean | 'auto',
    onZero?: boolean,
    onZeroAxisIndex?: number,
    // The arrow at both ends the the axis.
    symbol?: string | [string, string],
    symbolSize?: number[],
    symbolOffset?: string | number | (string | number)[],
    lineStyle?: LineStyleOption,
    // Display line break effect when axis.breaks is specified.
    breakLine?: boolean,
}

interface AxisTickOption {
    show?: boolean | 'auto',
    // Whether axisTick is inside the grid or outside the grid.
    inside?: boolean,
    // The length of axisTick.
    length?: number,
    lineStyle?: LineStyleOption,
    customValues?: (number | string | Date)[]
}

export type AxisLabelValueFormatter = (
    value: number,
    index: number,
    extra: AxisLabelFormatterExtraParams | NullUndefined,
) => string;
export type AxisLabelCategoryFormatter = (
    value: string,
    index: number,
    extra: NullUndefined,
) => string;
export type AxisLabelTimeFormatter = (
    value: number,
    index: number,
    extra: TimeAxisLabelFormatterExtraParams,
) => string;

export type AxisLabelFormatterExtraParams = {/* others if any */} & AxisLabelFormatterExtraBreakPart;
export type TimeAxisLabelFormatterExtraParams = {
    time: TimeScaleTick['time'],
    /**
     * @deprecated Refactored to `time.level`, and keep it for backward compat,
     *  although `level` is never published in doc since it is introduced.
     */
    level: number,
} & AxisLabelFormatterExtraParams;

export type TimeAxisLabelLeveledFormatterOption = string[] | string;
export type TimeAxisLabelFormatterUpperDictionaryOption =
    {[key in PrimaryTimeUnit]?: TimeAxisLabelLeveledFormatterOption};
/**
 * @see {parseTimeAxisLabelFormatterDictionary}
 */
export type TimeAxisLabelFormatterDictionaryOption =
    {[key in PrimaryTimeUnit]?: TimeAxisLabelLeveledFormatterOption | TimeAxisLabelFormatterUpperDictionaryOption};

export type TimeAxisLabelFormatterOption = string
    | AxisLabelTimeFormatter
    | TimeAxisLabelFormatterDictionaryOption;

export type TimeAxisLabelFormatterParsed = string
    | AxisLabelTimeFormatter
    | TimeAxisLabelFormatterDictionary;

// This is the parsed result from TimeAxisLabelFormatterDictionaryOption.
export type TimeAxisLabelFormatterDictionary = {[key in PrimaryTimeUnit]: TimeAxisLabelFormatterUpperDictionary};
export type TimeAxisLabelFormatterUpperDictionary = {[key in PrimaryTimeUnit]: string[]};

type LabelFormatters = {
    value: AxisLabelValueFormatter | string
    log: AxisLabelValueFormatter | string
    category: AxisLabelCategoryFormatter | string
    time: TimeAxisLabelFormatterOption
};

interface AxisLabelBaseOption extends Omit<TextCommonOption, 'color'> {
    show?: boolean,
    // Whether axisLabel is inside the grid or outside the grid.
    inside?: boolean,
    rotate?: number,
    // true | false | null/undefined (auto)
    showMinLabel?: boolean,
    // true | false | null/undefined (auto)
    showMaxLabel?: boolean,
    // 'left' | 'center' | 'right' | null/undefined (auto)
    alignMinLabel?: TextAlign,
    // 'left' | 'center' | 'right' | null/undefined (auto)
    alignMaxLabel?: TextAlign,
    // 'top' | 'middle' | 'bottom' | null/undefined (auto)
    verticalAlignMinLabel?: TextVerticalAlign,
    // 'top' | 'middle' | 'bottom' | null/undefined (auto)
    verticalAlignMaxLabel?: TextVerticalAlign,
    // The space between the axis and `[label.x, label.y]`.
    margin?: number,
    /**
     * The space around the axis label to escape from overlapping.
     * Applied on the label local rect (rather than rotated enlarged rect)
     * Follow the format defined by `format.ts#normalizeCssArray`.
     * Introduce the name `textMargin` rather than reuse the existing names to avoid breaking change:
     *  - `axisLabel.margin` historically has been used to indicate the gap between the axis and label.x/.y.
     *  - `label.minMargin` conveys the same meaning as this `textMargin` but has a different nuance,
     *      it works like CSS margin collapse (gap = label1.minMargin/2 + label2.minMargin/2),
     *      and is applied on the rotated bounding rect rather than the original local rect.
     * @see {LabelMarginType}
     */
    textMargin?: number | number[],
    rich?: Dictionary<TextCommonOption>
    /**
     * If hide overlapping labels.
     */
    hideOverlap?: boolean,
    customValues?: (number | string | Date)[],
    // Color can be callback
    color?: ColorString | ((value?: string | number, index?: number) => ColorString),
    overflow?: TextStyleProps['overflow']
}
interface AxisLabelOption<TType extends OptionAxisType> extends AxisLabelBaseOption {
    formatter?: LabelFormatters[TType]
    interval?: TType extends 'category'
        ? ('auto' | number | ((index: number, value: string) => boolean))
        : unknown // Reserved but not used.
}

interface MinorTickOption {
    show?: boolean,
    splitNumber?: number,
    length?: number,
    lineStyle?: LineStyleOption
}

interface SplitLineOption {
    show?: boolean,
    interval?: 'auto' | number | ((index:number, value: string) => boolean),
    // true | false
    showMinLine?: boolean,
    // true | false
    showMaxLine?: boolean,
    // colors will display in turn
    lineStyle?: LineStyleOption<ZRColor | ZRColor[]>
}

interface MinorSplitLineOption {
    show?: boolean,
    lineStyle?: LineStyleOption
}

interface SplitAreaOption {
    show?: boolean,
    interval?: 'auto' | number | ((index:number, value: string) => boolean)
    // colors will display in turn
    areaStyle?: AreaStyleOption<ZRColor[]>
}

export type AxisBaseOption = ValueAxisBaseOption | LogAxisBaseOption
    | CategoryAxisBaseOption | TimeAxisBaseOption;
