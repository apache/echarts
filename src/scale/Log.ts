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
    asinhScaleForwardTick,
    asinhScaleInverseTick,
    symlogScaleForwardTick,
    symlogScaleInverseTick,
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
import { isNullableNumberFinite } from '../util/number';
import { warn } from '../util/log';


type LogScaleSetting = {
    logBase: number | NullUndefined;
    logMapping: 'none' | 'asinh' | 'symlog' | NullUndefined;
    logLinearWidth: number | NullUndefined;
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
     * The mapping method applied to this log scale.
     * `'none'` is the standard log (positive values only).
     * `'asinh'` and `'symlog'` extend support to zero and negative values —
     * they also relax the positivity guards in `setExtent`, `sanitize`, and `getFilter`.
     *
     * NOTE: `NullUndefined` is treated as `'none'`.
     *
     * @see `linearWidth`
     */
    readonly logMapping: 'none' | 'asinh' | 'symlog' | NullUndefined;

    /**
     * The quasi-linear region half-width used by `'asinh'` and `'symlog'` mappings
     * (`logLinearWidth` option, default `1`).
     * Controls how wide the near-zero linear band is before the log-like curve kicks in.
     * Ignored when `logMapping` is `'none'`.
     *
     * @see `logMapping`
     */
    readonly linearWidth: number | NullUndefined;

    /**
     * Cached ticks for `'asinh'`/`'symlog'` mappings, computed in `getTicks` and
     * reused by `getMinorTicks`. `null` when `logMapping` is `'none'`.
     */
    _mappedLogTicks: ScaleTick[] | null;

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

        this.logMapping = (setting.logMapping === 'asinh' || setting.logMapping === 'symlog')
            ? setting.logMapping
            : undefined;
        const rawLw = setting.logLinearWidth || 1;
        if (this.logMapping && (rawLw <= 0 || !isFinite(rawLw))) {
            if (__DEV__) {
                warn('logLinearWidth must be a finite positive number. Falling back to 1.');
            }
        }
        this.linearWidth = (this.logMapping && (rawLw <= 0 || !isFinite(rawLw)))
            ? 1
            : rawLw;
        this._mappedLogTicks = null;

        const lookupFrom: number[] = [];
        const lookupTo: number[] = [];
        const lookup = this._lookup = {from: lookupFrom, to: lookupTo};
        lookupFrom[LOOKUP_IDX_EXTENT_START] =
            lookupFrom[LOOKUP_IDX_EXTENT_END] =
            lookupTo[LOOKUP_IDX_EXTENT_START] =
            lookupTo[LOOKUP_IDX_EXTENT_END] = NaN;

        let mapperMethods = LogScale.mapperMethods;
        if (this.logMapping === 'asinh') {
            mapperMethods = LogScale.asinhMapperMethods;
        }
        else if (this.logMapping === 'symlog') {
            mapperMethods = LogScale.symlogMapperMethods;
        }
        decorateScaleMapper(this, mapperMethods);

        const scaleBreakHelper = getScaleBreakHelper();
        const breakOption = setting.breakOption;
        const out: ParseAxisBreakOptionInwardTransformOut = {lookup};
        if (scaleBreakHelper) {
            // TODO: axis breaks are not yet supported for mapped-log mode (asinh/symlog).
            // The interaction between transformed break boundaries and the dual-stub
            // architecture has not been analysed. Revisit in a follow-up PR.
            scaleBreakHelper.parseAxisBreakOptionInwardTransform(
                this.logMapping ? undefined : breakOption,
                this,
                {noNegative: !this.logMapping},
                LOOKUP_IDX_BREAK_START,
                out
            );
        }
        this.powStub = new IntervalScale({breakParsed: out.original});
        this.intervalStub = new IntervalScale({breakParsed: out.transformed});

        enableScaleMapperFreeze(this, this.intervalStub);
    }

    getTicks(opt?: ScaleGetTicksOpt): ScaleTick[] {
        // Mapped-log ticks are pre-computed by logMappingCalcNiceTicks in
        // axisNiceTicks.ts, because they are non-uniformly spaced in transformed
        // space and cannot be generated by intervalStub.getTicks() (which assumes
        // uniform spacing). _mappedLogTicks is set before getTicks is ever called.
        if (this._mappedLogTicks) {
            return this._mappedLogTicks;
        }
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

        sanitize(value, dataExtent) {
            // Conservative - if dataExtent is invalid, do not sanitize.
            if (isValidBoundsForExtent(dataExtent[0], dataExtent[1])
                && isNullableNumberFinite(value)
                && value <= 0
            ) {
                // `DataStore` has ensured that `dataExtent` is valid for LogScale.
                value = dataExtent[0];
            }
            return value;
        },

        getDefaultStartValue() {
            return 1;
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

    static readonly asinhMapperMethods: DecoratedScaleMapperMethods<LogScale> = {

        needTransform() {
            return true;
        },

        normalize(val) {
            return this.intervalStub.normalize(asinhScaleForwardTick(val, this.linearWidth || 1));
        },

        scale(val) {
            return asinhScaleInverseTick(this.intervalStub.scale(val), this.linearWidth || 1, null);
        },

        transformIn(val, opt) {
            val = asinhScaleForwardTick(val, this.linearWidth || 1);
            return (opt && opt.depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                ? val
                : this.intervalStub.transformIn(val, opt);
        },

        transformOut(val, opt) {
            const depth = opt ? opt.depth : null;
            tmpTransformOutOpt1.depth = depth;
            tmpTransformOutOpt2.lookup = this._lookup;
            return asinhScaleInverseTick(
                (depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                    ? val
                    : this.intervalStub.transformOut(val, tmpTransformOutOpt1),
                this.linearWidth || 1,
                tmpTransformOutOpt2
            );
        },

        contain(val) {
            return this.powStub.contain(val);
        },

        setExtent(start, end) {
            this.setExtent2(SCALE_EXTENT_KIND_EFFECTIVE, start, end);
        },

        setExtent2(kind, start, end) {
            if (!isValidBoundsForExtent(start, end)) {
                return;
            }
            // No sign guard — asinh is defined for all real numbers.
            const lw = this.linearWidth || 1;
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
            this.intervalStub.setExtent2(
                kind,
                (lookupFrom[LOOKUP_IDX_EXTENT_START] = asinhScaleForwardTick(start, lw)),
                (lookupFrom[LOOKUP_IDX_EXTENT_END] = asinhScaleForwardTick(end, lw))
            );
        },

        getFilter() {
            // No positivity guard — accept all real numbers.
            return {};
        },

        sanitize(value) {
            // No clamping — asinh accepts all real values including zero and negatives.
            return value;
        },

        getDefaultStartValue() {
            return 0;
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

    static readonly symlogMapperMethods: DecoratedScaleMapperMethods<LogScale> = {

        needTransform() {
            return true;
        },

        normalize(val) {
            return this.intervalStub.normalize(symlogScaleForwardTick(val, this.linearWidth || 1));
        },

        scale(val) {
            return symlogScaleInverseTick(this.intervalStub.scale(val), this.linearWidth || 1, null);
        },

        transformIn(val, opt) {
            val = symlogScaleForwardTick(val, this.linearWidth || 1);
            return (opt && opt.depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                ? val
                : this.intervalStub.transformIn(val, opt);
        },

        transformOut(val, opt) {
            const depth = opt ? opt.depth : null;
            tmpTransformOutOpt1.depth = depth;
            tmpTransformOutOpt2.lookup = this._lookup;
            return symlogScaleInverseTick(
                (depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK)
                    ? val
                    : this.intervalStub.transformOut(val, tmpTransformOutOpt1),
                this.linearWidth || 1,
                tmpTransformOutOpt2
            );
        },

        contain(val) {
            return this.powStub.contain(val);
        },

        setExtent(start, end) {
            this.setExtent2(SCALE_EXTENT_KIND_EFFECTIVE, start, end);
        },

        setExtent2(kind, start, end) {
            if (!isValidBoundsForExtent(start, end)) {
                return;
            }
            // No sign guard — symlog is defined for all real numbers.
            const lw = this.linearWidth || 1;
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
            this.intervalStub.setExtent2(
                kind,
                (lookupFrom[LOOKUP_IDX_EXTENT_START] = symlogScaleForwardTick(start, lw)),
                (lookupFrom[LOOKUP_IDX_EXTENT_END] = symlogScaleForwardTick(end, lw))
            );
        },

        getFilter() {
            // No positivity guard — accept all real numbers.
            return {};
        },

        sanitize(value) {
            // No clamping — symlog accepts all real values including zero and negatives.
            return value;
        },

        getDefaultStartValue() {
            return 0;
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
