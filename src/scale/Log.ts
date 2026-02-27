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

import Scale, { ScaleGetTicksOpt } from './Scale';
import IntervalScale from './Interval';
import {
    ScaleTick,
    NullUndefined,
    AxisBreakOption
} from '../util/types';
import {
    logScalePowTick,
    IntervalScaleGetLabelOpt,
    logScaleLogTick,
    ValueTransformLookupOpt,
} from './helper';
import { getBreaksUnsafe, getScaleBreakHelper, ParseAxisBreakOptionInwardTransformOut } from './break';
import { getMinorTicks } from './minorTicks';
import {
    DecoratedScaleMapperMethods, decorateScaleMapper, enableScaleMapperFreeze, SCALE_EXTENT_KIND_EFFECTIVE,
    SCALE_MAPPER_DEPTH_OUT_OF_BREAK,
    ScaleMapperTransformOutOpt
} from './scaleMapper';
import { map } from 'zrender/src/core/util';
import { isValidBoundsForExtent } from '../util/model';


type LogScaleSetting = {
    logBase: number | NullUndefined;
    breakOption: AxisBreakOption[] | NullUndefined;
};

const LOOKUP_IDX_EXTENT_START = 0;
const LOOKUP_IDX_EXTENT_END = 1;
const LOOKUP_IDX_BREAK_START = 2;

/**
 * @final NEVER inherit me!
 */
class LogScale extends Scale<LogScale> {

    static type = 'log';
    readonly type = 'log' as const;

    readonly base: number;

    /**
     * `powStub` is used to save original values, i.e., values before logarithm
     * applied, such as raw extent and raw breaks.
     * NOTE: Logarithm transform is probably not inversible by rounding error, which
     * may cause min/max tick is displayed like `5.999999999999999`. The extent in
     * powStub is used to get the original precise extent for this issue.
     *
     * [CAVEAT] `powStub` and `intervalStub` should be modified synchronously.
     */
    readonly powStub: IntervalScale;
    /**
     * `intervalStub` provides linear tick arrangement (logarithm applied).
     * @see {powStub}
     */
    readonly intervalStub: IntervalScale;

    private _lookup: ValueTransformLookupOpt['lookup'];


    constructor(setting: LogScaleSetting) {
        super();
        this.parse = IntervalScale.parse;
        this.base = setting.logBase || 10;

        const lookupFrom: number[] = [];
        const lookupTo: number[] = [];
        const lookup = this._lookup = {from: lookupFrom, to: lookupTo};
        lookupFrom[LOOKUP_IDX_EXTENT_START] =
            lookupFrom[LOOKUP_IDX_EXTENT_END] =
            lookupTo[LOOKUP_IDX_EXTENT_START] =
            lookupTo[LOOKUP_IDX_EXTENT_END] = NaN;

        decorateScaleMapper(this, LogScale.mapperMethods);

        const scaleBreakHelper = getScaleBreakHelper();
        const breakOption = setting.breakOption;
        const out: ParseAxisBreakOptionInwardTransformOut = {lookup};
        if (scaleBreakHelper) {
            scaleBreakHelper.parseAxisBreakOptionInwardTransform(
                breakOption, this, {noNegative: true}, LOOKUP_IDX_BREAK_START, out
            );
        }
        this.powStub = new IntervalScale({breakParsed: out.original});
        this.intervalStub = new IntervalScale({breakParsed: out.transformed});

        enableScaleMapperFreeze(this, this.intervalStub);
    }

    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        const base = this.base;
        const powStub = this.powStub;
        const scaleBreakHelper = getScaleBreakHelper();
        const intervalStub = this.intervalStub;
        const intervalExtent = intervalStub.getExtent();
        const powExtent = powStub.getExtent();
        const powOpt: ValueTransformLookupOpt = {lookup: {from: intervalExtent, to: powExtent}};

        return map(intervalStub.getTicks(opt || {}), function (tick) {
            const val = tick.value;
            let powVal = logScalePowTick(val, base, powOpt);

            let vBreak;
            if (scaleBreakHelper) {
                const brkPowResult = scaleBreakHelper.getTicksBreakOutwardTransform(
                    this,
                    tick,
                    getBreaksUnsafe(powStub),
                    this._lookup,
                );
                if (brkPowResult) {
                    vBreak = brkPowResult.vBreak;
                    powVal = brkPowResult.tickVal;
                }
            }

            return {
                value: powVal,
                break: vBreak,
            };
        }, this);
    }

    getMinorTicks(splitNumber: number): number[][] {
        return getMinorTicks(
            this,
            splitNumber,
            getBreaksUnsafe(this.powStub),
            // NOTE: minor ticks are in the log scale value to visually hint users "logarithm".
            this.intervalStub.getConfig().interval
        );
    }

    getLabel(
        data: ScaleTick,
        opt?: IntervalScaleGetLabelOpt
    ) {
        return this.intervalStub.getLabel(data, opt);
    }

    static mapperMethods: DecoratedScaleMapperMethods<LogScale> = {

        needTransform() {
            return true;
        },

        normalize(val) {
            return this.intervalStub.normalize(logScaleLogTick(val, this.base));
        },

        scale(val) {
            // PENDING: Input `intervalStub.getExtent()` and `powStub.getExtent()` may
            // break monotonicity. Do not do it until real problems found.
            return logScalePowTick(this.intervalStub.scale(val), this.base, null);
        },

        transformIn(val, opt) {
            val = logScaleLogTick(val, this.base);
            return (opt && opt.depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                ? val
                : this.intervalStub.transformIn(val, opt);
        },

        transformOut(val, opt) {
            const depth = opt ? opt.depth : null;
            tmpTransformOutOpt1.depth = depth;
            tmpTransformOutOpt2.lookup = this._lookup;
            return logScalePowTick(
                (depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                    ? val
                    : this.intervalStub.transformOut(val, tmpTransformOutOpt1),
                this.base,
                tmpTransformOutOpt2
            );
        },

        contain(val) {
            return this.powStub.contain(val);
        },

        /**
         * NOTICE: The caller should ensure `start` and `end` are both non-negative.
         */
        setExtent(start, end) {
            this.setExtent2(SCALE_EXTENT_KIND_EFFECTIVE, start, end);
        },

        setExtent2(kind, start, end) {
            if (!isValidBoundsForExtent(start, end)
                || start <= 0 || end <= 0
            ) {
                return;
            }
            let lookupTo = tmpNotUsedArr;
            let lookupFrom = tmpNotUsedArr;
            if (kind === SCALE_EXTENT_KIND_EFFECTIVE) {
                const lookup = this._lookup;
                lookupTo = lookup.to;
                lookupFrom = lookup.from;
            }
            this.powStub.setExtent2(
                kind,
                (lookupTo[LOOKUP_IDX_EXTENT_START] = start),
                (lookupTo[LOOKUP_IDX_EXTENT_END] = end)
            );
            const base = this.base;
            this.intervalStub.setExtent2(
                kind,
                (lookupFrom[LOOKUP_IDX_EXTENT_START] = logScaleLogTick(start, base)),
                (lookupFrom[LOOKUP_IDX_EXTENT_END] = logScaleLogTick(end, base))
            );
        },

        getFilter() {
            return {g: 0};
        },

        sanitizeExtent(extent, dataExtent) {
            if (isValidBoundsForExtent(extent[0], extent[1])
                && isValidBoundsForExtent(dataExtent[0], dataExtent[1])
            ) {
                // `DataStore` has ensured that `dataExtent` is valid for LogScale.
                extent[0] <= 0 && (extent[0] = dataExtent[0]);
                extent[1] <= 0 && (extent[1] = dataExtent[0]);
            }
        },

        getExtent() {
            return this.powStub.getExtent();
        },

        getExtentUnsafe(kind, depth) {
            return depth === null
                ? this.powStub.getExtentUnsafe(kind, null)
                : this.intervalStub.getExtentUnsafe(kind, depth);
        },

    };

}

Scale.registerClass(LogScale);

const tmpTransformOutOpt1: ScaleMapperTransformOutOpt = {};
const tmpTransformOutOpt2: ValueTransformLookupOpt = {};
const tmpNotUsedArr: number[] = [];

export default LogScale;
