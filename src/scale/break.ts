import { assert, clone, each, find, isString, trim } from 'zrender/src/core/util';
import {
    NullUndefined, ParsedScaleBreak, ParsedScaleBreakList, ScaleBreakOption,
    ScaleBreakOptionIdentifier, ScaleTick, VisualScaleBreak
} from '../util/types';
import { error } from '../util/log';
import type Scale from './Scale';

export class ScaleBreakContext {

    // [CAVEAT]: Should set only by `ScaleBreakContext#setBreaks`!
    readonly breaks: ParsedScaleBreakList = [];

    // [CAVEAT]: Should update only by `ScaleBreakContext#update`!
    // They are the values that scaleExtent[0] and scaleExtent[1] are mapped to a numeric axis
    // that breaks are applied, primarily for optimization of `Scale#normalize`.
    private _elapsedExtent: [number, number] = [Infinity, -Infinity];

    setBreaks(parsed: ScaleBreakParsingResult): void {
        // @ts-ignore
        this.breaks = parsed.breaks;
    }

    /**
     * [CAVEAT]: Must be called immediately each time scale extent and breaks are updated!
     */
    update(scaleExtent: [number, number]): void {
        updateAxisBreakGapReal(this, scaleExtent);
        const elapsedExtent = this._elapsedExtent;
        elapsedExtent[0] = this.elapse(scaleExtent[0]);
        elapsedExtent[1] = this.elapse(scaleExtent[1]);
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
                    assert(multiple >= 0 && Math.round(multiple) === multiple);
                }
                return multiple;
            }
        }
        return 0;
    }

    getExtentSpan(): number {
        return this._elapsedExtent[1] - this._elapsedExtent[0];
    }

    normalize(val: number): number {
        const elapsedSpan = this._elapsedExtent[1] - this._elapsedExtent[0];
        // The same logic as `Scale#normalize`.
        if (elapsedSpan === 0) {
            return 0.5;
        }
        return (this.elapse(val) - this._elapsedExtent[0]) / elapsedSpan;
    }

    scale(val: number): number {
        return this.unelapse(
            val * (this._elapsedExtent[1] - this._elapsedExtent[0]) + this._elapsedExtent[0]
        );
    }

    /**
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
     *   The mapping has nothing to do with "scale extent".
     */
    elapse(val: number): number {
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
    }

    unelapse(elapsedVal: number): number {
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
    }

};


// Both can start with any finite value, and are not necessaryily equal. But they need to
// be the same in `axisBreakElapse` and `axisBreakUnelapse` respectively.
const AXIS_BREAK_ELAPSED_BASE = 0;
const AXIS_BREAK_LAST_BREAK_END_BASE = 0;


/**
 * `gapReal` in brkCtx.breaks will be calculated.
 */
function updateAxisBreakGapReal(
    brkCtx: ScaleBreakContext,
    scaleExtent: [number, number]
): void {
    // Considered the effect:
    //  - Use dataZoom to move some of the breaks outside the extent.
    //  - Some scenarios that `series.clip: false`.
    //
    // How to calculate `prctBrksGapRealSum`:
    //  Based on the formula:
    //      xxx.span = brk.vmax - brk.vmin
    //      xxx.tpPrct.val / xxx.tpAbs.val means ParsedScaleBreak['gapParsed']['val']
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

    each(brkCtx.breaks, brk => {
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

    each(brkCtx.breaks, brk => {
        const gapParsed = brk.gapParsed;
        if (gapParsed.type === 'tpPrct') {
            brk.gapReal = gapPrctSum !== 0
                // prctBrksGapRealSum is supposed to be non-negative but add a safe guard
                ? Math.max(prctBrksGapRealSum, 0) * gapParsed.val / gapPrctSum : 0;
        }
        if (gapParsed.type === 'tpAbs') {
            brk.gapReal = gapParsed.val;
        }
        if (brk.gapReal == null) {
            brk.gapReal = 0;
        }
    });
}

export function pruneTicksByBreak<TItem extends ScaleTick | number>(
    ticks: TItem[],
    breaks: ParsedScaleBreakList,
    getValue: (item: TItem) => number,
    interval: number,
    scaleExtent: [number, number]
): void {
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
                // If remove the tick on extent, split line on the bounary of cartesian
                // will not be displayed, causing werid effect.
                && val !== scaleExtent[0]
                && val !== scaleExtent[1]
            ) {
                ticks.splice(j, 1);
            }
        }
    });
}

export function addBreaksToTicks(
    // The input ticks should be in accending order.
    ticks: ScaleTick[],
    breaks: ParsedScaleBreakList,
    scaleExtent: [number, number],
    // Keep the break ends at the same level to avoid an awkward appearance.
    getTimeProps?: (clampedBrk: ParsedScaleBreak) => ScaleTick['time'],
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
                type: 'min',
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
                type: 'max',
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
    brk: ParsedScaleBreak,
    scaleExtent: [number, number]
): NullUndefined | ParsedScaleBreak {
    const vmin = Math.max(brk.vmin, scaleExtent[0]);
    const vmax = Math.min(brk.vmax, scaleExtent[1]);
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

export type ScaleBreakParsingResult = {
    breaks: ParsedScaleBreakList
};

export function parseAxisBreakOption(
    // raw user input breaks, retrieved from axis model.
    breakOptionList: ScaleBreakOption[] | NullUndefined,
    parse: Scale['parse'],
    opt?: {
        noNegative: boolean;
    }
): ScaleBreakParsingResult {
    const parsedBreaks: ParsedScaleBreakList = [];

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

        const parsedBrk: ParsedScaleBreak = {
            breakOption: clone(brkOption),
            vmin: parse(brkOption.start),
            vmax: parse(brkOption.end),
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
                let absolute = parse(brkOption.gap);
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


export function identifyAxisBreak(
    brk: ScaleBreakOption,
    identifier: ScaleBreakOptionIdentifier
): boolean {
    return serializeAxisBreakIdentifier(identifier) === serializeAxisBreakIdentifier(brk);
}

export function serializeAxisBreakIdentifier(identifier: ScaleBreakOptionIdentifier): string {
    // We use user input start/end to identify break. Considered cases like `start: new Date(xxx)`,
    // Theoretically `Scale#parse` should be used here, but not used currently to reduce dependencies,
    // since simply converting to string happens to be correct.
    return identifier.start + '_\0_' + identifier.end;
}

/**
 * - A break pair represents `[vmin, vmax]`,
 * - Only both vmin and vmax item exist, they are counted as a pair.
 */
export function retrieveAxisBreakPairs<TItem>(
    itemList: TItem[],
    getVisualScaleBreak: (item: TItem) => VisualScaleBreak
): TItem[][] {
    const breakLabelPairs: TItem[][] = [];
    each(itemList, el => {
        const vBreak = getVisualScaleBreak(el);
        if (vBreak && vBreak.type === 'min') {
            breakLabelPairs.push([el]);
        }
    });
    each(itemList, el => {
        const vBreak = getVisualScaleBreak(el);
        if (vBreak && vBreak.type === 'max') {
            const pair = find(
                breakLabelPairs,
                // parsedBreak may be changed, can only use breakOption to match them.
                pr => identifyAxisBreak(
                    getVisualScaleBreak(pr[0]).parsedBreak.breakOption,
                    vBreak.parsedBreak.breakOption
                )
            );
            pair && pair.push(el);
        }
    });
    return breakLabelPairs;
}
