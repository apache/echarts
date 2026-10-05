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
 * Shape-aware geometry helpers for graph edge endpoints.
 *
 * The graph series offsets an edge's end-symbol away from the node center so it is not hidden
 * under the node. Historically that offset was a plain circle radius (`symbolSize / 2`), which is
 * wrong for any non-circular / non-uniformly-scaled / rotated / SVG node: the true distance from
 * the center to the node outline depends on the approach angle.
 *
 * These helpers compute that distance against the node's *actual* transformed outline. Rather than
 * re-deriving the rotation/scale math by hand, they reuse zrender's own transform pipeline: a
 * unit-size symbol `Path` (built exactly as `chart/helper/Symbol` builds node symbols) is given
 * the node's transform and probed with `Path#contain`, so the boundary always matches what is
 * actually drawn.
 *
 * All coordinates here are **relative to the node center** (the ray / probe origin), which makes
 * the returned boundary distance directly usable by the caller with no back-transform.
 */

import { createSymbol, ECSymbol } from '../../util/symbol';
import { applyTransform } from 'zrender/src/core/vector';

type Vec2 = [number, number] | number[];

// Cache one unit-size proxy per distinct geometry. The full `path://` / `image://` string is part
// of `symbolType`, so distinct SVG/image symbols get distinct cache entries.
const proxyCache: Record<string, ECSymbol> = {};

const RAD = Math.PI / 180;
// Coarse ray samples used to locate the outermost inside→outside transition (robust for concave
// shapes such as `arrow` / `pin` / star SVGs), then refined by bisection.
const COARSE_SAMPLES = 16;
const BISECT_ITERATIONS = 12;
const EXTENT_SAFETY = 1.05;

const _corner: number[] = [];

function isCircleType(symbolType: string): boolean {
    return symbolType === 'circle';
}

function hasOffset(offset: Vec2): boolean {
    return !!offset && !!(offset[0] || offset[1]);
}

// `emptyCircle`, `emptyRect`, ... share the outline of their non-empty base shape.
function baseSymbolType(symbolType: string): string {
    return symbolType.indexOf('empty') === 0
        ? symbolType.charAt(5).toLowerCase() + symbolType.slice(6)
        : symbolType;
}

// Local unit-space vertices of the built-in convex polygon symbols (built at [-1, 1] on each axis).
const CONVEX_POLY_VERTS: Record<string, number[][]> = {
    triangle: [[0, -1], [1, 1], [-1, 1]],
    diamond: [[0, -1], [1, 0], [0, 1], [-1, 0]],
    rect: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    square: [[-1, -1], [1, -1], [1, 1], [-1, 1]]
};

/**
 * Ray-exit parameter for a convex polygon whose interior contains the origin: the smallest `t > 0`
 * at which `t * (ux, uy)` crosses an edge. Returns `Infinity` if no edge is crossed.
 */
function convexPolyRayExit(verts: number[][], ux: number, uy: number): number {
    let best = Infinity;
    const n = verts.length;
    for (let i = 0; i < n; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % n];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        // Solve t*(ux,uy) = a + s*(ex,ey) for (t, s) via Cramer's rule.
        const det = ex * uy - ux * ey;
        if (Math.abs(det) < 1e-12) {
            continue;
        }
        const t = (ex * a[1] - a[0] * ey) / det;
        const s = (ux * a[1] - uy * a[0]) / det;
        if (t > 1e-9 && s >= -1e-6 && s <= 1 + 1e-6 && t < best) {
            best = t;
        }
    }
    return best;
}

/**
 * Ray-exit parameter for the unit `roundRect` (box [-1, 1] with corner radius 0.5). Exits on a flat
 * edge unless the ray heads into a corner, where it meets the quarter-circle arc.
 */
function roundRectRayExit(ux: number, uy: number): number {
    const tBox = 1 / Math.max(Math.abs(ux), Math.abs(uy));
    const qx = tBox * ux;
    const qy = tBox * uy;
    if (Math.abs(qx) <= 0.5 || Math.abs(qy) <= 0.5) {
        return tBox;
    }
    // Farther intersection with the corner arc centered at (+/-0.5, +/-0.5), radius 0.5.
    const cx = qx > 0 ? 0.5 : -0.5;
    const cy = qy > 0 ? 0.5 : -0.5;
    const a = ux * ux + uy * uy;
    const b = -2 * (ux * cx + uy * cy);
    const c = cx * cx + cy * cy - 0.25;
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
        return tBox;
    }
    return (-b + Math.sqrt(disc)) / (2 * a);
}

/**
 * Exact center→outline distance for shapes with a closed-form ray intersection, or `null` when no
 * analytic formula applies (concave / path / image / line symbols → generic ray-march).
 *
 * The rendered transform is `g = R'*S*p` with `S = diag(halfW, halfH)` and
 * `R' = [[cos, sin], [-sin, cos]]` (see zrender `Transformable.getLocalTransform`). A center ray
 * `g(t) = t*dir` maps to the local ray `t*u` with `u = S^-1 * R'^-1 * dir`, and since `R'*S*u = dir`
 * is a unit vector, the global distance equals the local exit parameter `t`.
 */
function getAnalyticBoundaryDistance(
    baseType: string,
    halfW: number,
    halfH: number,
    rotateRad: number,
    dirX: number,
    dirY: number
): number {
    const ct = Math.cos(rotateRad);
    const st = Math.sin(rotateRad);
    // u = S^-1 * R'^-1 * dir
    const ux = (dirX * ct - dirY * st) / halfW;
    const uy = (dirX * st + dirY * ct) / halfH;

    switch (baseType) {
        case 'circle':
            // Ellipse: |t*u| = 1.
            return 1 / Math.sqrt(ux * ux + uy * uy);
        case 'rect':
        case 'square':
            // Box: max(|t*ux|, |t*uy|) = 1.
            return 1 / Math.max(Math.abs(ux), Math.abs(uy));
        case 'diamond':
            // |t*ux| + |t*uy| = 1.
            return 1 / (Math.abs(ux) + Math.abs(uy));
        case 'triangle':
            return convexPolyRayExit(CONVEX_POLY_VERTS.triangle, ux, uy);
        case 'roundRect':
            return roundRectRayExit(ux, uy);
        default:
            // pin / arrow (center is not the geometric center), path / image / line / none.
            return null;
    }
}

function getProxy(symbolType: string, keepAspect: boolean): ECSymbol {
    const key = symbolType + '|' + (keepAspect ? 1 : 0);
    let proxy = proxyCache[key];
    if (!proxy) {
        // Build at unit size centered on the origin, mirroring `Symbol#_createSymbol`.
        proxy = createSymbol(symbolType, -1, -1, 2, 2, null, keepAspect);
        // `Path#contain` tests fill containment, so the proxy must report a fill. `setColor`
        // is a no-op on images, whose `contain` is a bounding-rect test and needs no fill.
        proxy.setColor && proxy.setColor('#000');
        proxyCache[key] = proxy;
    }
    return proxy;
}

/**
 * (Re)configure the shared proxy for a node's symbol, in center-relative space, and refresh its
 * transform matrix. `size` and `offset` must already include the node global scale.
 *
 * The returned proxy is shared and mutable: use it synchronously and finish before configuring a
 * proxy of the same symbol type again.
 */
function configureSymbolProxy(
    symbolType: string,
    size: Vec2,
    rotateRad: number,
    keepAspect: boolean,
    offset: Vec2
): ECSymbol {
    const proxy = getProxy(symbolType, keepAspect);
    proxy.x = offset ? offset[0] : 0;
    proxy.y = offset ? offset[1] : 0;
    // Unit symbol spans [-1, 1] on each axis, so half-size is the scale factor.
    proxy.scaleX = size[0] / 2;
    proxy.scaleY = size[1] / 2;
    proxy.rotation = rotateRad || 0;
    proxy.originX = 0;
    proxy.originY = 0;
    proxy.updateTransform();
    return proxy;
}

/**
 * Upper bound for the distance from the center to the outline: the farthest transformed corner of
 * the proxy's local bounding rect (with a small safety margin).
 */
function computeMaxExtent(proxy: ECSymbol, size: Vec2): number {
    const m = proxy.transform;
    const rect = proxy.getBoundingRect();
    if (!m) {
        // Identity transform (near-unit scale): local ~= global, outline within radius √2.
        return Math.max(size[0], size[1]) / 2 * Math.SQRT2 * EXTENT_SAFETY + 1;
    }
    const x0 = rect.x;
    const y0 = rect.y;
    const x1 = rect.x + rect.width;
    const y1 = rect.y + rect.height;
    let maxDistSq = 0;
    for (let i = 0; i < 4; i++) {
        _corner[0] = i & 1 ? x1 : x0;
        _corner[1] = i & 2 ? y1 : y0;
        applyTransform(_corner, _corner, m);
        const distSq = _corner[0] * _corner[0] + _corner[1] * _corner[1];
        if (distSq > maxDistSq) {
            maxDistSq = distSq;
        }
    }
    return Math.sqrt(maxDistSq) * EXTENT_SAFETY;
}

/**
 * Distance from the node center to its transformed symbol outline along the unit direction
 * `(dirX, dirY)`. Placing the endpoint at `center + dist * dir` makes it flush with the node
 * outline at that approach angle.
 */
export function getSymbolBoundaryDistance(
    symbolType: string,
    size: Vec2,
    rotateRad: number,
    keepAspect: boolean,
    offset: Vec2,
    dirX: number,
    dirY: number
): number {
    const halfW = size[0] / 2;
    const halfH = size[1] / 2;
    if (!(halfW > 0) || !(halfH > 0)) {
        return 0;
    }

    const noOffset = !hasOffset(offset);
    const baseType = baseSymbolType(symbolType);

    // Fast path: a symmetric circle is angle-independent — covers the default node.
    if (noOffset && isCircleType(baseType) && halfW === halfH) {
        return halfW;
    }

    // Exact analytic outline for shapes with a closed-form ray intersection (no offset).
    if (noOffset) {
        const analytic = getAnalyticBoundaryDistance(baseType, halfW, halfH, rotateRad, dirX, dirY);
        if (analytic != null && isFinite(analytic) && analytic > 0) {
            return analytic;
        }
    }

    // Generic fallback: ray-march the transformed outline. Handles concave / `path://` shapes,
    // raster and SVG images (bounding box), and offset shapes.
    const fallback = Math.max(halfW, halfH);
    const proxy = configureSymbolProxy(symbolType, size, rotateRad, keepAspect, offset);
    const tMax = computeMaxExtent(proxy, size);
    if (!(tMax > 0)) {
        return fallback;
    }

    const step = tMax / COARSE_SAMPLES;
    let lastInside = NaN;
    for (let i = 0; i <= COARSE_SAMPLES; i++) {
        const t = step * i;
        if (proxy.contain(t * dirX, t * dirY)) {
            lastInside = t;
        }
    }

    // No sample inside: unfillable (`line` / `none`) or the offset moved the shape off the ray.
    if (isNaN(lastInside)) {
        return fallback;
    }
    // Outline extends beyond the search bound (should not happen given the safety margin).
    if (lastInside >= tMax) {
        return lastInside;
    }

    // Refine the outermost boundary between the last inside sample and the next (outside) one.
    let lo = lastInside;
    let hi = lastInside + step;
    for (let i = 0; i < BISECT_ITERATIONS; i++) {
        const mid = (lo + hi) / 2;
        if (proxy.contain(mid * dirX, mid * dirY)) {
            lo = mid;
        }
        else {
            hi = mid;
        }
    }
    return (lo + hi) / 2;
}

/**
 * Predicate testing whether a point (relative to the node center) lies inside the node's
 * transformed symbol. Used to clip curved edges to the outline.
 *
 * The returned function borrows the shared proxy for its symbol type, so use it synchronously and
 * finish before requesting another checker for the same symbol type.
 */
export function getSymbolContainChecker(
    symbolType: string,
    size: Vec2,
    rotateRad: number,
    keepAspect: boolean,
    offset: Vec2
): (relX: number, relY: number) => boolean {
    const proxy = configureSymbolProxy(symbolType, size, rotateRad, keepAspect, offset);
    return function (relX: number, relY: number): boolean {
        return proxy.contain(relX, relY);
    };
}

/**
 * Convert an option `symbolRotate` (degrees) to radians, matching `chart/helper/Symbol`.
 */
export function symbolRotateToRad(symbolRotate: number): number {
    return (symbolRotate || 0) * RAD || 0;
}
