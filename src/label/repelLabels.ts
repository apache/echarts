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

interface RepelLabelLayoutInput {
    label: ZRText
    rect: BoundingRect
}

export interface RepelLabelLayoutInfo{
    label: ZRText
    rect: BoundingRect
    hostRect: RectLike
}

function prepareRepelLabelLayoutInfo(input: RepelLabelLayoutInput[]): RepelLabelLayoutInfo[] {
    const list: RepelLabelLayoutInfo[] = [];
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
 * remove label overlaps by repelling
 */
export function shiftLayoutByRepelling(
    labelListInput: RepelLabelLayoutInput[],
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
    const labelList = prepareRepelLabelLayoutInfo(labelListInput);
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