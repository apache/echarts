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

/**
 * Monotone piecewise cubic Hermite interpolation.
 *
 * Interior slopes are the Fritsch–Butland weighted harmonic mean
 * (SIAM J. Sci. Stat. Comput. 5(2), 1984, doi:10.1137/0905021).
 * Those slopes lie in the monotone region of Fritsch and Carlson
 * (SIAM J. Numer. Anal. 17(2), 1980, doi:10.1137/0717021).
 * Endpoint slopes use the one-sided three-point estimate, then the
 * endpoint clamp into that region (Moler, Numerical Computing with MATLAB, 2004).
 *
 * `independent` must be strictly monotone. A decreasing run is reversed,
 * solved, and written back, so the returned slopes are dy/dx (or dx/dy)
 * in the caller's point order.
 */

export type LineSmoothMonotone = 'x' | 'y' | 'none' | 'monotoneX' | 'monotoneY';

export interface CubicBezierSegment {
    x0: number
    y0: number
    cpx1: number
    cpy1: number
    cpx2: number
    cpy2: number
    x1: number
    y1: number
}

/**
 * Scale applied to monotone tangents.
 * `true` is full strength. A positive number is clamped to (0, 1].
 */
export function monotoneTangentScale(smooth: number | boolean): number {
    if (smooth === true) {
        return 1;
    }
    if (typeof smooth !== 'number') {
        return 0;
    }
    return clampTangentScale(smooth);
}

/**
 * Slopes of `dependent` with respect to `independent`.
 */
export function monotoneTangents(
    independent: ArrayLike<number>,
    dependent: ArrayLike<number>,
    scale: number
): number[] {
    const n = independent.length;
    const slopes: number[] = [];
    if (n <= 0) {
        return slopes;
    }
    if (n === 1) {
        slopes.push(0);
        return slopes;
    }

    const increasing = independent[n - 1] >= independent[0];
    const indep: number[] = [];
    const dep: number[] = [];
    for (let i = 0; i < n; i++) {
        const src = increasing ? i : n - 1 - i;
        indep.push(independent[src]);
        dep.push(dependent[src]);
    }

    const h: number[] = [];
    const delta: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        const hi = indep[i + 1] - indep[i];
        h.push(hi);
        delta.push((dep[i + 1] - dep[i]) / hi);
    }

    const raw: number[] = [];
    if (n === 2) {
        raw.push(delta[0], delta[0]);
    }
    else {
        raw.push(endpointSlope(h[0], h[1], delta[0], delta[1]));
        for (let i = 1; i < n - 1; i++) {
            raw.push(interiorSlope(h[i - 1], h[i], delta[i - 1], delta[i]));
        }
        raw.push(endpointSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]));
    }

    const tangentScale = clampTangentScale(scale);
    for (let i = 0; i < n; i++) {
        const src = increasing ? i : n - 1 - i;
        slopes.push(raw[src] * tangentScale);
    }
    return slopes;
}

/**
 * Cubic Bézier segments through a strictly monotone run.
 * `axis` selects the independent coordinate. `scale` multiplies tangents.
 */
export function monotoneCubicSegments(
    points: ArrayLike<number>,
    axis: 'x' | 'y',
    scale: number
): CubicBezierSegment[] {
    const n = points.length / 2;
    const independent: number[] = [];
    const dependent: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
        const x = points[i * 2];
        const y = points[i * 2 + 1];
        xs.push(x);
        ys.push(y);
        if (axis === 'x') {
            independent.push(x);
            dependent.push(y);
        }
        else {
            independent.push(y);
            dependent.push(x);
        }
    }

    const slopes = monotoneTangents(independent, dependent, scale);
    const segments: CubicBezierSegment[] = [];
    for (let i = 0; i < n - 1; i++) {
        const x0 = xs[i];
        const y0 = ys[i];
        const x1 = xs[i + 1];
        const y1 = ys[i + 1];
        const m0 = slopes[i];
        const m1 = slopes[i + 1];
        if (axis === 'x') {
            const dx = x1 - x0;
            segments.push({
                x0: x0,
                y0: y0,
                cpx1: x0 + dx / 3,
                cpy1: y0 + m0 * dx / 3,
                cpx2: x1 - dx / 3,
                cpy2: y1 - m1 * dx / 3,
                x1: x1,
                y1: y1
            });
        }
        else {
            const dy = y1 - y0;
            segments.push({
                x0: x0,
                y0: y0,
                cpx1: x0 + m0 * dy / 3,
                cpy1: y0 + dy / 3,
                cpx2: x1 - m1 * dy / 3,
                cpy2: y1 - dy / 3,
                x1: x1,
                y1: y1
            });
        }
    }
    return segments;
}

function clampTangentScale(scale: number): number {
    if (!(scale > 0)) {
        return 0;
    }
    return scale > 1 ? 1 : scale;
}

/**
 * One-sided three-point slope at an end sample, then the Fritsch–Carlson
 * endpoint clamp. `h0` / `delta0` are the interval adjacent to the endpoint.
 */
function endpointSlope(h0: number, h1: number, delta0: number, delta1: number): number {
    const slope = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
    if (sign(slope) !== sign(delta0)) {
        return 0;
    }
    if (sign(delta0) !== sign(delta1) && Math.abs(slope) > 3 * Math.abs(delta0)) {
        return 3 * delta0;
    }
    return slope;
}

/**
 * Fritsch–Butland weighted harmonic mean. Zero when the secants change
 * sign or either secant is zero, which is where the data has an extremum.
 */
function interiorSlope(hPrev: number, hNext: number, deltaPrev: number, deltaNext: number): number {
    if (!(deltaPrev * deltaNext > 0)) {
        return 0;
    }
    const w1 = 2 * hNext + hPrev;
    const w2 = hNext + 2 * hPrev;
    return (w1 + w2) / (w1 / deltaPrev + w2 / deltaNext);
}

function sign(value: number): number {
    if (value < 0) {
        return -1;
    }
    if (value > 0) {
        return 1;
    }
    return 0;
}
