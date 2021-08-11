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
import { LabelLayoutOption } from '../util/types';
import { BoundingRect, OrientedBoundingRect, Polyline, Point } from '../util/graphic';
import type Element from 'zrender/src/Element';
import { RectLike } from 'zrender/src/core/BoundingRect';

interface LabelLayoutListPrepareInput {
    label: ZRText
    labelLine: Polyline
    computedLayoutOption: LabelLayoutOption
    priority: number
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore: boolean
    }
}

export interface LabelLayoutInfo {
    label: ZRText
    labelLine: Polyline
    priority: number
    rect: BoundingRect // Global rect
    localRect: BoundingRect
    hostRect: RectLike
    obb?: OrientedBoundingRect  // Only available when axisAligned is true
    axisAligned: boolean
    layoutOption: LabelLayoutOption
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore: boolean
    }
    transform: number[]
}

export function prepareLayoutList(input: LabelLayoutListPrepareInput[]): LabelLayoutInfo[] {
    const list: LabelLayoutInfo[] = [];

    for (let i = 0; i < input.length; i++) {
        const rawItem = input[i];
        if (rawItem.defaultAttr.ignore) {
            continue;
        }

        const label = rawItem.label;
        const transform = label.getComputedTransform();
        // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
        const localRect = label.getBoundingRect();
        const isAxisAligned = !transform || (transform[1] < 1e-5 && transform[2] < 1e-5);

        const minMargin = label.style.margin || 0;
        const globalRect = localRect.clone();
        globalRect.applyTransform(transform);
        globalRect.x -= minMargin / 2;
        globalRect.y -= minMargin / 2;
        globalRect.width += minMargin;
        globalRect.height += minMargin;

        const obb = isAxisAligned ? new OrientedBoundingRect(localRect, transform) : null;
        const host = label.__hostTarget;
        let hostRect;
        if (host) {
            hostRect = host.getBoundingRect().plain();
            const transform = host.getComputedTransform();
            BoundingRect.applyTransform(hostRect, hostRect, transform);
        }

        list.push({
            label,
            labelLine: rawItem.labelLine,
            rect: globalRect,
            localRect,
            hostRect,
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
        globalRect.width -= 0.1;
        globalRect.height -= 0.1;
        globalRect.x += 0.05;
        globalRect.y += 0.05;

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

            if (obb.intersect(existsTextCfg.obb)) {
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
 * remove label overlaps
 */
export function removeOverlap(
    labelList: Pick<LabelLayoutInfo, 'rect' | 'label' | 'hostRect'>[],
    leftBound: number,
    rightBound: number,
    lowerBound: number,
    upperBound: number,
    forcePush: number = 1e-6,
    forcePull: number = 1e-4,
    maxIter: number = 3000,
    xBounds: Point = new Point(leftBound, rightBound),
    yBounds: Point = new Point(lowerBound, upperBound),
    friction: number = 0.7
) {
    const xScale = rightBound - leftBound;
    const yScale = upperBound - lowerBound;

    //Rescale x、y to be in the range [0,1]
    function zoomOut() {
        for (let i = 0; i < labelList.length; i++) {
            const rect = labelList[i].rect;
            const host = labelList[i].hostRect;
            const label = labelList[i].label;

            rect.x = (rect.x - leftBound) / xScale;
            rect.y = (rect.y - lowerBound) / yScale;
            rect.width /= xScale;
            rect.height /= yScale;
            host.x = (host.x - leftBound) / xScale;
            host.y = (host.y - lowerBound) / yScale;
            host.width /= xScale;
            host.height /= yScale;
            label.x = (label.x - leftBound) / xScale;
            label.y = (label.y - lowerBound) / yScale;
        }
    }

    // zoomIn x、y
    function zoomIn() {
        for (let i = 0; i < labelList.length; i++) {
            const rect = labelList[i].rect;
            const host = labelList[i].hostRect;
            const label = labelList[i].label;

            rect.x = rect.x * xScale + leftBound;
            rect.y = rect.y * yScale + lowerBound;
            rect.width *= xScale;
            rect.height *= yScale;
            host.x = host.x * xScale + leftBound;
            host.y = host.y * yScale + lowerBound;
            host.width *= xScale;
            host.height *= yScale;
            label.x = label.x * xScale + leftBound;
            label.y = label.y * yScale + lowerBound;
        }
    }

    // move rect center to circle center
    function initPosition() {
        for (let i = 0; i < labelList.length; i++) {
            const item = labelList[i];
            const host = item.hostRect;
            const hostCenter = [host.x + host.width / 2, host.y + host.height / 2];
            const rectCenter = [item.rect.x + item.rect.width / 2, item.rect.y + item.rect.height / 2];
            const delta_x = hostCenter[0] - rectCenter[0];
            const delta_y = hostCenter[1] - rectCenter[1];
            item.rect.x += delta_x;
            item.rect.y += delta_y;
            item.label.x += delta_x;
            item.label.y += delta_y;
        }
    }

    // get force
    function repelForce(
        p1: Point, p2: Point, force = 0.0001
    ) {
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        const d2 = Math.max(dx * dx + dy * dy, 0.0004);
        const v = new Point();
        const f = new Point();
        Point.sub(v, p1, p2);
        v.scale(1 / Math.sqrt(d2));
        Point.scale(f, v, force / d2);
        return f;
    }

    function moveRect(rect: RectLike, label: ZRText, move: Point) {
        rect.x += move.x;
        rect.y += move.y;
        label.x += move.x;
        label.y += move.y;
    }

    function springForce(p1: Point, p2: Point, force = 0.000001) {
        const f = new Point();
        const v = new Point();
        Point.sub(v, p1, p2);
        Point.scale(f, v, force);
        return f;
    }

    function overlapsRect2(rect: RectLike, other: RectLike) {
        const ax1 = rect.x;
        const ax2 = rect.x + rect.width;
        const ay1 = rect.y;
        const ay2 = rect.y + rect.height;
        const bx1 = other.x;
        const bx2 = other.x + other.width;
        const by1 = other.y;
        const by2 = other.y + other.height;

        return bx1 <= ax2 && by1 <= ay2
            && bx2 >= ax1 && by2 >= ay1;
    }

    function lineIntersect(p1: Point, q1: Point, p2: Point, q2: Point) {
        // returns true if two lines intersect, else false
        const denom = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
        const numera = (q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x);
        const numerb = (q1.x - p1.x) * (p1.y - p2.y) - (q1.y - p1.y) * (p1.x - p2.x);

        /* Is the intersection along the the segments */
        const mua = numera / denom;
        const mub = numerb / denom;
        if (!(mua < 0 || mua > 1 || mub < 0 || mub > 1)) {
            return true;
        }
        return false;
    }

    function putWithinBounds(rect: RectLike, label: ZRText, xlim: Point, ylim: Point) {
        if (rect.x < xlim.x) {
            rect.x = xlim.x;
            label.x = xlim.x;
        }
        else if (rect.x + rect.width > xlim.y) {
            rect.x = xlim.y - rect.width;
            label.x = xlim.y - rect.width;
        }
        if (rect.y < ylim.x) {
            rect.y = ylim.x;
            label.y = ylim.y;
        }
        else if (rect.y + rect.height > ylim.y) {
            rect.y = ylim.y - rect.height;
            label.y = ylim.y - rect.height;
        }
    }

    function isStuck(p1: Point, host1: Point, host2: Point, out: Point) {
        const v1 = new Point(p1.x - host1.x, p1.y - host1.y);
        const v2 = new Point(host2.x - p1.x, host2.y - p1.y);
        // whether label is stuck by two data points
        if (Math.abs(v1.x * v2.y - v2.x * v1.y - v2.x * v2.y) < 1e-5) {
            out = p1.clone();
            return true;
        }
        return false;
    }

    xBounds.scale(xScale);
    yBounds.scale(yScale);
    const forcePointSize = 100;
    const maxOverlaps = 10;
    const DataPoints: Point[] = [];
    const LabelRects: BoundingRect[] = [];
    const Labels: ZRText[] = [];
    const velocities: Point[] = [];
    const f = new Point();
    const ci = new Point();
    const cj = new Point();
    const overlapCount = [];
    const tooManyOverlaps = [];
    let iter = 0;
    let totalOverlaps = 1;
    let iOverlaps = false;

    // init
    zoomOut();
    initPosition();
    for (let i = 0; i < labelList.length; i++) {
        const item = labelList[i];
        Labels[i] = item.label;
        LabelRects[i] = item.rect;
        DataPoints[i] = new Point();
        DataPoints[i].set(item.hostRect.x + item.hostRect.width / 2, item.hostRect.y + item.hostRect.height / 2);
        // initialize velocities to zero
        velocities[i] = new Point();
        const randomMove = new Point((Math.random() - 0.5) / xScale, (Math.random() - 0.5) / yScale);
        moveRect(LabelRects[i], Labels[i], randomMove);
    }

    while (totalOverlaps && iter < maxIter) {
        iter += 1;
        totalOverlaps = 0;
        // forces get weaker over time.
        forcePush *= 0.9999;
        forcePull *= 0.9999;
        for (let i = 0; i < labelList.length; i++) {
            if (iter === 2 && overlapCount[i] > maxOverlaps) {
                tooManyOverlaps[i] = true;
            }
            if (tooManyOverlaps[i]) {
                continue;
            }
            overlapCount[i] = 0;
            iOverlaps = false;
            f.set(0, 0);
            ci.set(LabelRects[i].x + LabelRects[i].width / 2, LabelRects[i].y + LabelRects[i].height / 2);
            for (let j = 0; j < labelList.length; j++) {
                if (i === j) {
                    if (overlapsRect2(labelList[i].hostRect, LabelRects[i])) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        f.add(repelForce(
                            ci, DataPoints[i],
                            forcePush * forcePointSize * 0.003
                        ));

                    }
                }
                else if (tooManyOverlaps[j]) {
                    if (overlapsRect2(labelList[j].hostRect, LabelRects[i])) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        f.add(repelForce(
                            ci, DataPoints[j],
                            forcePush * forcePointSize * 0.003
                        ));
                    }
                }
                else {
                    cj.set(LabelRects[j].x + LabelRects[j].width / 2, LabelRects[j].y + LabelRects[j].height / 2);
                    // Repel the box from other data points.
                    if (overlapsRect2(labelList[j].hostRect, LabelRects[i])) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        f.add(repelForce(ci, DataPoints[j],
                            forcePush * forcePointSize * 0.003
                        ));
                    }
                    if (overlapsRect2(LabelRects[i], LabelRects[j])) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        f.add(repelForce(ci, cj, forcePush));
                    }
                    if (iter % 100 === 0 && overlapCount[i] === 2
                        && overlapsRect2(LabelRects[i], labelList[i].hostRect)
                        && overlapsRect2(LabelRects[i], labelList[j].hostRect)) {
                        const v = new Point();
                        const stuck = isStuck(ci, DataPoints[i], DataPoints[j], v);
                        if (stuck) {
                            v.scale(10);
                            if (Math.random() < 0.5) {
                                v.set(v.x, -v.y);
                                moveRect(LabelRects[i], Labels[i], v);
                            }
                            else {
                                v.set(-v.x, v.y);
                                moveRect(LabelRects[i], Labels[i], v);
                            }
                        }
                    }
                }
            }

            // Pull the box.
            if (!iOverlaps) {
                f.add(springForce(DataPoints[i], ci, forcePull * forcePointSize));
            }
            let friction2 = 1.0;
            if (overlapCount[i] > 10) {
                friction2 += 0.5;
            }
            else {
                friction2 += 0.05 * overlapCount[i];
            }
            velocities[i].scale(friction * friction2);
            velocities[i].add(f);
            moveRect(labelList[i].rect, Labels[i], velocities[i]);

            // Put boxes within bounds
            putWithinBounds(LabelRects[i], Labels[i], xBounds, yBounds);

            // check line intersect
            if (totalOverlaps === 0 || iter % 10 === 0) {
                for (let j = 0; j < labelList.length; j++) {
                    ci.set(labelList[i].rect.x + labelList[i].rect.width / 2,
                        labelList[i].rect.y + labelList[i].rect.height / 2);
                    cj.set(labelList[j].rect.x + labelList[j].rect.width / 2,
                        labelList[j].rect.y + labelList[j].rect.height / 2);
                    // switch label positions if lines overlap
                    if (i !== j && lineIntersect(ci, DataPoints[i], cj, DataPoints[j])) {
                        totalOverlaps += 1;
                        moveRect(LabelRects[i], Labels[i], springForce(cj, ci, 1));
                        moveRect(LabelRects[j], Labels[j], springForce(ci, cj, 1));
                    }
                }
            }
        }
    }

    // return to the original coordinates
    zoomIn();
}