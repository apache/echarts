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
import { BoundingRect, Point } from '../util/graphic';
import { RectLike } from 'zrender/src/core/BoundingRect';

interface labelLayoutInput {
    label: ZRText
    rect: BoundingRect
}

export interface labelLayoutInfo {
    label: ZRText
    rect: BoundingRect
    hostRect: RectLike
}

function prepareLabelLayoutInfo(input: labelLayoutInput[]): labelLayoutInfo[] {
    const list: labelLayoutInfo[] = [];
    for (let i = 0; i < input.length; i++) {
        const rawItem = input[i];
        const label = rawItem.label;
        const rect = rawItem.rect;
        const host = label.__hostTarget;
        let hostRect;
        if (host) {
            hostRect = host.getBoundingRect().plain();
            const transform = host.getComputedTransform();
            BoundingRect.applyTransform(hostRect, hostRect, transform);
        }
        list.push({
            label,
            rect,
            hostRect
        });
    }
    return list;
}

/**
 * remove label overlaps by Force
 */
export function shiftLayoutByForce(
    labelListInput: labelLayoutInput[],
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
    const labelList = prepareLabelLayoutInfo(labelListInput);
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
            const distanceX = hostCenter[0] - rectCenter[0];
            const distanceY = hostCenter[1] - rectCenter[1];
            item.rect.x += distanceX;
            item.rect.y += distanceY;
            item.label.x += distanceX;
            item.label.y += distanceY;
        }
    }

    // add force
    function getRepelForce(
        out: Point, p1: Point, p2: Point, forceFactor = 0.0001
    ) {
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        const d2 = Math.max(dx * dx + dy * dy, 0.0004);
        Point.sub(out, p1, p2);
        out.scale(1 / Math.sqrt(d2));
        out.scale(forceFactor / d2);
    }

    function moveRect(rect: RectLike, label: ZRText, move: Point) {
        rect.x += move.x;
        rect.y += move.y;
        label.x += move.x;
        label.y += move.y;
    }

    function getPullForce(out: Point, p1: Point, p2: Point, forceFactor = 0.000001) {
        Point.sub(out, p1, p2);
        out.scale(forceFactor);
    }

    function lineIntersect(p1: Point, q1: Point, p2: Point, q2: Point) {
        // returns true if two lines intersect, else false
        const denom = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
        const numerA = (q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x);
        const numerB = (q1.x - p1.x) * (p1.y - p2.y) - (q1.y - p1.y) * (p1.x - p2.x);

        /* Is the intersection along the the segments */
        const mua = numerA / denom;
        const mub = numerB / denom;
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
        const v1 = tempVector[0];
        const v2 = tempVector[1];
        v1.set(p1.x - host1.x, p1.y - host1.y);
        v2.set(host2.x - p1.x, host2.y - p1.y);
        // whether label is stuck by two data points
        if (Math.abs(v1.x * v2.y - v2.x * v1.y - v2.x * v2.y) < 1e-5) {
            out = p1.clone();
            return true;
        }
        return false;
    }

    xBounds.scale(xScale);
    yBounds.scale(yScale);
    const maxOverlaps = 10;
    const DataPoints: Point[] = []; // the center of the label's host element
    const LabelRects: BoundingRect[] = []; // the rectList of labels
    const Labels: ZRText[] = []; // the label element
    const velocities: Point[] = []; // velocities generated by force
    const iForce = new Point(); // force for label i
    const tempForce = new Point(); // temporary force;
    const ci = new Point(); // the center of LabelRects[i]
    const cj = new Point(); // the center of LabelRects[j]
    const overlapCount = []; // number of overlaps per label
    const tooManyOverlaps = []; // if element overlap too much with other elements
    const repelForceFactor = 0.3; //the factor of repel force
    const pullForceFactor = 100; //the factor of pull force
    let iter = 0;
    let totalOverlaps = 1; // number of overlaps
    let iOverlaps = false; // if LabelRects[i] has overlaps

    const tempVector: Point[] = [new Point(), new Point()]; // temporary vector
    const tempPos: Point = new Point();

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
            iForce.set(0, 0);
            const labelRect = labelList[i].rect;
            if (iter === 2 && overlapCount[i] > maxOverlaps) {
                tooManyOverlaps[i] = true;
            }
            if (tooManyOverlaps[i]) {
                continue;
            }
            overlapCount[i] = 0;
            iOverlaps = false;
            ci.set(LabelRects[i].x + LabelRects[i].width / 2, LabelRects[i].y + LabelRects[i].height / 2);
            for (let j = 0; j < labelList.length; j++) {
                if (i === j) {
                    if (LabelRects[i].intersect(labelList[i].hostRect)) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        getRepelForce(tempForce, ci, DataPoints[i],
                            forcePush * repelForceFactor
                        );
                        iForce.add(tempForce);
                    }
                }
                else if (tooManyOverlaps[j]) {
                    if (LabelRects[i].intersect(labelList[j].hostRect)) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        getRepelForce(tempForce, ci, DataPoints[j],
                            forcePush * repelForceFactor
                        );
                        iForce.add(tempForce);
                    }
                }
                else {
                    cj.set(LabelRects[j].x + LabelRects[j].width / 2, LabelRects[j].y + LabelRects[j].height / 2);
                    // Repel the box from other data points.
                    if (LabelRects[i].intersect(labelList[j].hostRect)) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        getRepelForce(tempForce, ci, DataPoints[j],
                            forcePush * repelForceFactor
                        );
                        iForce.add(tempForce);
                    }
                    if (LabelRects[i].intersect(LabelRects[j])) {
                        totalOverlaps += 1;
                        iOverlaps = true;
                        overlapCount[i] += 1;
                        getRepelForce(tempForce, ci, cj, forcePush);
                        iForce.add(tempForce);
                    }
                    if (iter % 100 === 0 && overlapCount[i] === 2
                        && LabelRects[i].intersect(labelList[i].hostRect)
                        && LabelRects[i].intersect(labelList[j].hostRect)) {
                        const stuck = isStuck(ci, DataPoints[i], DataPoints[j], tempPos);
                        if (stuck) {
                            tempPos.scale(10);
                            if (Math.random() < 0.5) {
                                tempPos.set(tempPos.x, -tempPos.y);
                                moveRect(LabelRects[i], Labels[i], tempPos);
                            }
                            else {
                                tempPos.set(-tempPos.x, tempPos.y);
                                moveRect(LabelRects[i], Labels[i], tempPos);
                            }
                        }
                    }
                }
            }

            // Pull the box.
            if (!iOverlaps) {
                getPullForce(tempForce, DataPoints[i], ci, forcePull * pullForceFactor);
                iForce.add(tempForce);
            }
            let friction2 = 1.0;
            if (overlapCount[i] > 10) {
                friction2 += 0.5;
            }
            else {
                friction2 += 0.05 * overlapCount[i];
            }
            velocities[i].scale(friction * friction2);
            velocities[i].add(iForce);
            moveRect(labelRect, Labels[i], velocities[i]);

            // Put boxes within bounds
            putWithinBounds(LabelRects[i], Labels[i], xBounds, yBounds);

            // check line intersect
            if (totalOverlaps === 0 || iter % 10 === 0) {
                for (let j = 0; j < labelList.length; j++) {
                    const otherLabelRect = labelList[j].rect;
                    ci.set(labelRect.x + labelRect.width / 2,
                        labelRect.y + labelRect.height / 2);
                    cj.set(otherLabelRect.x + otherLabelRect.width / 2,
                        otherLabelRect.y + otherLabelRect.height / 2);
                    // switch label positions if lines overlap
                    if (i !== j && lineIntersect(ci, DataPoints[i], cj, DataPoints[j])) {
                        totalOverlaps += 1;
                        getPullForce(tempForce, cj, ci, 1);
                        moveRect(LabelRects[i], Labels[i], tempForce);
                        getPullForce(tempForce, ci, cj, 1);
                        moveRect(LabelRects[j], Labels[j], tempForce);
                    }
                }
            }
        }
    }

    // return to the original coordinates
    zoomIn();
}