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

import { assert, clone, each, find, isString, map, trim } from 'zrender/src/core/util';
import {
    NullUndefined, ParsedAxisBreak, ParsedAxisBreakList, AxisBreakOption,
    AxisBreakOptionIdentifierInAxis, ScaleTick, VisualAxisBreak,
} from '../util/types';
import { error } from '../util/log';
import type Scale from './Scale';
import {
    AxisBreakParsingResult, registerScaleBreakHelperImpl, ParamPruneByBreak, BreakScaleMapper, ParseBreakOptionOpt
} from './break';
import { mathMax, mathMin, mathRound } from '../util/number';
import { AxisLabelFormatterExtraParams } from '../coord/axisCommonTypes';
import {
    DecoratedScaleMapperMethods,
    decorateScaleMapper, enableScaleMapperFreeze, initLinearScaleMapper,
    SCALE_EXTENT_KIND_EFFECTIVE,
    SCALE_MAPPER_DEPTH_OUT_OF_BREAK,
    ScaleMapper,
    ScaleMapperTransformOutOpt
} from './scaleMapper';
import { isValidBoundsForExtent } from '../util/model';
import { ValueTransformLookupOpt } from './helper';

/**
 * @caution
 *  Must not export anything except `installScaleBreakHelper`
 */

interface BreakScaleMapperImpl extends BreakScaleMapper {
    // Linear space, the elapsed result.
    _linear: ScaleMapper;
}
class BreakScaleMapperImpl {

    // [CAVEAT]: Should set only by the constructor!
    readonly breaks: ParsedAxisBreakList;

    // Only used to save the original extent to avoid rounding error.
    private _outOfBrk: ScaleMapper;

    constructor(
        breakParsed: AxisBreakParsingResult | NullUndefined,
        initialExtent: number[] | NullUndefined
    ) {
        decorateScaleMapper(this, BreakScaleMapperImpl.decoratedMethods);

        this._outOfBrk = initLinearScaleMapper(null, initialExtent);
        const mapper = this._linear = initLinearScaleMapper(null, initialExtent);
        enableScaleMapperFreeze(this, mapper);

        this.breaks = breakParsed && breakParsed.breaks || [];
    }

    hasBreaks(): boolean {
        return !!this.breaks.length;
    }

    /**
     * When iteratively generating ticks by nice interval, currently the `interval`, which is
     * calculated by break-elapsed extent span, is probably very small comparing to the original
     * extent, leading to a large number of iteration and tick generation, even over `safeLimit`.
     * Thus stepping over breaks is necessary in that loop.
     *
     * "Nice" should be ensured on ticks when step over the breaks. Thus this method returns
     * a integer multiple of the "nice tick interval".
     *
     * This method does little work; it is just for unifying and restricting the behavior.
     */
    calcNiceTickMultiple(
        tickVal: number,
        estimateNiceMultiple: (tickVal: number, brkEnd: number) => number
    ): number {
        for (let idx = 0; idx < this.breaks.length; idx++) {
            const brk = this.breaks[idx];
            if (brk.vmin < tickVal && tickVal < brk.vmax) {
                const multiple = estimateNiceMultiple(tickVal, brk.vmax);
                if (__DEV__) {
                    // If not, it may cause dead loop or not nice tick.
                    assert(multiple >= 0 && mathRound(multiple) === multiple);
                }
                return multiple;
            }
        }
        return 0;
    }

    static decoratedMethods: DecoratedScaleMapperMethods<BreakScaleMapperImpl> = {

        getExtent() {
            return this._outOfBrk.getExtent();
        },

        getExtentUnsafe(kind, depth) {
            return (depth == null
                || depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK
            )
                ? this._outOfBrk.getExtentUnsafe(kind, null)
                : this._linear.getExtentUnsafe(kind, null);
        },

        setExtent(start, end) {
            this.setExtent2(SCALE_EXTENT_KIND_EFFECTIVE, start, end);
        },

        setExtent2(kind, start, end) {
            if (isValidBoundsForExtent(start, end)) {
                if (kind === SCALE_EXTENT_KIND_EFFECTIVE) {
                    updateAxisBreakGapReal(this, [start, end]);
                }
                this._outOfBrk.setExtent2(kind, start, end);
                this._linear.setExtent2(
                    kind,
                    this.transformIn(start, null),
                    this.transformIn(end, null)
                );
            }
        },

        normalize(val) {
            return this._linear.normalize(this.transformIn(val, null));
        },

        scale(val) {
            return this.transformOut(this._linear.scale(val), null);
        },

        contain(val) {
            return this._outOfBrk.contain(val);
        },

        /**
         * a.k.a., "elapse"
         * Suppose:
         *    AXIS_BREAK_LAST_BREAK_END_BASE: 0
         *    AXIS_BREAK_ELAPSED_BASE: 0
         *    breaks: [
         *        {start: -400, end: -300, gap: 27},
         *        {start: -100, end: 100, gap: 10},
         *        {start: 200, end: 400, gap: 300},
         *    ]
         * The mapping will be:
         *        |        |
         *    400 +   ->   +  237
         *     |  |        |   |  (gap: 300)
         *    200 +   ->   + -63
         *        |        |
         *    100 +   ->   + -163
         *     |  |        |   |  (gap: 10)
         *   -100 +   ->   + -173
         *        |        |
         *   -300 +   ->   + -373
         *     |  |        |   |  (gap: 27)
         *   -400 +   ->   + -400
         *        |        |
         *   origianl     elapsed
         *
         * Note:
         *   `transformIn` and `transformOut` has nothing to do with "scale extent" - out of extent is supported.
         */
        transformIn(val, opt) {
            if (opt && opt.depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK) {
                return val;
            }

            // If the value is in the break, return the normalized value in the break
            let elapsedVal = AXIS_BREAK_ELAPSED_BASE;
            let lastBreakEnd = AXIS_BREAK_LAST_BREAK_END_BASE;
            let stillOver = true;
            for (let i = 0; i < this.breaks.length; i++) {
                const brk = this.breaks[i];
                if (val <= brk.vmax) {
                    if (val > brk.vmin) {
                        elapsedVal += brk.vmin - lastBreakEnd
                            + (val - brk.vmin) / (brk.vmax - brk.vmin) * brk.gapReal;
                    }
                    else {
                        elapsedVal += val - lastBreakEnd;
                    }
                    lastBreakEnd = brk.vmax;
                    stillOver = false;
                    break;
                }
                elapsedVal += brk.vmin - lastBreakEnd + brk.gapReal;
                lastBreakEnd = brk.vmax;
            }
            if (stillOver) {
                elapsedVal += val - lastBreakEnd;
            }
            return elapsedVal;
        },

        /**
         * @see transformIn
         * a.k.a., "unelapse"
         */
        transformOut(elapsedVal, opt) {
            if (opt && opt.depth === SCALE_MAPPER_DEPTH_OUT_OF_BREAK) {
                return elapsedVal;
            }

            let lastElapsedEnd = AXIS_BREAK_ELAPSED_BASE;
            let lastBreakEnd = AXIS_BREAK_LAST_BREAK_END_BASE;
            let stillOver = true;
            let unelapsedVal = 0;
            for (let i = 0; i < this.breaks.length; i++) {
                const brk = this.breaks[i];
                const elapsedStart = lastElapsedEnd + brk.vmin - lastBreakEnd;
                const elapsedEnd = elapsedStart + brk.gapReal;
                if (elapsedVal <= elapsedEnd) {
                    if (elapsedVal > elapsedStart) {
                        unelapsedVal = brk.vmin
                            + (elapsedVal - elapsedStart) / (elapsedEnd - elapsedStart) * (brk.vmax - brk.vmin);
                    }
                    else {
                        unelapsedVal = lastBreakEnd + elapsedVal - lastElapsedEnd;
                    }
                    lastBreakEnd = brk.vmax;
                    stillOver = false;
                    break;
                }
                lastElapsedEnd = elapsedEnd;
                lastBreakEnd = brk.vmax;
            }
            if (stillOver) {
                unelapsedVal = lastBreakEnd + elapsedVal - lastElapsedEnd;
            }
            return unelapsedVal;
        },

    };

};

function createBreakScaleMapper(
    breakParsed: AxisBreakParsingResult | NullUndefined,
    initialExtent: number[] | NullUndefined
): BreakScaleMapper {
    return new BreakScaleMapperImpl(breakParsed, initialExtent);
}


// Both can start with any finite value, and are not necessarily equal. But they need to
// be the same in `axisBreakElapse` and `axisBreakUnelapse` respectively.
const AXIS_BREAK_ELAPSED_BASE = 0;
const AXIS_BREAK_LAST_BREAK_END_BASE = 0;


/**
 * `gapReal` in brkMapper.breaks will be calculated.
 */
function updateAxisBreakGapReal(
    brkMapper: BreakScaleMapper,
    scaleExtent: number[]
): void {
    // Considered the effect:
    //  - Use dataZoom to move some of the breaks outside the extent.
    //  - Some scenarios that `series.clip: false`.
    //
    // How to calculate `prctBrksGapRealSum`:
    //  Based on the formula:
    //      xxx.span = brk.vmax - brk.vmin
    //      xxx.tpPrct.val / xxx.tpAbs.val means ParsedAxisBreak['gapParsed']['val']
    //      .S/.E means a break that is semi in scaleExtent[0] or scaleExtent[1]
    //      valP = (
    //          + (fullyInExtBrksSum.tpAbs.gapReal - fullyInExtBrksSum.tpAbs.span)
    //          + (semiInExtBrk.S.tpAbs.gapReal - semiInExtBrk.S.tpAbs.span) * semiInExtBrk.S.tpAbs.inExtFrac
    //          + (semiInExtBrk.E.tpAbs.gapReal - semiInExtBrk.E.tpAbs.span) * semiInExtBrk.E.tpAbs.inExtFrac
    //      )
    //      valQ = (
    //          - fullyInExtBrksSum.tpPrct.span
    //          - semiInExtBrk.S.tpPrct.span * semiInExtBrk.S.tpPrct.inExtFrac
    //          - semiInExtBrk.E.tpPrct.span * semiInExtBrk.E.tpPrct.inExtFrac
    //      )
    //      gapPrctSum = sum(xxx.tpPrct.val)
    //      gapPrctSum = prctBrksGapRealSum / (
    //          + (scaleExtent[1] - scaleExtent[0]) + valP + valQ
    //          + fullyInExtBrksSum.tpPrct.gapReal
    //          + semiInExtBrk.S.tpPrct.gapReal * semiInExtBrk.S.tpPrct.inExtFrac
    //          + semiInExtBrk.E.tpPrct.gapReal * semiInExtBrk.E.tpPrct.inExtFrac
    //      )
    //  Assume:
    //      xxx.tpPrct.gapReal = xxx.tpPrct.val / gapPrctSum * prctBrksGapRealSum
    //         (NOTE: This is not accurate when semi-in-extent break exist because its
    //         proportion is not linear, but this assumption approximately works.)
    //  Derived as follows:
    //      prctBrksGapRealSum = gapPrctSum * ( (scaleExtent[1] - scaleExtent[0]) + valP + valQ )
    //          / (1
    //              - fullyInExtBrksSum.tpPrct.val
    //              - semiInExtBrk.S.tpPrct.val * semiInExtBrk.S.tpPrct.inExtFrac
    //              - semiInExtBrk.E.tpPrct.val * semiInExtBrk.E.tpPrct.inExtFrac
    //          )

    let gapPrctSum = 0;
    const fullyInExtBrksSum = {
        tpAbs: {span: 0, val: 0},
        tpPrct: {span: 0, val: 0},
    };
    const init = () => ({has: false, span: NaN, inExtFrac: NaN, val: NaN});
    const semiInExtBrk = {
        S: {tpAbs: init(), tpPrct: init()},
        E: {tpAbs: init(), tpPrct: init()},
    };

    each(brkMapper.breaks, brk => {
        const gapParsed = brk.gapParsed;

        if (gapParsed.type === 'tpPrct') {
            gapPrctSum += gapParsed.val;
        }

        const clampedBrk = clampBreakByExtent(brk, scaleExtent);
        if (clampedBrk) {
            const vminClamped = clampedBrk.vmin !== brk.vmin;
            const vmaxClamped = clampedBrk.vmax !== brk.vmax;
            const clampedSpan = clampedBrk.vmax - clampedBrk.vmin;

            if (vminClamped && vmaxClamped) {
                // Do nothing, which simply makes the result `gapReal` cover the entire scaleExtent.
                // This transform is not consistent with the other cases but practically works.
            }
            else if (vminClamped || vmaxClamped) {
                const sOrE = vminClamped ? 'S' : 'E';
                semiInExtBrk[sOrE][gapParsed.type].has = true;
                semiInExtBrk[sOrE][gapParsed.type].span = clampedSpan;
                semiInExtBrk[sOrE][gapParsed.type].inExtFrac = clampedSpan / (brk.vmax - brk.vmin);
                semiInExtBrk[sOrE][gapParsed.type].val = gapParsed.val;
            }
            else {
                fullyInExtBrksSum[gapParsed.type].span += clampedSpan;
                fullyInExtBrksSum[gapParsed.type].val += gapParsed.val;
            }
        }
    });

    const prctBrksGapRealSum = gapPrctSum
        * (0
            + (scaleExtent[1] - scaleExtent[0])
            + (fullyInExtBrksSum.tpAbs.val - fullyInExtBrksSum.tpAbs.span)
            + (semiInExtBrk.S.tpAbs.has
                ? (semiInExtBrk.S.tpAbs.val - semiInExtBrk.S.tpAbs.span) * semiInExtBrk.S.tpAbs.inExtFrac : 0
            )
            + (semiInExtBrk.E.tpAbs.has
                ? (semiInExtBrk.E.tpAbs.val - semiInExtBrk.E.tpAbs.span) * semiInExtBrk.E.tpAbs.inExtFrac : 0
            )
            - fullyInExtBrksSum.tpPrct.span
            - (semiInExtBrk.S.tpPrct.has ? semiInExtBrk.S.tpPrct.span * semiInExtBrk.S.tpPrct.inExtFrac : 0)
            - (semiInExtBrk.E.tpPrct.has ? semiInExtBrk.E.tpPrct.span * semiInExtBrk.E.tpPrct.inExtFrac : 0)
        ) / (1
            - fullyInExtBrksSum.tpPrct.val
            - (semiInExtBrk.S.tpPrct.has ? semiInExtBrk.S.tpPrct.val * semiInExtBrk.S.tpPrct.inExtFrac : 0)
            - (semiInExtBrk.E.tpPrct.has ? semiInExtBrk.E.tpPrct.val * semiInExtBrk.E.tpPrct.inExtFrac : 0)
        );

    each(brkMapper.breaks, brk => {
        const gapParsed = brk.gapParsed;
        if (gapParsed.type === 'tpPrct') {
            brk.gapReal = gapPrctSum !== 0
                // prctBrksGapRealSum is supposed to be non-negative but add a safe guard
                ? mathMax(prctBrksGapRealSum, 0) * gapParsed.val / gapPrctSum : 0;
        }
        if (gapParsed.type === 'tpAbs') {
            brk.gapReal = gapParsed.val;
        }
        if (brk.gapReal == null) {
            brk.gapReal = 0;
        }
    });
}

function pruneTicksByBreak<TItem extends ScaleTick | number>(
    pruneByBreak: ParamPruneByBreak,
    ticks: TItem[],
    breaks: ParsedAxisBreakList,
    getValue: (item: TItem) => number,
    interval: number,
    scaleExtent: number[],
): void {
    if (pruneByBreak === 'no') {
        return;
    }
    each(breaks, brk => {
        // break.vmin/vmax that out of extent must not impact the visible of
        // normal ticks and labels.
        const clampedBrk = clampBreakByExtent(brk, scaleExtent);
        if (!clampedBrk) {
            return;
        }
        // Remove some normal ticks to avoid zigzag shapes overlapping with split lines
        // and to avoid break labels overlapping with normal tick labels (thouth it can
        // also be avoided by `axisLabel.hideOverlap`).
        // It's OK to O(n^2) since the number of `ticks` are small.
        for (let j = ticks.length - 1; j >= 0; j--) {
            const tick = ticks[j];
            const val = getValue(tick);
            // 1. Ensure there is no ticks inside `break.vmin` and `break.vmax`.
            // 2. Use an empirically gap value here. Theoritically `zigzagAmplitude` is
            //  supposed to be involved to provide better precision but it will brings
            //  more complexity. The empirically gap value is conservative because break
            //  labels and normal tick lables are prone to overlapping.
            const gap = interval * 3 / 4;
            if (val > clampedBrk.vmin - gap
                && val < clampedBrk.vmax + gap
                && (
                    pruneByBreak !== 'preserve_extent_bound'
                    || (
                        val !== scaleExtent[0] && val !== scaleExtent[1]
                    )
                )
            ) {
                ticks.splice(j, 1);
            }
        }
    });
}

function addBreaksToTicks(
    // The input ticks should be in accending order.
    ticks: ScaleTick[],
    breaks: ParsedAxisBreakList,
    scaleExtent: [number, number],
    // Keep the break ends at the same level to avoid an awkward appearance.
    getTimeProps?: (clampedBrk: ParsedAxisBreak) => ScaleTick['time'],
): void {
    each(breaks, brk => {
        const clampedBrk = clampBreakByExtent(brk, scaleExtent);
        if (!clampedBrk) {
            return;
        }

        // - When neight `break.vmin` nor `break.vmax` is in scale extent,
        //  break label should not be displayed and we do not add them to the result.
        // - When only one of `break.vmin` and `break.vmax` is inside the extent and the
        //  other is outsite, we comply with the extent and display only part of the breaks area,
        //  because the extent might be determined by user settings (such as `axis.min/max`)
        ticks.push({
            value: clampedBrk.vmin,
            break: {
                type: 'vmin',
                parsedBreak: clampedBrk,
            },
            time: getTimeProps ? getTimeProps(clampedBrk) : undefined,
        });
        // When gap is 0, start tick overlap with end tick, but we still count both of them. Break
        // area shape can address that overlapping. `axisLabel` need draw both start and end separately,
        // otherwise it brings complexity to the logic of label overlapping resolving (e.g., when label
        // rotated), and introduces inconsistency to users in `axisLabel.formatter` between gap is 0 or not.
        ticks.push({
            value: clampedBrk.vmax,
            break: {
                type: 'vmax',
                parsedBreak: clampedBrk,
            },
            time: getTimeProps ? getTimeProps(clampedBrk) : undefined,
        });
    });
    if (breaks.length) {
        ticks.sort((a, b) => a.value - b.value);
    }
}

/**
 * If break and extent does not intersect, return null/undefined.
 * If the intersection is only a point at scaleExtent[0] or scaleExtent[1], return null/undefined.
 */
function clampBreakByExtent(
    brk: ParsedAxisBreak,
    scaleExtent: number[]
): NullUndefined | ParsedAxisBreak {
    const vmin = mathMax(brk.vmin, scaleExtent[0]);
    const vmax = mathMin(brk.vmax, scaleExtent[1]);
    return (
            vmin < vmax
            || (vmin === vmax && vmin > scaleExtent[0] && vmin < scaleExtent[1])
        )
        ? {
            vmin,
            vmax,
            breakOption: brk.breakOption,
            gapParsed: brk.gapParsed,
            gapReal: brk.gapReal,
        }
        : null;
}

function parseAxisBreakOption(
    // raw user input breaks, retrieved from axis model.
    breakOptionList: AxisBreakOption[] | NullUndefined,
    scale: {parse: Scale['parse']},
    opt?: ParseBreakOptionOpt
): AxisBreakParsingResult {
    const parsedBreaks: ParsedAxisBreakList = [];

    if (!breakOptionList) {
        return {breaks: parsedBreaks};
    }

    function validatePercent(normalizedPercent: number, msg: string): boolean {
        if (normalizedPercent >= 0 && normalizedPercent < 1 - 1e-5) { // Avoid division error.
            return true;
        }
        if (__DEV__) {
            error(`${msg} must be >= 0 and < 1, rather than ${normalizedPercent} .`);
        }
        return false;
    }

    each(breakOptionList, brkOption => {
        if (!brkOption || brkOption.start == null || brkOption.end == null) {
            if (__DEV__) {
                error('The input axis breaks start/end should not be empty.');
            }
            return;
        }
        if (brkOption.isExpanded) {
            return;
        }

        const parsedBrk: ParsedAxisBreak = {
            breakOption: clone(brkOption),
            vmin: scale.parse(brkOption.start),
            vmax: scale.parse(brkOption.end),
            gapParsed: {type: 'tpAbs', val: 0},
            gapReal: null
        };

        if (brkOption.gap != null) {
            let isPrct = false;
            if (isString(brkOption.gap)) {
                const trimmedGap = trim(brkOption.gap);
                if (trimmedGap.match(/%$/)) {
                    let normalizedPercent = parseFloat(trimmedGap) / 100;
                    if (!validatePercent(normalizedPercent, 'Percent gap')) {
                        normalizedPercent = 0;
                    }
                    parsedBrk.gapParsed.type = 'tpPrct';
                    parsedBrk.gapParsed.val = normalizedPercent;
                    isPrct = true;
                }
            }
            if (!isPrct) {
                let absolute = scale.parse(brkOption.gap);
                if (!isFinite(absolute) || absolute < 0) {
                    if (__DEV__) {
                        error(`Axis breaks gap must positive finite rather than (${brkOption.gap}).`);
                    }
                    absolute = 0;
                }
                parsedBrk.gapParsed.type = 'tpAbs';
                parsedBrk.gapParsed.val = absolute;
            }
        }
        if (parsedBrk.vmin === parsedBrk.vmax) {
            parsedBrk.gapParsed.type = 'tpAbs';
            parsedBrk.gapParsed.val = 0;
        }

        if (opt && opt.noNegative) {
            each(['vmin', 'vmax'] as const, se => {
                if (parsedBrk[se] < 0) {
                    if (__DEV__) {
                        error(`Axis break.${se} must not be negative.`);
                    }
                    parsedBrk[se] = 0;
                }
            });
        }

        // Ascending numerical order is the prerequisite of the calculation in Scale#normalize.
        // User are allowed to input desending vmin/vmax for simplifying the usage.
        if (parsedBrk.vmin > parsedBrk.vmax) {
            const tmp = parsedBrk.vmax;
            parsedBrk.vmax = parsedBrk.vmin;
            parsedBrk.vmin = tmp;
        }

        parsedBreaks.push(parsedBrk);
    });

    // Ascending numerical order is the prerequisite of the calculation in Scale#normalize.
    parsedBreaks.sort((item1, item2) => item1.vmin - item2.vmin);
    // Make sure that the intervals in breaks are not overlap.
    let lastEnd = -Infinity;
    each(parsedBreaks, (brk, idx) => {
        if (lastEnd > brk.vmin) {
            if (__DEV__) {
                error('Axis breaks must not overlap.');
            }
            parsedBreaks[idx] = null;
        }
        lastEnd = brk.vmax;
    });

    return {
        breaks: parsedBreaks.filter(brk => !!brk),
    };
}

function identifyAxisBreak(
    brk: AxisBreakOption,
    identifier: AxisBreakOptionIdentifierInAxis
): boolean {
    return serializeAxisBreakIdentifier(identifier) === serializeAxisBreakIdentifier(brk);
}

function serializeAxisBreakIdentifier(identifier: AxisBreakOptionIdentifierInAxis): string {
    // We use user input start/end to identify break. Considered cases like `start: new Date(xxx)`,
    // Theoretically `Scale#parse` should be used here, but not used currently to reduce dependencies,
    // since simply converting to string happens to be correct.
    return identifier.start + '_\0_' + identifier.end;
}

/**
 * - A break pair represents `[vmin, vmax]`,
 * - Only both vmin and vmax item exist, they are counted as a pair.
 */
function retrieveAxisBreakPairs<TItem, TReturnIdx extends boolean>(
    itemList: TItem[],
    getVisualAxisBreak: (item: TItem) => VisualAxisBreak | NullUndefined,
    returnIdx: TReturnIdx
): (
    TReturnIdx extends false ? TItem[][] : number[][]
) {
    const idxPairList: number[][] = [];
    each(itemList, (el, idx) => {
        const vBreak = getVisualAxisBreak(el);
        if (vBreak && vBreak.type === 'vmin') {
            idxPairList.push([idx]);
        }
    });
    each(itemList, (el, idx) => {
        const vBreak = getVisualAxisBreak(el);
        if (vBreak && vBreak.type === 'vmax') {
            const idxPair = find(
                idxPairList,
                // parsedBreak may be changed, can only use breakOption to match them.
                pr => identifyAxisBreak(
                    getVisualAxisBreak(itemList[pr[0]]).parsedBreak.breakOption,
                    vBreak.parsedBreak.breakOption
                )
            );
            idxPair && idxPair.push(idx);
        }
    });
    const result = [] as (TReturnIdx extends false ? TItem[][] : number[][]);
    each(idxPairList, idxPair => {
        if (idxPair.length === 2) {
            result.push(returnIdx
                ? (idxPair as any)
                : ([itemList[idxPair[0]] as any, itemList[idxPair[1]] as any])
            );
        }
    });
    return result;
}

function getTicksBreakOutwardTransform(
    scale: ScaleMapper,
    tick: ScaleTick,
    outermostBreaks: ParsedAxisBreakList,
    lookup: ValueTransformLookupOpt['lookup']
): {
    tickVal: number;
    vBreak: VisualAxisBreak | NullUndefined;
    // Return: If no break, return null/undefined.
} | NullUndefined {

    if (!tick.break) {
        return;
    }

    const brk = tick.break.parsedBreak;
    const originalBrkItem = find(outermostBreaks, brk => identifyAxisBreak(
        brk.breakOption, tick.break.parsedBreak.breakOption
    ));
    // NOTE: `tick.break` may have been clamped by scale extent.
    const opt: ScaleMapperTransformOutOpt = {lookup, depth: SCALE_MAPPER_DEPTH_OUT_OF_BREAK};
    const vmin = scale.transformOut(brk.vmin, opt);
    const vmax = scale.transformOut(brk.vmax, opt);
    const parsedBreak = {
        vmin,
        vmax,
        breakOption: brk.breakOption, // It is not changed by extent clamping.
        gapParsed: clone(originalBrkItem.gapParsed),
        gapReal: brk.gapReal,
    };
    return {
        tickVal: parsedBreak[tick.break.type],
        vBreak: {type: tick.break.type, parsedBreak},
    };
}

function parseAxisBreakOptionInwardTransform(
    breakOptionList: AxisBreakOption[] | NullUndefined,
    scale: Scale,
    parseOpt: ParseBreakOptionOpt,
    lookupStartIdx: number,
    out: {
        lookup: ValueTransformLookupOpt['lookup'];
        original?: AxisBreakParsingResult;
        transformed?: AxisBreakParsingResult;
    }
): void {
    out.original = parseAxisBreakOption(breakOptionList, scale, parseOpt);
    const transformed = out.transformed = parseAxisBreakOption(breakOptionList, scale, parseOpt);
    const lookup = out.lookup;

    transformed.breaks = map(transformed.breaks, (brk, idx) => {
        const transOpt = {depth: SCALE_MAPPER_DEPTH_OUT_OF_BREAK} as const;
        const vmin = scale.transformIn(brk.vmin, transOpt);
        const vmax = scale.transformIn(brk.vmax, transOpt);
        const gapParsed = {
            type: brk.gapParsed.type,
            val: brk.gapParsed.type === 'tpAbs'
                ? scale.transformIn(brk.vmin + brk.gapParsed.val, transOpt) - vmin
                : brk.gapParsed.val,
        };

        lookup.from[lookupStartIdx + idx] = vmin;
        lookup.to[lookupStartIdx + idx] = brk.vmin;
        lookup.from[lookupStartIdx + idx + 1] = vmax;
        lookup.to[lookupStartIdx + idx + 1] = brk.vmax;

        return {
            vmin,
            vmax,
            gapParsed,
            gapReal: brk.gapReal,
            breakOption: brk.breakOption
        };
    });
}

const BREAK_MIN_MAX_TO_PARAM = {vmin: 'start', vmax: 'end'} as const;
function makeAxisLabelFormatterParamBreak(
    extraParam: AxisLabelFormatterExtraParams | NullUndefined,
    vBreak: VisualAxisBreak | NullUndefined
): AxisLabelFormatterExtraParams | NullUndefined {
    if (vBreak) {
        extraParam = extraParam || ({} as AxisLabelFormatterExtraParams);
        extraParam.break = {
            type: BREAK_MIN_MAX_TO_PARAM[vBreak.type],
            start: vBreak.parsedBreak.vmin,
            end: vBreak.parsedBreak.vmax,
        };
    }
    return extraParam;
}

export function installScaleBreakHelper(): void {
    registerScaleBreakHelperImpl({
        createBreakScaleMapper,
        pruneTicksByBreak,
        addBreaksToTicks,
        parseAxisBreakOption,
        identifyAxisBreak,
        serializeAxisBreakIdentifier,
        retrieveAxisBreakPairs,
        getTicksBreakOutwardTransform,
        parseAxisBreakOptionInwardTransform,
        makeAxisLabelFormatterParamBreak,
    });
}
