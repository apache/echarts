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

// Poly path support NaN point

import Path, { PathProps } from 'zrender/src/graphic/Path';
import PathProxy from 'zrender/src/core/PathProxy';
import { cubicRootAt, cubicAt } from 'zrender/src/core/curve';
import tokens from '../../visual/tokens';
import { isPointIllegal } from './helper';
import { monotoneCubicSegments, CubicBezierSegment, LineSmoothMonotone } from './monotoneCubic';

const mathMin = Math.min;
const mathMax = Math.max;

/**
 * Knots visited by `drawSegment`, in walk order, plus the same `k` the
 * straight and Bézier paths return. Stacked areas use `k` to walk the
 * baseline back over the same indices.
 */
function collectSmoothKnots(
    points: ArrayLike<number>,
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    connectNulls: boolean,
    knots: number[]
): number {
    let prevX = 0;
    let prevY = 0;
    let started = false;
    let idx = start;
    let k = 0;
    for (; k < segLen; k++) {
        let x = points[idx * 2];
        let y = points[idx * 2 + 1];

        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointIllegal(x, y)) {
            if (connectNulls) {
                idx += dir;
                continue;
            }
            break;
        }

        if (!started) {
            knots.push(x, y);
            started = true;
        }
        else {
            const dx = x - prevX;
            const dy = y - prevY;
            // Ignore tiny segment.
            if ((dx * dx + dy * dy) < 0.5) {
                idx += dir;
                continue;
            }

            let nextIdx = idx + dir;
            let nextX = points[nextIdx * 2];
            let nextY = points[nextIdx * 2 + 1];
            // Ignore duplicate point
            while (nextX === x && nextY === y && k < segLen) {
                k++;
                nextIdx += dir;
                idx += dir;
                nextX = points[nextIdx * 2];
                nextY = points[nextIdx * 2 + 1];
                x = points[idx * 2];
                y = points[idx * 2 + 1];
            }
            knots.push(x, y);
        }

        prevX = x;
        prevY = y;
        idx += dir;
    }
    return k;
}

function drawMonotoneSegment(
    ctx: PathProxy,
    points: ArrayLike<number>,
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    smooth: number,
    axis: 'x' | 'y',
    connectNulls: boolean
): number {
    const knots: number[] = [];
    const k = collectSmoothKnots(points, start, segLen, allLen, dir, connectNulls, knots);
    emitMonotoneKnots(ctx, knots, dir, axis, smooth);
    return k;
}

function emitMonotoneKnots(
    ctx: PathProxy,
    knots: number[],
    dir: number,
    axis: 'x' | 'y',
    scale: number
) {
    const count = knots.length / 2;
    if (count === 0) {
        return;
    }
    const forward = dir < 0 ? reversePointPairs(knots) : knots;
    const segments = smoothRuns(forward, axis, scale);
    if (dir < 0) {
        ctx.lineTo(knots[0], knots[1]);
        for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i];
            ctx.bezierCurveTo(seg.cpx2, seg.cpy2, seg.cpx1, seg.cpy1, seg.x0, seg.y0);
        }
    }
    else {
        ctx.moveTo(forward[0], forward[1]);
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            ctx.bezierCurveTo(seg.cpx1, seg.cpy1, seg.cpx2, seg.cpy2, seg.x1, seg.y1);
        }
    }
}

/**
 * Strictly monotone runs use Fritsch–Butland cubics. A piece whose
 * independent coordinate stands still uses the constrained Bézier.
 */
function smoothRuns(
    points: number[],
    axis: 'x' | 'y',
    scale: number
): CubicBezierSegment[] {
    const n = points.length / 2;
    const segments: CubicBezierSegment[] = [];
    let i = 0;
    while (i < n - 1) {
        const delta = independentDelta(points, i, axis);
        if (delta === 0) {
            let j = i + 1;
            while (j < n - 1 && independentDelta(points, j, axis) === 0) {
                j++;
            }
            appendSegments(segments, legacySmoothSegments(slicePoints(points, i, j), scale));
            i = j;
        }
        else {
            const positive = delta > 0;
            let j = i + 1;
            while (j < n - 1 && sameStrictSign(independentDelta(points, j, axis), positive)) {
                j++;
            }
            appendSegments(
                segments,
                monotoneCubicSegments(slicePoints(points, i, j), axis, scale)
            );
            i = j;
        }
    }
    return segments;
}

function independentDelta(points: number[], index: number, axis: 'x' | 'y'): number {
    const offset = axis === 'x' ? 0 : 1;
    return points[(index + 1) * 2 + offset] - points[index * 2 + offset];
}

function sameStrictSign(delta: number, positive: boolean): boolean {
    return positive ? delta > 0 : delta < 0;
}

function slicePoints(points: number[], start: number, endInclusive: number): number[] {
    return points.slice(start * 2, (endInclusive + 1) * 2);
}

function appendSegments(out: CubicBezierSegment[], extra: CubicBezierSegment[]) {
    for (let i = 0; i < extra.length; i++) {
        out.push(extra[i]);
    }
}

function reversePointPairs(points: number[]): number[] {
    const out: number[] = [];
    for (let i = points.length - 2; i >= 0; i -= 2) {
        out.push(points[i], points[i + 1]);
    }
    return out;
}

/**
 * Constrained Bézier used when `smoothMonotone` is null or `'none'`.
 * Kept here so a non-monotone piece of a monotone series can reuse it
 * without changing the original `drawSegment` branch.
 */
function legacySmoothSegments(points: number[], smooth: number): CubicBezierSegment[] {
    const n = points.length / 2;
    const segments: CubicBezierSegment[] = [];
    let outX = points[0];
    let outY = points[1];
    for (let i = 1; i < n; i++) {
        const prevX = points[(i - 1) * 2];
        const prevY = points[(i - 1) * 2 + 1];
        const x = points[i * 2];
        const y = points[i * 2 + 1];
        let inX = x;
        let inY = y;
        let nextOutX = x;
        let nextOutY = y;
        if (i < n - 1) {
            const nextX = points[(i + 1) * 2];
            const nextY = points[(i + 1) * 2 + 1];
            const dx0 = x - prevX;
            const dy0 = y - prevY;
            const dx1 = nextX - x;
            const dy1 = nextY - y;
            const lenPrevSeg = Math.sqrt(dx0 * dx0 + dy0 * dy0);
            const lenNextSeg = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            if (lenPrevSeg !== 0 && lenNextSeg !== 0) {
                let vx = nextX - prevX;
                let vy = nextY - prevY;
                const ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);
                inX = x - vx * smooth * (1 - ratioNextSeg);
                inY = y - vy * smooth * (1 - ratioNextSeg);
                nextOutX = x + vx * smooth * ratioNextSeg;
                nextOutY = y + vy * smooth * ratioNextSeg;

                // Smooth constraint between point and next point.
                // Avoid exceeding extreme after smoothing.
                nextOutX = mathMin(nextOutX, mathMax(nextX, x));
                nextOutY = mathMin(nextOutY, mathMax(nextY, y));
                nextOutX = mathMax(nextOutX, mathMin(nextX, x));
                nextOutY = mathMax(nextOutY, mathMin(nextY, y));
                vx = nextOutX - x;
                vy = nextOutY - y;

                inX = x - vx * lenPrevSeg / lenNextSeg;
                inY = y - vy * lenPrevSeg / lenNextSeg;

                // Smooth constraint between point and prev point.
                // Avoid exceeding extreme after smoothing.
                inX = mathMin(inX, mathMax(prevX, x));
                inY = mathMin(inY, mathMax(prevY, y));
                inX = mathMax(inX, mathMin(prevX, x));
                inY = mathMax(inY, mathMin(prevY, y));

                // Adjust next cp0 again.
                vx = x - inX;
                vy = y - inY;
                nextOutX = x + vx * lenNextSeg / lenPrevSeg;
                nextOutY = y + vy * lenNextSeg / lenPrevSeg;
            }
        }
        segments.push({
            x0: prevX,
            y0: prevY,
            cpx1: outX,
            cpy1: outY,
            cpx2: inX,
            cpy2: inY,
            x1: x,
            y1: y
        });
        outX = nextOutX;
        outY = nextOutY;
    }
    return segments;
}

/**
 * Draw smoothed line in non-monotone, in may cause undesired curve in extreme
 * situations. This should be used when points are non-monotone neither in x or
 * y dimension.
 */
function drawSegment(
    ctx: PathProxy,
    points: ArrayLike<number>,
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    smooth: number,
    smoothMonotone: LineSmoothMonotone,
    connectNulls: boolean
) {
    if ((smoothMonotone === 'monotoneX' || smoothMonotone === 'monotoneY') && smooth > 0) {
        return drawMonotoneSegment(
            ctx, points, start, segLen, allLen, dir, smooth,
            smoothMonotone === 'monotoneX' ? 'x' : 'y',
            connectNulls
        );
    }
    let prevX: number;
    let prevY: number;
    let cpx0: number;
    let cpy0: number;
    let cpx1: number;
    let cpy1: number;
    let idx = start;
    let k = 0;
    for (; k < segLen; k++) {

        let x = points[idx * 2];
        let y = points[idx * 2 + 1];

        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointIllegal(x, y)) {
            if (connectNulls) {
                idx += dir;
                continue;
            }
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](x, y);
            cpx0 = x;
            cpy0 = y;
        }
        else {
            let dx = x - prevX;
            let dy = y - prevY;

            // Ignore tiny segment.
            if ((dx * dx + dy * dy) < 0.5) {
                idx += dir;
                continue;
            }

            if (smooth > 0) {
                let nextIdx = idx + dir;
                let nextX = points[nextIdx * 2];
                let nextY = points[nextIdx * 2 + 1];
                // Ignore duplicate point
                while (nextX === x && nextY === y && k < segLen) {
                    k++;
                    nextIdx += dir;
                    idx += dir;
                    nextX = points[nextIdx * 2];
                    nextY = points[nextIdx * 2 + 1];
                    x = points[idx * 2];
                    y = points[idx * 2 + 1];
                    dx = x - prevX;
                    dy = y - prevY;
                }

                let tmpK = k + 1;
                if (connectNulls) {
                    // Find next point not null
                    while (isPointIllegal(nextX, nextY) && tmpK < segLen) {
                        tmpK++;
                        nextIdx += dir;
                        nextX = points[nextIdx * 2];
                        nextY = points[nextIdx * 2 + 1];
                    }
                }

                let ratioNextSeg = 0.5;
                let vx: number = 0;
                let vy: number = 0;
                let nextCpx0;
                let nextCpy0;
                // Is last point
                if (tmpK >= segLen || isPointIllegal(nextX, nextY)) {
                    cpx1 = x;
                    cpy1 = y;
                }
                else {
                    vx = nextX - prevX;
                    vy = nextY - prevY;

                    const dx0 = x - prevX;
                    const dx1 = nextX - x;
                    const dy0 = y - prevY;
                    const dy1 = nextY - y;
                    let lenPrevSeg;
                    let lenNextSeg;
                    if (smoothMonotone === 'x') {
                        lenPrevSeg = Math.abs(dx0);
                        lenNextSeg = Math.abs(dx1);
                        const dir = vx > 0 ? 1 : -1;
                        cpx1 = x - dir * lenPrevSeg * smooth;
                        cpy1 = y;
                        nextCpx0 = x + dir * lenNextSeg * smooth;
                        nextCpy0 = y;
                    }
                    else if (smoothMonotone === 'y') {
                        lenPrevSeg = Math.abs(dy0);
                        lenNextSeg = Math.abs(dy1);
                        const dir = vy > 0 ? 1 : -1;
                        cpx1 = x;
                        cpy1 = y - dir * lenPrevSeg * smooth;
                        nextCpx0 = x;
                        nextCpy0 = y + dir * lenNextSeg * smooth;
                    }
                    else {
                        lenPrevSeg = Math.sqrt(dx0 * dx0 + dy0 * dy0);
                        lenNextSeg = Math.sqrt(dx1 * dx1 + dy1 * dy1);

                        // Use ratio of seg length
                        ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                        cpx1 = x - vx * smooth * (1 - ratioNextSeg);
                        cpy1 = y - vy * smooth * (1 - ratioNextSeg);

                        // cp0 of next segment
                        nextCpx0 = x + vx * smooth * ratioNextSeg;
                        nextCpy0 = y + vy * smooth * ratioNextSeg;

                        // Smooth constraint between point and next point.
                        // Avoid exceeding extreme after smoothing.
                        nextCpx0 = mathMin(nextCpx0, mathMax(nextX, x));
                        nextCpy0 = mathMin(nextCpy0, mathMax(nextY, y));
                        nextCpx0 = mathMax(nextCpx0, mathMin(nextX, x));
                        nextCpy0 = mathMax(nextCpy0, mathMin(nextY, y));
                        // Reclaculate cp1 based on the adjusted cp0 of next seg.
                        vx = nextCpx0 - x;
                        vy = nextCpy0 - y;

                        cpx1 = x - vx * lenPrevSeg / lenNextSeg;
                        cpy1 = y - vy * lenPrevSeg / lenNextSeg;

                        // Smooth constraint between point and prev point.
                        // Avoid exceeding extreme after smoothing.
                        cpx1 = mathMin(cpx1, mathMax(prevX, x));
                        cpy1 = mathMin(cpy1, mathMax(prevY, y));
                        cpx1 = mathMax(cpx1, mathMin(prevX, x));
                        cpy1 = mathMax(cpy1, mathMin(prevY, y));

                        // Adjust next cp0 again.
                        vx = x - cpx1;
                        vy = y - cpy1;
                        nextCpx0 = x + vx * lenNextSeg / lenPrevSeg;
                        nextCpy0 = y + vy * lenNextSeg / lenPrevSeg;
                    }
                }

                ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, x, y);

                cpx0 = nextCpx0;
                cpy0 = nextCpy0;
            }
            else {
                ctx.lineTo(x, y);
            }
        }

        prevX = x;
        prevY = y;
        idx += dir;
    }

    return k;
}

class ECPolylineShape {
    points: ArrayLike<number>;
    smooth = 0;
    smoothConstraint = true;
    smoothMonotone: LineSmoothMonotone;
    connectNulls: boolean;
}

interface ECPolylineProps extends PathProps {
    shape?: Partial<ECPolylineShape>
}

export class ECPolyline extends Path<ECPolylineProps> {

    readonly type = 'ec-polyline';

    shape: ECPolylineShape;

    constructor(opts?: ECPolylineProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: tokens.color.neutral99,
            fill: null as string
        };
    }

    getDefaultShape() {
        return new ECPolylineShape();
    }

    buildPath(ctx: PathProxy, shape: ECPolylineShape) {
        const points = shape.points;

        let i = 0;
        let len = points.length / 2;

        // const result = getBoundingBox(points, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointIllegal(points[len * 2 - 2], points[len * 2 - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointIllegal(points[i * 2], points[i * 2 + 1])) {
                    break;
                }
            }
        }
        while (i < len) {
            i += drawSegment(
                ctx, points, i, len, len,
                1,
                shape.smooth,
                shape.smoothMonotone, shape.connectNulls
            ) + 1;
        }
    }

    getPointOn(xOrY: number, dim: 'x' | 'y'): number[] {
        if (!this.path) {
            this.createPathProxy();
            this.buildPath(this.path, this.shape);
        }
        const path = this.path;
        const data = path.data;
        const CMD = PathProxy.CMD;

        let x0;
        let y0;

        const isDimX = dim === 'x';
        const roots: number[] = [];

        for (let i = 0; i < data.length;) {
            const cmd = data[i++];
            let x;
            let y;
            let x2;
            let y2;
            let x3;
            let y3;
            let t;
            switch (cmd) {
                case CMD.M:
                    x0 = data[i++];
                    y0 = data[i++];
                    break;
                case CMD.L:
                    x = data[i++];
                    y = data[i++];
                    t = isDimX ? (xOrY - x0) / (x - x0)
                        : (xOrY - y0) / (y - y0);
                    if (t <= 1 && t >= 0) {
                        const val = isDimX ? (y - y0) * t + y0
                            : (x - x0) * t + x0;
                        return isDimX ? [xOrY, val] : [val, xOrY];
                    }
                    x0 = x;
                    y0 = y;
                    break;
                case CMD.C:
                    x = data[i++];
                    y = data[i++];
                    x2 = data[i++];
                    y2 = data[i++];
                    x3 = data[i++];
                    y3 = data[i++];

                    const nRoot = isDimX ? cubicRootAt(x0, x, x2, x3, xOrY, roots)
                        : cubicRootAt(y0, y, y2, y3, xOrY, roots);
                    if (nRoot > 0) {
                        for (let i = 0; i < nRoot; i++) {
                            const t = roots[i];
                            if (t <= 1 && t >= 0) {
                                const val = isDimX ? cubicAt(y0, y, y2, y3, t)
                                    : cubicAt(x0, x, x2, x3, t);
                                return isDimX ? [xOrY, val] : [val, xOrY];
                            }
                        }
                    }

                    x0 = x3;
                    y0 = y3;
                    break;
            }
        }
    }
}
class ECPolygonShape extends ECPolylineShape {
    // Offset between stacked base points and points
    stackedOnPoints: ArrayLike<number>;
    stackedOnSmooth: number;
}

interface ECPolygonProps extends PathProps {
    shape?: Partial<ECPolygonShape>
}
export class ECPolygon extends Path {

    readonly type = 'ec-polygon';

    shape: ECPolygonShape;

    constructor(opts?: ECPolygonProps) {
        super(opts);
    }

    getDefaultShape() {
        return new ECPolygonShape();
    }

    buildPath(ctx: PathProxy, shape: ECPolygonShape) {
        const points = shape.points;
        const stackedOnPoints = shape.stackedOnPoints;

        let i = 0;
        let len = points.length / 2;
        const smoothMonotone = shape.smoothMonotone;

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointIllegal(points[len * 2 - 2], points[len * 2 - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointIllegal(points[i * 2], points[i * 2 + 1])) {
                    break;
                }
            }
        }
        while (i < len) {
            const k = drawSegment(
                ctx, points, i, len, len,
                1,
                shape.smooth,
                smoothMonotone, shape.connectNulls
            );
            drawSegment(
                ctx, stackedOnPoints, i + k - 1, k, len,
                -1,
                shape.stackedOnSmooth,
                smoothMonotone, shape.connectNulls
            );
            i += k + 1;

            ctx.closePath();
        }
    }
}