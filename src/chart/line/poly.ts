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

const mathMin = Math.min;
const mathMax = Math.max;

function isPointNull(x: number, y: number) {
    return isNaN(x) || isNaN(y);
}
/**
 * Draw smoothed line in non-monotone, in may cause undesired curve in extreme
 * situations. This should be used when points are non-monotone neither in x or
 * y dimension.
 */
function drawSegment(
    ctx: CanvasRenderingContext2D,
    points: ArrayLike<number>,
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
    let px: number;
    let py: number;
    let cpx0: number;
    let cpy0: number;
    let cpx1: number;
    let cpy1: number;
    let idx = start;
    let k = 0;
    for (; k < segLen; k++) {

        const x = points[idx * 2];
        const y = points[idx * 2 + 1];

        if (idx >= allLen || idx < 0) {
            break;
        }
        if (isPointNull(x, y)) {
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
            const dx = x - px;
            const dy = y - py;

            // Ignore tiny segment.
            if ((dx * dx + dy * dy) < 1) {
                idx += dir;
                continue;
            }

            if (smooth > 0) {
                let nextIdx = idx + dir;
                let nextX = points[nextIdx * 2];
                let nextY = points[nextIdx * 2 + 1];
                let tmpK = k + 1;
                if (connectNulls) {
                    // Find next point not null
                    while (isPointNull(nextX, nextY) && tmpK < segLen) {
                        tmpK++;
                        nextIdx += dir;
                        nextX = points[nextIdx * 2];
                        nextY = points[nextIdx * 2 + 1];
                    }
                }

                let ratioNextSeg = 0.5;
                let vx: number = 0;
                let vy: number = 0;
                // Is last point
                if (tmpK >= segLen || isPointNull(nextX, nextY)) {
                    cpx1 = x;
                    cpy1 = y;
                }
                else {
                    vx = nextX - px;
                    vy = nextY - py;

                    const dx0 = x - px;
                    const dx1 = nextX - x;
                    const dy0 = y - py;
                    const dy1 = nextY - y;
                    let lenPrevSeg;
                    let lenNextSeg;
                    if (smoothMonotone === 'x') {
                        lenPrevSeg = Math.abs(dx0);
                        lenNextSeg = Math.abs(dx1);
                    }
                    else if (smoothMonotone === 'y') {
                        lenPrevSeg = Math.abs(dy0);
                        lenNextSeg = Math.abs(dy1);
                    }
                    else {
                        lenPrevSeg = Math.sqrt(dx0 * dx0 + dy0 * dy0);
                        lenNextSeg = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                    }

                    // Use ratio of seg length
                    ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);

                    cpx1 = x - vx * smooth * (1 - ratioNextSeg);
                    cpy1 = y - vy * smooth * (1 - ratioNextSeg);
                }
                // Smooth constraint
                cpx0 = mathMin(cpx0, smoothMax[0]);
                cpy0 = mathMin(cpy0, smoothMax[1]);
                cpx0 = mathMax(cpx0, smoothMin[0]);
                cpy0 = mathMax(cpy0, smoothMin[1]);

                cpx1 = mathMin(cpx1, smoothMax[0]);
                cpy1 = mathMin(cpy1, smoothMax[1]);
                cpx1 = mathMax(cpx1, smoothMin[0]);
                cpy1 = mathMax(cpy1, smoothMin[1]);

                ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, x, y);

                // cp0 of next segment
                cpx0 = x + vx * smooth * ratioNextSeg;
                cpy0 = y + vy * smooth * ratioNextSeg;
            }
            else {
                ctx.lineTo(x, y);
            }
        }

        px = x;
        py = y;
        idx += dir;
    }

    return k;
}

function getBoundingBox(points: ArrayLike<number>, smoothConstraint?: boolean) {
    const ptMin = [Infinity, Infinity];
    const ptMax = [-Infinity, -Infinity];
    if (smoothConstraint) {
        for (let i = 0; i < points.length;) {
            const x = points[i++];
            const y = points[i++];
            if (x < ptMin[0]) {
                ptMin[0] = x;
            }
            if (y < ptMin[1]) {
                ptMin[1] = y;
            }
            if (x > ptMax[0]) {
                ptMax[0] = x;
            }
            if (y > ptMax[1]) {
                ptMax[1] = y;
            }
        }
    }
    return {
        min: smoothConstraint ? ptMin : ptMax,
        max: smoothConstraint ? ptMax : ptMin
    };
}

class ECPolylineShape {
    points: ArrayLike<number>;
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

    constructor(opts?: ECPolylineProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as string
        };
    }

    getDefaultShape() {
        return new ECPolylineShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: ECPolylineShape) {
        const points = shape.points;

        let i = 0;
        let len = points.length / 2;

        const result = getBoundingBox(points, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len * 2 - 2], points[len * 2 - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i * 2], points[i * 2 + 1])) {
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

    buildPath(ctx: CanvasRenderingContext2D, shape: ECPolygonShape) {
        const points = shape.points;
        const stackedOnPoints = shape.stackedOnPoints;

        let i = 0;
        let len = points.length / 2;
        const smoothMonotone = shape.smoothMonotone;
        const bbox = getBoundingBox(points, shape.smoothConstraint);
        const stackedOnBBox = getBoundingBox(stackedOnPoints, shape.smoothConstraint);

        if (shape.connectNulls) {
            // Must remove first and last null values avoid draw error in polygon
            for (; len > 0; len--) {
                if (!isPointNull(points[len * 2 - 2], points[len * 2 - 1])) {
                    break;
                }
            }
            for (; i < len; i++) {
                if (!isPointNull(points[i * 2], points[i * 2 + 1])) {
                    break;
                }
            }
        }
        while (i < len) {
            const k = drawSegment(
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