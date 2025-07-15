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

import ZRText from 'zrender/src/graphic/Text';
import { LabelLayoutOption, NullUndefined } from '../util/types';
import {
    BoundingRect, OrientedBoundingRect, Polyline, WH, XY, ensureCopyRect, ensureCopyTransform, expandOrShrinkRect,
    isBoundingRectAxisAligned
} from '../util/graphic';
import type Element from 'zrender/src/Element';
import { PointLike } from 'zrender/src/core/Point';
import { BoundingRectIntersectOpt } from 'zrender/src/core/BoundingRect';
import { MatrixArray } from 'zrender/src/core/matrix';
import { LabelExtendedTextStyle, LabelMarginType } from './labelStyle';

/**
 * This is the input for label layout and overlap resolving.
 */
interface LabelLayoutBase {
    label: ZRText
    labelLine?: Polyline | NullUndefined
    layoutOption?: LabelLayoutOption | NullUndefined
    priority: number
    // @see `SavedLabelAttr` in `LabelManager.ts`
    defaultAttr: {
        ignore?: boolean
        labelGuideIgnore?: boolean
    }
    // To replace user specified `textMargin` or `minMargin`.
    // Format: `[top, right, bottom, left]`
    // e.g., `[0, null, 0, null]` means that the top and bottom margin is replaced as `0`,
    //  and use the original settings of left and right margin.
    marginForce?: (number | NullUndefined)[] | NullUndefined;
    // For backward compatibility for `minMargin`. `minMargin` can only be a number rather than number[],
    // some series only apply `minMargin` on top/bottom but disregard left/right.
    minMarginForce?: (number | NullUndefined)[] | NullUndefined;
    // If no `textMargin` and `minMargin` is specified, use this as default.
    // Format: `[top, right, bottom, left]`
    marginDefault?: number[] | NullUndefined;

    // In grid (Cartesian) estimation process (for `grid.containLabel` and related overflow resolving handlings),
    // the `gridRect` is shrunk gradually according to the last union boundingRect of the axis labels and names.
    // But the `ignore` strategy (such as in `hideOverlap` and `fixMinMaxLabelShow`) affects this process
    // significantly - the outermost labels might be determined `ignore:true` in a big `gridRect`, but be determined
    // `ignore:false` in a shrunk `gridRect`. (e.g., if the third label touches the outermost label in a shrunk
    // `gridRect`.) That probably causes the result overflowing unexpectedly.
    // Therefore, `suggestIgnore` is introduced to ensure the `ignore` consistent during that estimation process.
    // It suggests that this label has the lowest priority in ignore-if-overlap strategy.
    suggestIgnore?: boolean;
}
const LABEL_LAYOUT_BASE_PROPS = [
    'label', 'labelLine', 'layoutOption', 'priority', 'defaultAttr',
    'marginForce', 'minMarginForce', 'marginDefault', 'suggestIgnore'
] as const;

/**
 * [CAUTION]
 *  - These props will be created and cached.
 *  - The created props may be modified directly (rather than recreate) for performance consideration,
 *      therefore, do not use the internal data structure of the el.
 */
export interface LabelGeometry {
    // Only ignore is necessary in intersection check.
    label: Pick<ZRText, 'ignore'>
    // `NullUndefined` means dirty, as that is a uninitialized value.
    dirty: (typeof LABEL_LAYOUT_DIRTY_ALL) | NullUndefined
    // Global rect from `localRect`
    rect: BoundingRect
    // Weither the localRect aligns to screen-pixel x or y axis.
    axisAligned: boolean
    // Considering performance, obb is not created until it is really needed.
    // Use `ensureOBB(labelLayout)` to create and cache obb before using it,
    // created by `localRect`&`transform`.
    obb: OrientedBoundingRect | NullUndefined
    // localRect of the label.
    localRect: BoundingRect
    // The transform of `label`. Be `NullUndefined` if no `transform`, which follows
    // the rule of `Element['transform']`, and bypass some unnecessary calculation.
    transform: number[] | NullUndefined
}

// A `LabelLayoutData` indicates that the props of `LabelGeometry` are not necessarily computed.
// Use `Partial<LabelGeometry>` to check prop name conflicts with `LabelGeometry`.
export type LabelLayoutData = LabelLayoutBase & Partial<LabelGeometry>;
// A `LabelLayoutWithGeometry` indicates that `ensureLabelLayoutWithGeometry` has been performed.
export type LabelLayoutWithGeometry = LabelLayoutBase & LabelGeometry;


const LABEL_LAYOUT_DIRTY_BIT_OTHERS = 1 as const;
const LABEL_LAYOUT_DIRTY_BIT_OBB = 2 as const;
const LABEL_LAYOUT_DIRTY_ALL = LABEL_LAYOUT_DIRTY_BIT_OTHERS | LABEL_LAYOUT_DIRTY_BIT_OBB;

export function setLabelLayoutDirty(
    labelGeometry: Partial<LabelGeometry>, dirtyOrClear: boolean, dirtyBits?: number
): void {
    dirtyBits = dirtyBits || LABEL_LAYOUT_DIRTY_ALL;
    dirtyOrClear
        ? (labelGeometry.dirty |= dirtyBits)
        : (labelGeometry.dirty &= ~dirtyBits);
}

function isLabelLayoutDirty(
    labelGeometry: Partial<LabelGeometry>, dirtyBits?: number
): boolean {
    dirtyBits = dirtyBits || LABEL_LAYOUT_DIRTY_ALL;
    return labelGeometry.dirty == null || !!(labelGeometry.dirty & dirtyBits);
}

/**
 * [CAUTION]
 *  - No auto dirty propagation mechanism yet. If the transform of the raw label or any of its ancestors is
 *    changed, must sync the changes to the props of `LabelGeometry` by:
 *    either explicitly call:
 *      `setLabelLayoutDirty(labelLayout, true); ensureLabelLayoutWithGeometry(labelLayout);`
 *    or call (if only translation is performed):
 *      `labelLayoutApplyTranslation(labelLayout);`
 *  - `label.ignore` is not necessarily falsy, and not considered in computing `LabelGeometry`,
 *    since it might be modified by some overlap resolving handling.
 *  - To duplicate or make a variation:
 *    use `newLabelLayoutWithGeometry`.
 *
 * The result can also be the input of this method.
 * @return `NullUndefined` if and only if `labelLayout` is `NullUndefined`.
 */
export function ensureLabelLayoutWithGeometry(
    labelLayout: LabelLayoutData | NullUndefined
): LabelLayoutWithGeometry | NullUndefined {
    if (!labelLayout) {
        return;
    }
    if (isLabelLayoutDirty(labelLayout)) {
        computeLabelGeometry(labelLayout, labelLayout.label, labelLayout);
    }
    return labelLayout as LabelLayoutWithGeometry;
}

/**
 * The props in `out` will be filled if existing, or created.
 */
export function computeLabelGeometry<TOut extends LabelGeometry>(
    out: Partial<TOut>,
    label: ZRText,
    opt?: Pick<LabelLayoutData, 'marginForce' | 'minMarginForce' | 'marginDefault'>
): TOut {
    // [CAUTION] These props may be modified directly for performance consideration,
    //  therefore, do not output the internal data structure of zrender Element.

    const rawTransform = label.getComputedTransform();
    out.transform = ensureCopyTransform(out.transform, rawTransform);

    // NOTE: should call `getBoundingRect` after `getComputedTransform`, or may get an inaccurate bounding rect.
    //  The reason is that `getComputedTransform` calls `__host.updateInnerText()` internally, which updates the label
    //  by `textConfig` mounted on the host.
    // PENDING: add a dirty bit for that in zrender?
    const outLocalRect = out.localRect = ensureCopyRect(out.localRect, label.getBoundingRect());

    const labelStyleExt = label.style as LabelExtendedTextStyle;
    let margin = labelStyleExt.margin;
    const marginForce = opt && opt.marginForce;
    const minMarginForce = opt && opt.minMarginForce;
    const marginDefault = opt && opt.marginDefault;
    let marginType = labelStyleExt.__marginType;
    if (marginType == null && marginDefault) {
        margin = marginDefault;
        marginType = LabelMarginType.textMargin;
    }
    // `textMargin` and `minMargin` can not exist both.
    for (let i = 0; i < 4; i++) {
        _tmpLabelMargin[i] =
            (marginType === LabelMarginType.minMargin && minMarginForce && minMarginForce[i] != null)
            ? minMarginForce[i]
            : (marginForce && marginForce[i] != null)
            ? marginForce[i]
            : (margin ? margin[i] : 0);
    }
    if (marginType === LabelMarginType.textMargin) {
        expandOrShrinkRect(outLocalRect, _tmpLabelMargin, false, false);
    }

    const outGlobalRect = out.rect = ensureCopyRect(out.rect, outLocalRect);
    if (rawTransform) {
        outGlobalRect.applyTransform(rawTransform);
    }

    // Notice: label.style.margin is actually `minMargin / 2`, handled by `setTextStyleCommon`.
    if (marginType === LabelMarginType.minMargin) {
        expandOrShrinkRect(outGlobalRect, _tmpLabelMargin, false, false);
    }

    out.axisAligned = isBoundingRectAxisAligned(rawTransform);

    (out.label = out.label || {} as TOut['label']).ignore = label.ignore;

    setLabelLayoutDirty(out as TOut, false);
    setLabelLayoutDirty(out as TOut, true, LABEL_LAYOUT_DIRTY_BIT_OBB);
    // Do not remove `obb` (if existing) for reuse, just reset the dirty bit.

    return out as TOut;
}
const _tmpLabelMargin: number[] = [0, 0, 0, 0];

/**
 * The props in `out` will be filled if existing, or created.
 */
export function computeLabelGeometry2<TOut extends LabelGeometry>(
    out: Partial<TOut>,
    rawLocalRect: BoundingRect,
    rawTransform: MatrixArray | NullUndefined
): TOut {
    out.transform = ensureCopyTransform(out.transform, rawTransform);
    out.localRect = ensureCopyRect(out.localRect, rawLocalRect);
    out.rect = ensureCopyRect(out.rect, rawLocalRect);
    if (rawTransform) {
        out.rect.applyTransform(rawTransform);
    }
    out.axisAligned = isBoundingRectAxisAligned(rawTransform);
    out.obb = undefined; // Reset to undefined, will be created by `ensureOBB` when using.
    (out.label = out.label || {} as TOut['label']).ignore = false;

    return out as TOut;
}

/**
 * This is a shortcut of
 *   ```js
 *   labelLayout.label.x = newX;
 *   labelLayout.label.y = newY;
 *   setLabelLayoutDirty(labelLayout, true);
 *   ensureLabelLayoutWithGeometry(labelLayout);
 *   ```
 * and provide better performance in this common case.
 */
export function labelLayoutApplyTranslation(
    labelLayout: LabelLayoutData,
    offset: PointLike,
): void {
    if (!labelLayout) {
        return;
    }

    labelLayout.label.x += offset.x;
    labelLayout.label.y += offset.y;
    labelLayout.label.markRedraw();

    const transform = labelLayout.transform;
    if (transform) {
        transform[4] += offset.x;
        transform[5] += offset.y;
    }

    const globalRect = labelLayout.rect;
    if (globalRect) {
        globalRect.x += offset.x;
        globalRect.y += offset.y;
    }

    const obb = labelLayout.obb;
    if (obb) {
        obb.fromBoundingRect(labelLayout.localRect, transform);
    }
}

/**
 * To duplicate or make a variation of a label layout.
 * Copy the only relevant properties to avoid the conflict or wrongly reuse of the props of `LabelLayoutWithGeometry`.
 */
export function newLabelLayoutWithGeometry(
    newBaseWithDefaults: Partial<LabelLayoutData>,
    source: LabelLayoutBase
): LabelLayoutWithGeometry {
    for (let i = 0; i < LABEL_LAYOUT_BASE_PROPS.length; i++) {
        const prop = LABEL_LAYOUT_BASE_PROPS[i];
        if (newBaseWithDefaults[prop] == null) {
            (newBaseWithDefaults[prop] as any) = source[prop];
        }
    }
    return ensureLabelLayoutWithGeometry(newBaseWithDefaults as LabelLayoutData);
}

/**
 * Create obb if no one, can cache it.
 */
function ensureOBB(labelGeometry: LabelGeometry): OrientedBoundingRect {
    let obb = labelGeometry.obb;
    if (!obb || isLabelLayoutDirty(labelGeometry, LABEL_LAYOUT_DIRTY_BIT_OBB)) {
        labelGeometry.obb = obb = obb || new OrientedBoundingRect();
        obb.fromBoundingRect(labelGeometry.localRect, labelGeometry.transform);
        setLabelLayoutDirty(labelGeometry, false, LABEL_LAYOUT_DIRTY_BIT_OBB);
    }
    return obb;
}

/**
 * Adjust labels on x/y direction to avoid overlap.
 *
 * PENDING: the current implementation is based on the global bounding rect rather than the local rect,
 *  which may be not preferable in some edge cases when the label has rotation, but works for most cases,
 *  since rotation is unnecessary when there is sufficient space, while squeezing is applied regardless
 *  of overlapping when there is no enough space.
 *
 * NOTICE:
 *  - The input `list` and its content will be modified (sort, label.x/y, rect).
 *  - The caller should sync the modifications to the other parts by
 *    `setLabelLayoutDirty` and `ensureLabelLayoutWithGeometry` if needed.
 *
 * @return adjusted
 */
export function shiftLayoutOnXY(
    list: Pick<LabelLayoutWithGeometry, 'rect' | 'label'>[],
    xyDimIdx: 0 | 1, // 0 for x, 1 for y
    minBound: number, // for x, leftBound; for y, topBound
    maxBound: number, // for x, rightBound; for y, bottomBound
    // If average the shifts on all labels and add them to 0
    // TODO: Not sure if should enable it.
    // Pros: The angle of lines will distribute more equally
    // Cons: In some layout. It may not what user wanted. like in pie. the label of last sector is usually changed unexpectedly.
    balanceShift?: boolean
): boolean {
    const len = list.length;
    const xyDim = XY[xyDimIdx];
    const sizeDim = WH[xyDimIdx];

    if (len < 2) {
        return false;
    }

    list.sort(function (a, b) {
        return a.rect[xyDim] - b.rect[xyDim];
    });

    let lastPos = 0;
    let delta;
    let adjusted = false;

    // const shifts = [];
    let totalShifts = 0;
    for (let i = 0; i < len; i++) {
        const item = list[i];
        const rect = item.rect;
        delta = rect[xyDim] - lastPos;
        if (delta < 0) {
            // shiftForward(i, len, -delta);
            rect[xyDim] -= delta;
            item.label[xyDim] -= delta;
            adjusted = true;
        }
        const shift = Math.max(-delta, 0);
        // shifts.push(shift);
        totalShifts += shift;

        lastPos = rect[xyDim] + rect[sizeDim];
    }
    if (totalShifts > 0 && balanceShift) {
        // Shift back to make the distribution more equally.
        shiftList(-totalShifts / len, 0, len);
    }

    // TODO bleedMargin?
    const first = list[0];
    const last = list[len - 1];
    let minGap: number;
    let maxGap: number;
    updateMinMaxGap();

    // If ends exceed two bounds, squeeze at most 80%, then take the gap of two bounds.
    minGap < 0 && squeezeGaps(-minGap, 0.8);
    maxGap < 0 && squeezeGaps(maxGap, 0.8);
    updateMinMaxGap();
    takeBoundsGap(minGap, maxGap, 1);
    takeBoundsGap(maxGap, minGap, -1);

    // Handle bailout when there is not enough space.
    updateMinMaxGap();

    if (minGap < 0) {
        squeezeWhenBailout(-minGap);
    }
    if (maxGap < 0) {
        squeezeWhenBailout(maxGap);
    }

    function updateMinMaxGap() {
        minGap = first.rect[xyDim] - minBound;
        maxGap = maxBound - last.rect[xyDim] - last.rect[sizeDim];
    }

    function takeBoundsGap(gapThisBound: number, gapOtherBound: number, moveDir: 1 | -1) {
        if (gapThisBound < 0) {
            // Move from other gap if can.
            const moveFromMaxGap = Math.min(gapOtherBound, -gapThisBound);
            if (moveFromMaxGap > 0) {
                shiftList(moveFromMaxGap * moveDir, 0, len);
                const remained = moveFromMaxGap + gapThisBound;
                if (remained < 0) {
                    squeezeGaps(-remained * moveDir, 1);
                }
            }
            else {
                squeezeGaps(-gapThisBound * moveDir, 1);
            }
        }
    }

    function shiftList(delta: number, start: number, end: number) {
        if (delta !== 0) {
            adjusted = true;
        }
        for (let i = start; i < end; i++) {
            const item = list[i];
            const rect = item.rect;
            rect[xyDim] += delta;
            item.label[xyDim] += delta;
        }
    }

    // Squeeze gaps if the labels exceed margin.
    function squeezeGaps(delta: number, maxSqeezePercent: number) {
        const gaps: number[] = [];
        let totalGaps = 0;
        for (let i = 1; i < len; i++) {
            const prevItemRect = list[i - 1].rect;
            const gap = Math.max(list[i].rect[xyDim] - prevItemRect[xyDim] - prevItemRect[sizeDim], 0);
            gaps.push(gap);
            totalGaps += gap;
        }
        if (!totalGaps) {
            return;
        }

        const squeezePercent = Math.min(Math.abs(delta) / totalGaps, maxSqeezePercent);

        if (delta > 0) {
            for (let i = 0; i < len - 1; i++) {
                // Distribute the shift delta to all gaps.
                const movement = gaps[i] * squeezePercent;
                // Forward
                shiftList(movement, 0, i + 1);
            }
        }
        else {
            // Backward
            for (let i = len - 1; i > 0; i--) {
                // Distribute the shift delta to all gaps.
                const movement = gaps[i - 1] * squeezePercent;
                shiftList(-movement, i, len);
            }
        }
    }

    /**
     * Squeeze to allow overlap if there is no more space available.
     * Let other overlapping strategy like hideOverlap do the job instead of keep exceeding the bounds.
     */
    function squeezeWhenBailout(delta: number) {
        const dir = delta < 0 ? -1 : 1;
        delta = Math.abs(delta);
        const moveForEachLabel = Math.ceil(delta / (len - 1));

        for (let i = 0; i < len - 1; i++) {
            if (dir > 0) {
                // Forward
                shiftList(moveForEachLabel, 0, i + 1);
            }
            else {
                // Backward
                shiftList(-moveForEachLabel, len - i - 1, len);
            }

            delta -= moveForEachLabel;

            if (delta <= 0) {
                return;
            }
        }
    }

    return adjusted;
}

/**
 * @see `SavedLabelAttr` in `LabelManager.ts`
 * @see `hideOverlap`
 */
export function restoreIgnore(labelList: LabelLayoutData[]): void {
    for (let i = 0; i < labelList.length; i++) {
        const labelItem = labelList[i];
        const defaultAttr = labelItem.defaultAttr;
        const labelLine = labelItem.labelLine;
        labelItem.label.attr('ignore', defaultAttr.ignore);
        labelLine && labelLine.attr('ignore', defaultAttr.labelGuideIgnore);
    }
}

/**
 * [NOTICE - restore]:
 *  'series:layoutlabels' may be triggered during some shortcut passes, such as zooming in series.graph/geo
 *  (`updateLabelLayout`), where the modified `Element` props should be restorable from `defaultAttr`.
 *  @see `SavedLabelAttr` in `LabelManager.ts`
 *  `restoreIgnore` can be called to perform the restore, if needed.
 *
 * [NOTICE - state]:
 *  Regarding Element's states, this method is only designed for the normal state.
 *  PENDING: although currently this method is effectively called in other states in `updateLabelLayout` case,
 *      the bad case is not noticeable in the zooming scenario.
 */
export function hideOverlap(labelList: LabelLayoutData[]): void {
    const displayedLabels: LabelLayoutWithGeometry[] = [];

    // TODO, render overflow visible first, put in the displayedLabels.
    labelList.sort(function (a, b) {
        return ((b.suggestIgnore ? 1 : 0) - (a.suggestIgnore ? 1 : 0))
            || (b.priority - a.priority);
    });

    function hideEl(el: Element) {
        if (!el.ignore) {
            // Show on emphasis.
            const emphasisState = el.ensureState('emphasis');
            if (emphasisState.ignore == null) {
                emphasisState.ignore = false;
            }
        }

        el.ignore = true;
    }

    for (let i = 0; i < labelList.length; i++) {
        const labelItem = ensureLabelLayoutWithGeometry(labelList[i]);

        // The current `el.ignore` is involved, since some previous overlap
        // resolving strategies may have set `el.ignore` to true.
        if (labelItem.label.ignore) {
            continue;
        }

        const label = labelItem.label;
        const labelLine = labelItem.labelLine;

        // NOTICE: even when the with/height of globalRect of a label is 0, the label line should
        // still be displayed, since we should follow the concept of "truncation", meaning that
        // something exists even if it cannot be fully displayed. A visible label line is necessary
        // to allow users to get a tooltip with label info on hover.

        let overlapped = false;
        for (let j = 0; j < displayedLabels.length; j++) {
            if (labelIntersect(labelItem, displayedLabels[j], null, {touchThreshold: 0.05})) {
                overlapped = true;
                break;
            }
        }

        // TODO Callback to determine if this overlap should be handled?
        if (overlapped) {
            hideEl(label);
            labelLine && hideEl(labelLine);
        }
        else {
            displayedLabels.push(labelItem);
        }
    }
}

/**
 * Enable fast check for performance; use obb if inevitable.
 * If `mtv` is used, `targetLayoutInfo` can be moved based on the values filled into `mtv`.
 *
 * This method is based only on the current `Element` states (regardless of other states).
 * Typically this method (and the entire layout process) is performed in normal state.
 */
export function labelIntersect(
    baseLayoutInfo: LabelGeometry | NullUndefined,
    targetLayoutInfo: LabelGeometry | NullUndefined,
    mtv?: PointLike,
    intersectOpt?: BoundingRectIntersectOpt
): boolean {
    if (!baseLayoutInfo || !targetLayoutInfo) {
        return false;
    }
    if ((baseLayoutInfo.label && baseLayoutInfo.label.ignore)
        || (targetLayoutInfo.label && targetLayoutInfo.label.ignore)
    ) {
        return false;
    }
    // Fast rejection.
    if (!baseLayoutInfo.rect.intersect(targetLayoutInfo.rect, mtv, intersectOpt)) {
        return false;
    }
    if (baseLayoutInfo.axisAligned && targetLayoutInfo.axisAligned) {
        return true; // obb is the same as the normal bounding rect.
    }
    return ensureOBB(baseLayoutInfo).intersect(ensureOBB(targetLayoutInfo), mtv, intersectOpt);
}
