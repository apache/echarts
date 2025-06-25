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
import { LabelExtendedTextStyle, LabelLayoutOption, LabelMarginType, NullUndefined } from '../util/types';
import {
    BoundingRect, OrientedBoundingRect, Polyline, expandOrShrinkRect,
    isBoundingRectAxisAligned
} from '../util/graphic';
import type Element from 'zrender/src/Element';
import { PointLike } from 'zrender/src/core/Point';
import { each, extend, retrieve2 } from 'zrender/src/core/util';
import { normalizeCssArray } from '../util/format';
import { BoundingRectIntersectOpt } from 'zrender/src/core/BoundingRect';
import { MatrixArray } from 'zrender/src/core/matrix';

// Also prevent duck typing.
export const LABEL_LAYOUT_INFO_KIND_RAW = 1 as const;
export const LABEL_LAYOUT_INFO_KIND_COMPUTED = 2 as const;

// PENDING: a LabelLayoutInfoRaw with `defaultAttr.ignore: false` will become a NullUndefined,
//  rather than a LabelLayoutInfoComputed.
export type LabelLayoutInfoAll = LabelLayoutInfoRaw | LabelLayoutInfoComputed | NullUndefined;

interface LabelLayoutInfoBase {
    label: ZRText
    labelLine?: Polyline | NullUndefined
    layoutOption?: LabelLayoutOption | NullUndefined
    priority: number
    // Save the original value that may be modified in overlap resolving.
    defaultAttr: {
        ignore?: boolean
        labelGuideIgnore?: boolean
    }
    ignoreMargin?: boolean; // For backward compatibility.

    // In grid (cartesian) estimation process (for `grid.containLabel` and related overflow resolving handlings),
    // the `gridRect` is shrunk gradually according to the last union boundingRect of the axis labels and names.
    // But the `ignore` stretegy (such as in `hideOverlap` and `fixMinMaxLabelShow`) affects this process
    // significantly - the outermost labels might be determined `ignore:true` in a big `gridRect`, but be determined
    // `ignore:false` in a shrunk `gridRect`. (e.g., if the third label touches the outermost label in a shrunk
    // `gridRect`.) That probably causes the result overflowing unexpectedly. Therefore, `suggestIgnore` is
    // introduced to ensure the `ignore` consistent during that estimation process.
    suggestIgnore?: boolean;
}

export interface LabelLayoutInfoRaw extends LabelLayoutInfoBase {
    kind: typeof LABEL_LAYOUT_INFO_KIND_RAW
    // Should no other properties - ensure to be a subset of LabelLayoutInfoComputed.
}

export interface LabelLayoutInfoComputed extends LabelLayoutInfoBase, LabelIntersectionCheckInfo {
    kind: typeof LABEL_LAYOUT_INFO_KIND_COMPUTED
    // The original props in `LabelLayoutInfoBase` are preserved.

    // ------ Computed properites ------
    // All of the members in `LabelIntersectionCheckInfo`.
}

export interface LabelIntersectionCheckInfo {
    // Global rect from `localRect`
    rect: BoundingRect
    // Weither the localRect aligns to screen-pixel x or y axis.
    axisAligned: boolean
    // Considering performance, obb is not created until it is really needed.
    // Use `ensureOBB(labelLayoutInfo)` to create and cache obb before using it,
    // created by `localRect`&`transform`.
    obb: OrientedBoundingRect | NullUndefined
    // localRect of the label.
    // [CAUTION] do not modify it, since it may be the internal data structure of the el.
    localRect: BoundingRect
    // transform of `label`. If `label` has no `transform`, this prop is `NullUndefined`.
    // [CAUTION] do not modify it, since it may be the internal data structure of the el.
    transform: number[] | NullUndefined
}

export function createLabelLayoutList(
    rawList: LabelLayoutInfoRaw[]
): LabelLayoutInfoComputed[] {
    const resultList: LabelLayoutInfoComputed[] = [];
    each(rawList, raw => {
        // PENDING: necessary?
        raw = extend({}, raw);
        const layoutInfo = prepareLabelLayoutInfo(raw);
        if (layoutInfo) {
            resultList.push(layoutInfo);
        }
    });
    return resultList;
}

/**
 * If `defaultAttr.ignore: true`, return `NullUndefined`.
 *  (the caller is reponsible for ensuring the label is always `ignore: true`.)
 * Otherwise the `layoutInfo` will be modified and returned.
 * `label.ignore` is not necessarily falsy, since it might be modified by some overlap resolving handling.
 *
 * The result can also be the input of this method.
 *
 * @see ensureLabelLayoutInfoComputed
 */
function prepareLabelLayoutInfo(
    layoutInfo: LabelLayoutInfoAll
): LabelLayoutInfoComputed | NullUndefined {

    if (!layoutInfo || layoutInfo.defaultAttr.ignore) {
        return;
    }

    const label = layoutInfo.label;
    const ignoreMargin = layoutInfo.ignoreMargin;

    const transform = label.getComputedTransform();
    // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
    let localRect = label.getBoundingRect();
    const axisAligned = isBoundingRectAxisAligned(transform);

    if (!ignoreMargin) {
        localRect = applyTextMarginToLocalRect(label, localRect);
    }

    const globalRect = localRect.clone();
    globalRect.applyTransform(transform);

    if (!ignoreMargin && (label.style as LabelExtendedTextStyle).__marginType === LabelMarginType.minMargin) {
        // `minMargin` only support number value.
        const halfMinMargin = ((label.style.margin as number) || 0) / 2;
        expandOrShrinkRect(globalRect, halfMinMargin, false, false);
    }

    const computed = layoutInfo as LabelLayoutInfoComputed;
    computed.kind = LABEL_LAYOUT_INFO_KIND_COMPUTED,
    // --- computed properties ---
    computed.rect = globalRect;
    computed.localRect = localRect;
    computed.obb = null, // will be created by `ensureOBB` when using.
    computed.axisAligned = axisAligned;
    computed.transform = transform;

    return computed;
}

/**
 * The reverse operation of `ensureLabelLayoutInfoComputedv`.
 */
export function rollbackToLabelLayoutInfoRaw(
    labelLayoutInfo: LabelLayoutInfoAll
): LabelLayoutInfoRaw {
    if (labelLayoutInfo == null) {
        return;
    }
    const raw = labelLayoutInfo as unknown as LabelLayoutInfoRaw;
    raw.kind = LABEL_LAYOUT_INFO_KIND_RAW;
    return raw;
}

/**
 * This method supports that the label layout info is not computed until needed,
 * for performance consideration.
 *
 * [CAUTION]
 *  - If the raw label is changed, must call
 *    `ensureLabelLayoutInfoComputed(rollbackToLabelLayoutInfoRaw(layoutInfo))`
 *    to recreate the layout info.
 *  - Null checking is needed for the result. @see prepareLabelLayoutInfo
 *
 * Usage:
 *  To make a copy of labelLayoutInfo, simply:
 *      const layoutInfoCopy = rollbackToLabelLayoutInfoRaw(extends({}, someLabelLayoutInfo));
 */
export function ensureLabelLayoutInfoComputed(
    labelLayoutInfo: LabelLayoutInfoAll
): LabelLayoutInfoComputed | NullUndefined {
    if (!labelLayoutInfo) {
        return;
    }
    if (labelLayoutInfo.kind !== LABEL_LAYOUT_INFO_KIND_COMPUTED) {
        labelLayoutInfo = prepareLabelLayoutInfo(labelLayoutInfo);
    }
    return labelLayoutInfo;
}

export function prepareIntersectionCheckInfo(
    localRect: BoundingRect, transform: MatrixArray | NullUndefined
): LabelIntersectionCheckInfo {
    const globalRect = localRect.clone();
    globalRect.applyTransform(transform);
    return {
        obb: null,
        rect: globalRect,
        localRect,
        axisAligned: isBoundingRectAxisAligned(transform),
        transform,
    };
}

export function createSingleLayoutInfoComputed(el: ZRText): LabelLayoutInfoComputed | NullUndefined {
    return ensureLabelLayoutInfoComputed({
        kind: LABEL_LAYOUT_INFO_KIND_RAW,
        label: el,
        priority: el.z2,
        defaultAttr: {ignore: el.ignore},
    });
}

/**
 * Create obb if no one, can cache it.
 */
function ensureOBB(layoutInfo: LabelIntersectionCheckInfo): OrientedBoundingRect {
    return layoutInfo.obb || (
        layoutInfo.obb = new OrientedBoundingRect(layoutInfo.localRect, layoutInfo.transform)
    );
}

/**
 * The input localRect is never modified.
 * The returned localRect maybe the input localRect.
 */
export function applyTextMarginToLocalRect(
    label: ZRText,
    localRect: BoundingRect,
): BoundingRect {
    if ((label.style as LabelExtendedTextStyle).__marginType !== LabelMarginType.textMargin) {
        return localRect;
    }
    const textMargin = normalizeCssArray(retrieve2(label.style.margin, [0, 0]));
    localRect = localRect.clone();
    expandOrShrinkRect(localRect, textMargin, false, false);
    return localRect;
}

function shiftLayout(
    list: Pick<LabelLayoutInfoComputed, 'rect' | 'label'>[],
    xyDim: 'x' | 'y',
    sizeDim: 'width' | 'height',
    minBound: number,
    maxBound: number,
    balanceShift: boolean
) {
    const len = list.length;

    if (len < 2) {
        return;
    }

    list.sort(function (a, b) {
        return a.rect[xyDim] - b.rect[xyDim];
    });

    let lastPos = 0;
    let delta;
    let adjusted = false;

    const shifts = [];
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
        shifts.push(shift);
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
 * Adjust labels on x direction to avoid overlap.
 */
export function shiftLayoutOnX(
    list: Pick<LabelLayoutInfoComputed, 'rect' | 'label'>[],
    leftBound: number,
    rightBound: number,
    // If average the shifts on all labels and add them to 0
    // TODO: Not sure if should enable it.
    // Pros: The angle of lines will distribute more equally
    // Cons: In some layout. It may not what user wanted. like in pie. the label of last sector is usually changed unexpectedly.
    balanceShift?: boolean
): boolean {
    return shiftLayout(list, 'x', 'width', leftBound, rightBound, balanceShift);
}

/**
 * Adjust labels on y direction to avoid overlap.
 */
export function shiftLayoutOnY(
    list: Pick<LabelLayoutInfoComputed, 'rect' | 'label'>[],
    topBound: number,
    bottomBound: number,
    // If average the shifts on all labels and add them to 0
    balanceShift?: boolean
): boolean {
    return shiftLayout(list, 'y', 'height', topBound, bottomBound, balanceShift);
}

/**
 * [CAUTION]: the `label.ignore` in the input is not necessarily falsy.
 *  this method checks intersection regardless of current `ignore`,
 *  if no intersection, restore the `ignore` to `defaultAttr.ignore`.
 *  And `labelList` will be modified.
 *  Therefore, if some other overlap resolving strategy has ignored some elements,
 *  do not input them to this method.
 * PENDING: review the diff between the requirements from LabelManager and AxisBuilder,
 *  and uniform the behavior?
 */
export function hideOverlap(labelList: LabelLayoutInfoAll[]): void {
    const displayedLabels: LabelLayoutInfoComputed[] = [];

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
        const labelItem = ensureLabelLayoutInfoComputed(labelList[i]);

        if (!labelItem || labelItem.label.ignore) {
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
            label.attr('ignore', labelItem.defaultAttr.ignore);
            labelLine && labelLine.attr('ignore', labelItem.defaultAttr.labelGuideIgnore);

            displayedLabels.push(labelItem);
        }
    }
}

/**
 * [NOTICE]:
 *  - `label.ignore` is not considered - no requirement so far.
 *  - `baseLayoutInfo` and `targetLayoutInfo` may be modified - obb may be created and saved.
 *
 * Enable fast check for performance; use obb if inevitable.
 * If `mtv` is used, `targetLayoutInfo` can be moved based on the values filled into `mtv`.
 */
export function labelIntersect(
    baseLayoutInfo: LabelIntersectionCheckInfo | NullUndefined,
    targetLayoutInfo: LabelIntersectionCheckInfo | NullUndefined,
    mtv?: PointLike,
    intersectOpt?: BoundingRectIntersectOpt
): boolean {
    if (!baseLayoutInfo || !targetLayoutInfo) {
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
