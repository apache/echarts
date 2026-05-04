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
import {
    ScaleDataValue,
    ScaleTick,
    NullUndefined,
    ParsedValueNumeric,
} from '../util/types';
import { ScaleRawExtentInfo } from '../coord/scaleRawExtentInfo';
import { BreakScaleMapper, ParamPruneByBreak } from './break';
import { AxisScaleType } from '../coord/axisCommonTypes';
import { ScaleMapperGeneric } from './scaleMapper';


export type ScaleGetTicksOpt = {
    // Whether expand the ticks to nice extent.
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

/**
 * @see ScaleMapper for the hierarchy structure.
 */
interface Scale<This = unknown> extends ScaleMapperGeneric<This> {}
abstract class Scale<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    This = unknown // Just required for keeping identical to `interface Scale<This>`.
> {

    type: AxisScaleType;

    /**
     * CAUTION: Do not visit it directly - use helper methods in `scale/break.ts` instead.
     */
    readonly brk: BreakScaleMapper | NullUndefined;

    private _isBlank: boolean;

    // Inject
    readonly rawExtentInfo: ScaleRawExtentInfo | NullUndefined;

    /**
     * Parse input `val` (typicall from ec option or API) to its corresponding
     * numeric representation.
     *
     * NOTICE:
     *  - The implementation must have no side-effect.
     *  - Must be available in constructor.
     *  - Must ensure the return is a number.
     *    `null`/`undefined` is not allowed.
     *    `NaN` represents invalid data.
     *  - Regarding `extent`:
     *    - In `OrdinalScale`, the extent and `ordinalMeta` has been finally determined
     *      before the constructor being called, and parse can reply on them
     *    - In other scales, the extent is not finally determined, and `parse` must not
     *      rely on them, otherwise, the result would be wrong if it is used earlier
     *      (like in `dataZoom`).
     */
    parse: (val: ScaleDataValue) => ParsedValueNumeric;

    /**
     * When axis extent depends on data and no data exists,
     * axis ticks should not be drawn, which is named 'blank'.
     *
     * @final NEVER override!
     */
    isBlank(): boolean {
        return this._isBlank;
    }

    /**
     * When axis extent depends on data and no data exists,
     * axis ticks should not be drawn, which is named 'blank'.
     *
     * @final NEVER override!
     */
    setBlank(isBlank: boolean) {
        this._isBlank = isBlank;
    }

    /**
     * @return label of the tick.
     */
    abstract getLabel(tick: ScaleTick): string;

    /**
     * Create ticks. The result can be modified by the caller.
     */
    abstract getTicks(opt?: ScaleGetTicksOpt): ScaleTick[];

    /**
     * Create minor ticks. The result can be modified by the caller.
     */
    abstract getMinorTicks(splitNumber: number): number[][];

    static registerClass: clazzUtil.ClassManager['registerClass'];

    static getClass: clazzUtil.ClassManager['getClass'];
}

type ScaleConstructor = typeof Scale & clazzUtil.ClassManager;
clazzUtil.enableClassManagement(Scale as ScaleConstructor);


export default Scale;
