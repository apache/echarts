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
import { LabelExtendedText, LabelLayoutOption, LabelMarginType, NullUndefined } from '../util/types';
import { BoundingRect, OrientedBoundingRect, Polyline } from '../util/graphic';
import type Element from 'zrender/src/Element';
import { PointLike } from 'zrender/src/core/Point';
import { map, retrieve2 } from 'zrender/src/core/util';
import type { AxisBuilderCfg } from '../component/axis/AxisBuilder';
import { normalizeCssArray } from '../util/format';

interface LabelLayoutListPrepareInput {
    label: ZRText
    labelLine?: Polyline
    computedLayoutOption?: LabelLayoutOption
    priority: number
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore?: boolean
    }
}

export interface LabelLayoutInfo {
    label: ZRText
    labelLine: Polyline
    priority: number
    rect: BoundingRect // Global rect
    localRect: BoundingRect
    obb?: OrientedBoundingRect  // Only available when axisAligned is true
    axisAligned: boolean
    layoutOption: LabelLayoutOption
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore?: boolean
    }
    transform: number[]
}

export type LabelLayoutAntiTextJoin = number | 'auto' | NullUndefined;

export function prepareLayoutList(
    input: LabelLayoutListPrepareInput[],
    opt?: {
        alwaysOBB?: boolean,
        ignoreTextMargin?: boolean,
    }
): LabelLayoutInfo[] {
    const list: LabelLayoutInfo[] = [];

    for (let i = 0; i < input.length; i++) {
        const rawItem = input[i];
        if (rawItem.defaultAttr.ignore) {
            continue;
        }

        const label = rawItem.label;
        const transform = label.getComputedTransform();
        // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
        let localRect = label.getBoundingRect();
        const isAxisAligned = !transform || (Math.abs(transform[1]) < 1e-5 && Math.abs(transform[2]) < 1e-5);

        const marginType = (label as LabelExtendedText).__marginType;
        if (opt && !opt.ignoreTextMargin && marginType === LabelMarginType.textMargin) {
            const textMargin = normalizeCssArray(retrieve2(label.style.margin, [0, 0]));
            localRect = localRect.clone();
            localRect.x -= textMargin[3];
            localRect.y -= textMargin[0];
            localRect.width += textMargin[1] + textMargin[3];
            localRect.height += textMargin[0] + textMargin[2];
        }

        const globalRect = localRect.clone();
        globalRect.applyTransform(transform);

        if (marginType == null || marginType === LabelMarginType.minMargin) {
            // `minMargin` only support number value.
            const minMargin = (label.style.margin as number) || 0;
            globalRect.x -= minMargin / 2;
            globalRect.y -= minMargin / 2;
            globalRect.width += minMargin;
            globalRect.height += minMargin;
        }

        const obb = (!isAxisAligned || (opt && opt.alwaysOBB))
            ? new OrientedBoundingRect(localRect, transform)
            : null;

        list.push({
            label,
            labelLine: rawItem.labelLine,
            rect: globalRect,
            localRect,
            obb,
            priority: rawItem.priority,
            defaultAttr: rawItem.defaultAttr,
            layoutOption: rawItem.computedLayoutOption,
            axisAligned: isAxisAligned,
            transform
        });
    }
    return list;
}

function shiftLayout(
    list: Pick<LabelLayoutInfo, 'rect' | 'label'>[],
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
    list: Pick<LabelLayoutInfo, 'rect' | 'label'>[],
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
    list: Pick<LabelLayoutInfo, 'rect' | 'label'>[],
    topBound: number,
    bottomBound: number,
    // If average the shifts on all labels and add them to 0
    balanceShift?: boolean
): boolean {
    return shiftLayout(list, 'y', 'height', topBound, bottomBound, balanceShift);
}

export function hideOverlap(labelList: LabelLayoutInfo[]) {
    const displayedLabels: LabelLayoutInfo[] = [];

    // TODO, render overflow visible first, put in the displayedLabels.
    labelList.sort(function (a, b) {
        return b.priority - a.priority;
    });

    const globalRect = new BoundingRect(0, 0, 0, 0);

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
        const labelItem = labelList[i];
        const isAxisAligned = labelItem.axisAligned;
        const localRect = labelItem.localRect;
        const transform = labelItem.transform;
        const label = labelItem.label;
        const labelLine = labelItem.labelLine;
        globalRect.copy(labelItem.rect);
        // Add a threshold because layout may be aligned precisely.
        const touchThreshold = 0.05;
        globalRect.width -= touchThreshold * 2;
        globalRect.height -= touchThreshold * 2;
        globalRect.x += touchThreshold;
        globalRect.y += touchThreshold;

        // NOTICE: even when the with/height of globalRect of a label is 0, the label line should
        // still be displayed, since we should follow the concept of "truncation", meaning that
        // something exists even if it cannot be fully displayed. A visible label line is necessary
        // to allow users to get a tooltip with label info on hover.

        let obb = labelItem.obb;
        let overlapped = false;
        for (let j = 0; j < displayedLabels.length; j++) {
            const existsTextCfg = displayedLabels[j];
            // Fast rejection.
            if (!globalRect.intersect(existsTextCfg.rect)) {
                continue;
            }

            if (isAxisAligned && existsTextCfg.axisAligned) {   // Is overlapped
                overlapped = true;
                break;
            }

            if (!existsTextCfg.obb) { // If self is not axis aligned. But other is.
                existsTextCfg.obb = new OrientedBoundingRect(existsTextCfg.localRect, existsTextCfg.transform);
            }

            if (!obb) { // If self is axis aligned. But other is not.
                obb = new OrientedBoundingRect(localRect, transform);
            }

            if (obb.intersect(existsTextCfg.obb, null, {touchThreshold})) {
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
 * If no intercection, return null/undefined.
 * Otherwise return:
 *  - mtv (the output of OBB intersect). pair[1]+mtv can just resolve overlap.
 *  - corresponding layout info
 */
export function detectAxisLabelPairIntersection(
    axisRotation: AxisBuilderCfg['rotation'],
    labelPair: ZRText[], // [label0, label1]
    touchThreshold: number,
    ignoreTextMargin: boolean
): NullUndefined | {
    mtv: PointLike;
    layoutPair: LabelLayoutInfo[]
} {
    if (!labelPair[0] || !labelPair[1]) {
        return;
    }
    const layoutPair = prepareLayoutList(map(labelPair, label => {
        return {
            label,
            priority: label.z2,
            defaultAttr: {
                ignore: label.ignore
            }
        };
    }), {
        alwaysOBB: true,
        ignoreTextMargin,
    });

    if (!layoutPair[0] || !layoutPair[1]) { // If either label is ignored
        return;
    }

    const mtv = {x: NaN, y: NaN};
    if (layoutPair[0].obb.intersect(layoutPair[1].obb, mtv, {
        direction: -axisRotation,
        touchThreshold,
        // If need to resovle intersection align axis by moving labels according to MTV,
        // the direction must not be opposite, otherwise cause misleading.
        bidirectional: false,
    })) {
        return {mtv, layoutPair};
    }
}
