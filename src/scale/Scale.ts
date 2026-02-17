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
     * NOTICE:
     *  - Must be available in constructor.
     *  - Must ensure the return is a number.
     *    null/undefined is not allowed.
     *    `NaN` represents invalid data.
     *
     * Parse input val to valid inner number.
     * Notice: This would be a trap here, If the implementation
     * of this method depends on extent, and this method is used
     * before extent set (like in dataZoom), it would be wrong.
     * Nevertheless, parse does not depend on extent generally.
     */
    parse: (val: ScaleDataValue) => number;

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

    abstract getTicks(opt?: ScaleGetTicksOpt): ScaleTick[];

    abstract getMinorTicks(splitNumber: number): number[][];

    static registerClass: clazzUtil.ClassManager['registerClass'];

    static getClass: clazzUtil.ClassManager['getClass'];
}

type ScaleConstructor = typeof Scale & clazzUtil.ClassManager;
clazzUtil.enableClassManagement(Scale as ScaleConstructor);


export default Scale;
