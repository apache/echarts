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

import { assert, bind, each, extend, keys, noop } from 'zrender/src/core/util';
import { initExtentForUnion, isValidBoundsForExtent } from '../util/model';
import { NullUndefined } from '../util/types';
import { AxisBreakParsingResult, BreakScaleMapper, getScaleBreakHelper } from './break';
import { error } from '../util/log';
import { ValueTransformLookupOpt } from './helper';
import { DataSanitizationFilter } from '../data/helper/dataValueHelper';


// ------ START: Scale Mapper Core ------

/**
 *  - `SCALE_EXTENT_KIND_EFFECTIVE`:
 *    It is a portion of a scale extent that is functional on most features, including:
 *      - All tick/label-related calculation.
 *      - `dataZoom` controlled ends.
 *      - Cartesian2D `clampData`.
 *      - line series start.
 *      - heatmap series range.
 *      - markerArea range.
 *      - etc.
 *    `SCALE_EXTENT_KIND_EFFECTIVE` always exists.
 *
 *  - `SCALE_EXTENT_KIND_MAPPING`:
 *    It is an expanded extent from the start and end of `SCALE_EXTENT_KIND_EFFECTIVE`. In the
 *    expanded parts, axis ticks and labels are considered meaningless and are not rendered. They
 *    can be typically created by `xxxAxis.containShape` feature. In this case, we need to:
 *      - Prevent "nice strategy" from triggering unexpectedly by the "contain shape expansion".
 *        Otherwise, for example, the original extent is `[0, 1000]`, then the expanded
 *        extent, say `[-5, 1000]`, can cause a considerable negative expansion by "nice",
 *        like `[-200, 10000]`, which is commonly unexpected. And it is exacerbated in LogScale.
 *      - Prevent the min/max tick label from displaying, since they are commonly meaningless
 *        and probably misleading.
 *    Therefore, `SCALE_EXTENT_KIND_MAPPING` is only used for:
 *      - mapping between data and pixel, such as,
 *        - `scaleMapper.normalize/scale`;
 *        - Cartesian2D `calcAffineTransform` (a quick path of `scaleMapper.normalize/scale`).
 *      - `grid` boundary related calculation in view rendering, such as, `barGrid` calculates
 *        `barWidth` for numeric scales based on the data extent.
 *      - Axis line position determination (such as `canOnZeroToAxis`);
 *      - `axisPointer` triggering (otherwise users may be confused if using `SCALE_EXTENT_KIND_EFFECTIVE`).
 *    `SCALE_EXTENT_KIND_MAPPING` can be absent, which can be used to determine whether it is used.
 *
 * Illustration:
 *  `SCALE_EXTENT_KIND_EFFECTIVE`:     |------------|     (always exist)
 *  `SCALE_EXTENT_KIND_MAPPING`:   |---|------------|--|  (present only when it is specified by `setExtent2`)
 */
export type ScaleExtentKind =
    typeof SCALE_EXTENT_KIND_EFFECTIVE
    | typeof SCALE_EXTENT_KIND_MAPPING;
export const SCALE_EXTENT_KIND_EFFECTIVE = 0;
export const SCALE_EXTENT_KIND_MAPPING = 1;


const SCALE_MAPPER_METHOD_NAMES_MAP: Record<keyof ScaleMapper, 1> = {
    needTransform: 1,
    normalize: 1,
    scale: 1,
    transformIn: 1,
    transformOut: 1,
    contain: 1,
    getExtent: 1,
    getExtentUnsafe: 1,
    setExtent: 1,
    setExtent2: 1,
    getFilter: 1,
    sanitize: 1,
    freeze: 1,
};
const SCALE_MAPPER_METHOD_NAMES = keys(SCALE_MAPPER_METHOD_NAMES_MAP);

/**
 * - `SCALE_MAPPER_DEPTH_OUT_OF_BREAK`:
 *   In `transformIn`, it transforms a value from the outermost space to the space before break being applied.
 *   In `transformOut`, it transforms a value from the space before break being applied to the outermost space.
 *   Typically nice axis ticks are picked in that space due to the current design of nice ticks
 *   algorithm, while size related features may use `SCALE_MAPPER_DEPTH_INNERMOST`.
 * - `SCALE_MAPPER_DEPTH_INNERMOST`:
 *   Currently only linear space is used as the innermost space.
 */
export type ScaleMapperDepthOpt = {
    depth?: NullUndefined
        | typeof SCALE_MAPPER_DEPTH_OUT_OF_BREAK
        | typeof SCALE_MAPPER_DEPTH_INNERMOST;
};
export const SCALE_MAPPER_DEPTH_OUT_OF_BREAK = 2;
export const SCALE_MAPPER_DEPTH_INNERMOST = 3;

export type ScaleMapperTransformOutOpt = (
    // depth: NullUndefined means SCALE_MAPPER_DEPTH_INNERMOST.
    ScaleMapperDepthOpt
    & ValueTransformLookupOpt
);
export type ScaleMapperTransformInOpt =
    // depth: NullUndefined means SCALE_MAPPER_DEPTH_INNERMOST.
    ScaleMapperDepthOpt;

/**
 * `ScaleMapper` is designed for multiple steps of numeric transformations from a certain space to a linear space,
 * or vice versa. Each steps is implemented as a `ScaleMapper`, and composed like a decorator pattern. And some
 * steps, such as "axis breaks transfromation", can be skipped when no breaks for performance consideration.
 *
 * Currently we support:
 *  - step#0: extent based linear scaling.
 *            This is implemented in `LinearScaleMapper`.
 *            It is mixed into `IntervalScale`, `TimeScale`;
 *            and it is also composited into `BreakScaleMapper`, `OrdinalScale`, `LogScale`.
 *  - step#1: axis breaks.
 *            This is implemented in `BreakScaleMapper`.
 *            This step may be absent if no breaks.
 *  - step#2: logarithmic (implemented in `LogScale`), or
 *            ordinal-related handling (implemented in `OrdinalScale`), or
 *            others to be supported, such as asinh ...
 *
 * Illustration of some currently supported cases:
 *  - linear_space(in an IntervalScale)
 *  - break_space(in an IntervalScale method bound by a BreakScaleMapper)
 *     └─break_transform─► linear_space(in a LinearScaleMapper owned by a BreakScaleMapper)
 *  - log_space(in a LogScale)
 *     └─log_transform─► linear_space(in an IntervalScale)
 *  - log_space(in a LogScale)
 *     └─log_transform─► break_space(in an IntervalScale method bound by a BreakScaleMapper)
 *                        └─break_transform─► linear_space(in a LinearScaleMapper owned by a BreakScaleMapper)
 *  - linear_space(in a TimeScale)
 *  - break_space(in a TimeScale method bound by a BreakScaleMapper)
 *     └─break_transform─► linear_space(in a LinearScaleMapper owned by a BreakScaleMapper)
 *  - category_values(in a OrdinalScale)
 *     └─category_to_numeric─► linear_space(in a LinearScaleMapper owned by a BreakScaleMapper)
 */
export interface ScaleMapper extends ScaleMapperGeneric<ScaleMapper> {}
export interface ScaleMapperGeneric<This> {

    /**
     * Enable a fast path in large data traversal - the call of `transformIn`/`transformOut`
     * can be omitted, and this is the most case.
     */
    needTransform(this: This): boolean;

    /**
     * Normalize a value to linear [0, 1], return 0.5 if extent span is 0.
     * The typical logic is:
     *  `transformIn_self` -> `transformIn_inner` -> ... to the innermost space,
     *  then do linear normalization based on innermost extent.
     */
    normalize: (this: This, val: number) => number;

    /**
     * Scale a normalized value to extent. It's the inverse of `normalize`.
     */
    scale: (this: This, val: number) => number;

    /**
     * [NOTICE]:
     *  - This method must be available since the instance is constructed.
     *  - This method has nothing to do with extent - transforming out of extent is supported.
     *
     * This method transforms a value forward into a inner space.
     * The typical logic is:
     *  `transformIn_self` -> `transformIn_inner` -> ... to the innermost space.
     * In most cases axis ticks are laid out in linear space, and some features
     * (such as LogScale, axis breaks) transform values from their own spaces into linear space.
     */
    transformIn: (
        this: This,
        val: number,
        opt: ScaleMapperTransformInOpt | NullUndefined
    ) => number;

    /**
     * [NOTICE]:
     *  - This method must be available since the instance is constructed.
     *  - This method has nothing to do with extent - transforming out of extent is supported.
     *
     * The inverse method of `transformIn`.
     */
    transformOut: (
        this: This,
        val: number,
        opt: ScaleMapperTransformOutOpt | NullUndefined
    ) => number;

    /**
     * Whether the extent contains the given value.
     */
    contain: (this: This, val: number) => boolean;

    /**
     * [NOTICE]:
     *  In EC_MAIN_CYCLE, scale extent is finally determined at `coordSys#update` stage.
     *
     * Get a clone of the scale extent.
     * An extent is always in an increase order.
     * It always returns an array - never be a null/undefined.
     */
    getExtent(this: This): number[];

    /**
     * [NOTICE]:
     *  Callers must NOT modify the return.
     */
    getExtentUnsafe(
        this: This,
        kind: ScaleExtentKind,
        // NullUndefined means the outermost space.
        depth: ScaleMapperDepthOpt['depth'] | NullUndefined
    ): number[] | NullUndefined;

    /**
     * [NOTICE]:
     *  The caller must ensure `start <= end` and both are finite number!
     *
     * `setExtent` is identical to `setExtent2(SCALE_EXTENT_KIND_EFFECTIVE)`.
     *
     * [The steps of extent construction in EC_MAIN_CYCLE]:
     *  - step#1. At `CoordinateSystem#create` stage, requirements of collecting series data extents are
     *            committed to `associateSeriesWithAxis`, and `Scale` instances are created.
     *  - step#2. Call `scaleRawExtentInfoCreate` to really collect series data extent and create
     *            `ScaleRawExtentInfo` instances to manage extent related configurations
     *                - at "data processing" stage for dataZoom controlled axes, if any, or
     *                - at "CoordinateSystem#update" stage for all other axes.
     *            Some strategies like "containShape" is performed then to expand the extent if needed.
     *  - step#3. Perform "nice" (see `scaleCalcNice`) or "align" (see `scaleCalcAlign`) strategies to
     *            modify the original extent from `ScaleRawExtentInfo` instance, if needed, at
     *            "CoordinateSystem#update" stage.
     *  - step#4. Set `SCALE_EXTENT_KIND_MAPPING` if needed (see `adoptScaleExtentKindMapping`; introduced
     *            by features like "containShape") at "CoordinateSystem#update" stage.
     */
    setExtent(this: This, start: number, end: number): void;
    setExtent2(this: This, kind: ScaleExtentKind, start: number, end: number): void;

    /**
     * Filter for sanitization.
     */
    getFilter?: () => DataSanitizationFilter;

    /**
     * NOTICE:
     *  Should not sanitize invalid values (e.g., NaN, Infinity, null, undefined),
     *  since it probably has special meaning, and always properly handled in every Scale.
     *
     * Sanitize the value if possible. For example, for LogScale, the negative part will be clampped.
     * This provides some permissiveness to ec option like `xxxAxis.min/max`.
     */
    sanitize?: (
        (this: This, values: number | NullUndefined, dataExtent: number[]) => number | NullUndefined
    ) | NullUndefined;

    /**
     * Restrict the modification behavior of a scale for robustness. e.g., avoid subsequently
     * modifying `SCALE_EXTENT_KIND_EFFECTIVE` but no sync to `SCALE_EXTENT_KIND_MAPPING`.
     */
    freeze(this: This): void;
}

export function initBreakOrLinearMapper(
    // If input `null/undefined`, a mapper will be created.
    mapper: ScaleMapper | NullUndefined,
    breakParsed: AxisBreakParsingResult | NullUndefined,
    initialExtent: number[] | NullUndefined,
): {
    // If breaks are not available, `brk` is `null/undefined`.
    brk: BreakScaleMapper | NullUndefined;
    // Never be `null/undefined`.
    mapper: ScaleMapper;
} {
    let brk: BreakScaleMapper | NullUndefined;
    mapper = mapper || {} as ScaleMapper;

    const scaleBreakHelper = getScaleBreakHelper();
    if (scaleBreakHelper) {

        const brkMapper = scaleBreakHelper.createBreakScaleMapper(breakParsed, initialExtent);

        if (brkMapper.hasBreaks()) {
            // Some `ScaleMapper` methods (such as `normalize`) needs to be fast for large data
            // when no breaks, so mount break methods only when breaks really exist.
            each(SCALE_MAPPER_METHOD_NAMES, function (methodName) {
                (mapper as any)[methodName] = bind(brkMapper[methodName], brkMapper);
            });
            brk = brkMapper;
        }
    }

    if (brk == null) {
        initLinearScaleMapper(mapper, initialExtent);
    }

    return {brk, mapper};
}

export type DecoratedScaleMapperMethods<THost extends ScaleMapper> = Omit<ScaleMapperGeneric<THost>, 'freeze'>;

export function decorateScaleMapper<THost extends ScaleMapper>(
    host: THost,
    decoratedMapperMethods: Omit<ScaleMapperGeneric<THost>, 'freeze'>
): void {
    each(SCALE_MAPPER_METHOD_NAMES, function (methodName) {
        (host as any)[methodName] = (decoratedMapperMethods as ScaleMapperGeneric<THost>)[methodName];
    });
}

export function enableScaleMapperFreeze(host: ScaleMapper, subMapper: ScaleMapper): void {
    host.freeze = noop;
    if (__DEV__) {
        host.freeze = function () {
            subMapper.freeze();
        };
    };
}

export function getScaleExtentForTickUnsafe(mapper: ScaleMapper): number[] {
    return mapper.getExtentUnsafe(SCALE_EXTENT_KIND_EFFECTIVE, SCALE_MAPPER_DEPTH_OUT_OF_BREAK);
}

export function getScaleExtentForMappingUnsafe(
    mapper: ScaleMapper,
    // NullUndefined means the outermost space.
    depth: ScaleMapperDepthOpt['depth'] | NullUndefined
): number[] {
    return mapper.getExtentUnsafe(SCALE_EXTENT_KIND_MAPPING, depth)
        || mapper.getExtentUnsafe(SCALE_EXTENT_KIND_EFFECTIVE, depth);
}

export function getScaleLinearSpanForMapping(mapper: ScaleMapper): number {
    const extent = getScaleExtentForMappingUnsafe(mapper, SCALE_MAPPER_DEPTH_INNERMOST);
    return extent[1] - extent[0];
}

export function getScaleLinearSpanEffective(mapper: ScaleMapper): number {
    const extent = mapper.getExtentUnsafe(SCALE_EXTENT_KIND_EFFECTIVE, SCALE_MAPPER_DEPTH_INNERMOST);
    return extent[1] - extent[0];
}

// ------ END: Scale Mapper Core ------


// ------ START: Linear Scale Mapper ------

/**
 * Generally, no need to export `LinearScaleMapper` and not recommended
 * to visit `_extent` directly outside, otherwise it may be incorrect
 * due to possible polymorphism - use `getExtentUnsafe()` instead.
 */
interface LinearScaleMapper extends ScaleMapper {
    /**
     * [CAVEAT]:
     *  - Should update only by `setExtent` or `setExtent2`!
     *  - The caller of `setExtent()` should ensure `extent[0] <= extent[1]`,
     *    but it is initialized as `[Infinity, -Infinity]`.
     *    With these restriction, `extent` can only be either:
     *      + `extent[0] < extent[1]` and both finite, or
     *      + `extent[0] === extent[1]` and both finite, or
     *      + `extent[0] === Infinity && extent[1] === -Infinity`
     *
     * Structure: `_extent[ScaleExtentKind][]`
     */
    readonly _extents: number[][];
    readonly _frozen: boolean;
}

export function initLinearScaleMapper(
    // If input `null/undefined`, a mapper will be created.
    mapper: ScaleMapper | NullUndefined,
    initialExtent: number[] | NullUndefined
): ScaleMapper {
    const linearMapper = (mapper || {}) as LinearScaleMapper;

    const extendList: number[][] = [];
    // @ts-ignore
    linearMapper._extents = extendList;

    extendList[SCALE_EXTENT_KIND_EFFECTIVE] = initialExtent ? initialExtent.slice() : initExtentForUnion();

    extend(linearMapper, linearScaleMapperMethods);

    return linearMapper;
}

const linearScaleMapperMethods: ScaleMapperGeneric<LinearScaleMapper> = {

    needTransform() {
        return false;
    },

    /**
     * NOTICE: Don't use optional arguments for performance consideration here.
     */
    normalize(val) {
        const extent = this._extents[SCALE_EXTENT_KIND_MAPPING] || this._extents[SCALE_EXTENT_KIND_EFFECTIVE];
        if (extent[1] === extent[0]) {
            return 0.5;
        }
        return (val - extent[0]) / (extent[1] - extent[0]);
    },

    scale(val) {
        const extent = this._extents[SCALE_EXTENT_KIND_MAPPING] || this._extents[SCALE_EXTENT_KIND_EFFECTIVE];
        return val * (extent[1] - extent[0]) + extent[0];
    },

    transformIn(val) {
        return val;
    },

    transformOut(val) {
        return val;
    },

    contain(val) {
        // This method is typically used in axis trigger and markers.
        // Users may be confused if the extent is restricted to `SCALE_EXTENT_KIND_EFFECTIVE`.
        const extent = getScaleExtentForMappingUnsafe(this, null);
        return val >= extent[0] && val <= extent[1];
    },

    getExtent() {
        return this._extents[SCALE_EXTENT_KIND_EFFECTIVE].slice();
    },

    getExtentUnsafe(kind) {
        return this._extents[kind];
    },

    setExtent(start, end) {
        if (__DEV__) {
            assert(!this._frozen);
        }
        writeExtent(this._extents, SCALE_EXTENT_KIND_EFFECTIVE, start, end);
    },

    setExtent2(kind, start, end) {
        if (__DEV__) {
            assert(!this._frozen);
        }
        const extentList = this._extents;
        if (!extentList[kind]) {
            extentList[kind] = extentList[SCALE_EXTENT_KIND_EFFECTIVE].slice();
        }
        writeExtent(extentList, kind, start, end);
    },

    freeze() {
        if (__DEV__) {
            // @ts-ignore
            this._frozen = true;
        }
    }

};

function writeExtent(
    extentList: number[][], kind: ScaleExtentKind, start: number, end: number
): void {
    // NOTE: `NaN` should be excluded. e.g., `scaleRawExtentInfo.resultMinMax` may be `[NaN, NaN]`.
    if (isValidBoundsForExtent(start, end)) {
        extentList[kind][0] = start;
        extentList[kind][1] = end;
    }
    else {
        if (__DEV__) {
            // PENDING: should use `assert` after fixing all invalid calls.
            if (start != null && end != null && start <= end) {
                error(`Invalid setExtent call - start: ${start}, end: ${end}`);
            }
        }
    }
}

// ------ END: Linear Scale Mapper ------
