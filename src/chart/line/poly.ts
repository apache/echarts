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
import * as vec2 from 'zrender/src/core/vector';
import fixClipWithShadow from 'zrender/src/graphic/helper/fixClipWithShadow';

const vec2Min = vec2.min;
const vec2Max = vec2.max;

const scaleAndAdd = vec2.scaleAndAdd;
const v2Copy = vec2.copy;

// Temporary variable
const v: number[] = [];
const cp0: number[] = [];
const cp1: number[] = [];

function isPointNull(p: number[]) {
    return isNaN(p[0]) || isNaN(p[1]);
}

function drawSegment(
    ctx: CanvasRenderingContext2D,
    points: number[][],
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    smoothMin: number[],
    smoothMax: number[],
    smooth: number,
    smoothMonotone: 'x' | 'y' | 'none',
    connectNulls: boolean
) {
    return ((smoothMonotone === 'none' || !smoothMonotone) ? drawNonMono : drawMono)(
        ctx,
        points,
        start,
        segLen,
        allLen,
        dir,
        smoothMin,
        smoothMax,
        smooth,
        smoothMonotone,
        connectNulls
    );
}

/**
 * Check if points is in monotone.
 *
 * @param {number[][]} points         Array of points which is in [x, y] form
 * @param {string}     smoothMonotone 'x', 'y', or 'none', stating for which
 *                                    dimension that is checking.
 *                                    If is 'none', `drawNonMono` should be
 *                                    called.
 *                                    If is undefined, either being monotone
 *                                    in 'x' or 'y' will call `drawMono`.
 */
// function isMono(points, smoothMonotone) {
//     if (points.length <= 1) {
//         return true;
//     }

//     let dim = smoothMonotone === 'x' ? 0 : 1;
//     let last = points[0][dim];
//     let lastDiff = 0;
//     for (let i = 1; i < points.length; ++i) {
//         let diff = points[i][dim] - last;
//         if (!isNaN(diff) && !isNaN(lastDiff)
//             && diff !== 0 && lastDiff !== 0
//             && ((diff >= 0) !== (lastDiff >= 0))
//         ) {
//             return false;
//         }
//         if (!isNaN(diff) && diff !== 0) {
//             lastDiff = diff;
//             last = points[i][dim];
//         }
//     }
//     return true;
// }

/**
 * Draw smoothed line in monotone, in which only vertical or horizontal bezier
 * control points will be used. This should be used when points are monotone
 * either in x or y dimension.
 */
function drawMono(
    ctx: CanvasRenderingContext2D,
    points: number[][],
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    smoothMin: number[],
    smoothMax: number[],
    smooth: number,
    smoothMonotone: 'x' | 'y' | 'none',
    connectNulls: boolean
) {
    let prevIdx = 0;
    let idx = start;
    let k = 0;
    for (; k < segLen; k++) {
        let p = points[idx];
        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointNull(p)) {
            if (connectNulls) {
                idx += dir;
                continue;
            }
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
        }
        else {
            if (smooth > 0) {
                let prevP = points[prevIdx];
                let dim = smoothMonotone === 'y' ? 1 : 0;

                // Length of control point to p, either in x or y, but not both
                let ctrlLen = (p[dim] - prevP[dim]) * smooth;

                v2Copy(cp0, prevP);
                cp0[dim] = prevP[dim] + ctrlLen;

                v2Copy(cp1, p);
                cp1[dim] = p[dim] - ctrlLen;

                ctx.bezierCurveTo(
                    cp0[0], cp0[1],
                    cp1[0], cp1[1],
                    p[0], p[1]
                );
            }
            else {
                ctx.lineTo(p[0], p[1]);
            }
        }

        prevIdx = idx;
        idx += dir;
    }

    return k;
}

/**
 * Draw smoothed line in non-monotone, in may cause undesired curve in extreme
 * situations. This should be used when points are non-monotone neither in x or
 * y dimension.
 */
function drawNonMono(
    ctx: CanvasRenderingContext2D,
    points: number[][],
    start: number,
    segLen: number,
    allLen: number,
    dir: number,
    smoothMin: number[],
    smoothMax: number[],
    smooth: number,
    smoothMonotone: 'x' | 'y' | 'none',
    connectNulls: boolean
) {
    let prevIdx = 0;
    let idx = start;
    let k = 0;
    for (; k < segLen; k++) {
        let p = points[idx];
        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointNull(p)) {
            if (connectNulls) {
                idx += dir;
                continue;
            }
            break;
        }

        if (idx === start) {
            ctx[dir > 0 ? 'moveTo' : 'lineTo'](p[0], p[1]);
            v2Copy(cp0, p);
        }
        else {
            if (smooth > 0) {
                let nextIdx = idx + dir;
                let nextP = points[nextIdx];
                if (connectNulls) {
                    // Find next point not null
                    while (nextP && isPointNull(points[nextIdx])) {
                        nextIdx += dir;
                        nextP = points[nextIdx];
                    }
                }

                let ratioNextSeg = 0.5;
                let prevP = points[prevIdx];
                nextP = points[nextIdx];
                // Last point
                if (!nextP || isPointNull(nextP)) {
                    v2Copy(cp1, p);
                }
                else {
                    // If next data is null in not connect case
                    if (isPointNull(nextP) && !connectNulls) {
                        nextP = p;
                    }

                    vec2.sub(v, nextP, prevP);

                    let lenPrevSeg;
                    let lenNextSeg;
                    if (smoothMonotone === 'x' || smoothMonotone === 'y') {
                        let dim = smoothMonotone === 'x' ? 0 : 1;
                        lenPrevSeg = Math.abs(p[dim] - prevP[dim]);
                        lenNextSeg = Math.abs(p[dim] - nextP[dim]);
                    }
                    else {
                        lenPrevSeg = vec2.dist(p, prevP);
                        lenNextSeg = vec2.dist(p, nextP);
                    }

                    // Use ratio of seg length
                    ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                    scaleAndAdd(cp1, p, v, -smooth * (1 - ratioNextSeg));
                }
                // Smooth constraint
                vec2Min(cp0, cp0, smoothMax);
                vec2Max(cp0, cp0, smoothMin);
                vec2Min(cp1, cp1, smoothMax);
                vec2Max(cp1, cp1, smoothMin);

                ctx.bezierCurveTo(
                    cp0[0], cp0[1],
                    cp1[0], cp1[1],
                    p[0], p[1]
                );
                // cp0 of next segment
                scaleAndAdd(cp0, p, v, smooth * ratioNextSeg);
            }
            else {
                ctx.lineTo(p[0], p[1]);
            }
        }

        prevIdx = idx;
        idx += dir;
    }

    return k;
}

function getBoundingBox(points: number[][], smoothConstraint?: boolean) {
    let ptMin = [Infinity, Infinity];
    let ptMax = [-Infinity, -Infinity];
    if (smoothConstraint) {
        for (let i = 0; i < points.length; i++) {
            let pt = points[i];
            if (pt[0] < ptMin[0]) {
                ptMin[0] = pt[0];
            }
            if (pt[1] < ptMin[1]) {
                ptMin[1] = pt[1];
            }
            if (pt[0] > ptMax[0]) {
                ptMax[0] = pt[0];
            }
            if (pt[1] > ptMax[1]) {
                ptMax[1] = pt[1];
            }
        }
    }
    return {
        min: smoothConstraint ? ptMin : ptMax,
        max: smoothConstraint ? ptMax : ptMin
    };
}

class ECPolylineShape {
    points: number[][];
    smooth = 0;
    smoothConstraint = true;
    smoothMonotone: 'x' | 'y' | 'none';
    connectNulls = false;
}

interface ECPolylineProps extends PathProps {
    shape?: Partial<ECPolylineShape>
}

export class ECPolyline extends Path<ECPolylineProps> {

    readonly type = 'ec-polyline';

    shape: ECPolylineShape;

    brush = fixClipWithShadow(Path.prototype.brush);

    constructor(opts?: ECPolylineProps) {
        super(opts, {
            stroke: '#000',
            fill: null
        }, new ECPolylineShape());
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: ECPolylineShape) {
        let points = shape.points;

        let i = 0;
        let len = points.length;

        let result = getBoundingBox(points, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i])) {
                    break;
                }
            }
        }
        while (i < len) {
            i += drawSegment(
                ctx, points, i, len, len,
                1, result.min, result.max, shape.smooth,
                shape.smoothMonotone, shape.connectNulls
            ) + 1;
        }
    }
}
class ECPolygonShape extends ECPolylineShape {
    // Offset between stacked base points and points
    stackedOnPoints: number[][];
    stackedOnSmooth: number;
}

interface ECPolygonProps extends PathProps {
    shape?: Partial<ECPolygonShape>
}
export class ECPolygon extends Path {

    readonly type = 'ec-polygon';

    shape: ECPolygonShape;

    // @ts-ignore
    brush = fixClipWithShadow(Path.prototype.brush);

    constructor(opts?: ECPolygonProps) {
        super(opts, null, new ECPolygonShape());
    }
    buildPath(ctx: CanvasRenderingContext2D, shape: ECPolygonShape) {
        let points = shape.points;
        let stackedOnPoints = shape.stackedOnPoints;

        let i = 0;
        let len = points.length;
        let smoothMonotone = shape.smoothMonotone;
        let bbox = getBoundingBox(points, shape.smoothConstraint);
        let stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i])) {
                    break;
                }
            }
        }
        while (i < len) {
            let k = drawSegment(
                ctx, points, i, len, len,
                1, bbox.min, bbox.max, shape.smooth,
                smoothMonotone, shape.connectNulls
            );
            drawSegment(
                ctx, stackedOnPoints, i + k - 1, k, len,
                -1, stackedOnBBox.min, stackedOnBBox.max, shape.stackedOnSmooth,
                smoothMonotone, shape.connectNulls
            );
            i += k + 1;

            ctx.closePath();
        }
    }
}