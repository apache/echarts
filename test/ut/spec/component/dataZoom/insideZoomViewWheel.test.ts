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

import { getRangeHandlers } from '@/src/component/dataZoom/InsideZoomView';

interface ZoomCtx {
    range: [number, number];
    dataZoomModel: {
        findRepresentativeAxisProxy: () => { getMinMaxSpan: () => Record<string, number> };
    };
}

function makeCtx(range: [number, number]): ZoomCtx {
    return {
        range,
        dataZoomModel: {
            findRepresentativeAxisProxy: () => ({ getMinMaxSpan: () => ({}) })
        }
    };
}

const coordSysInfo = {
    model: {
        coordinateSystem: {
            getRect: () => ({ x: 0, y: 0, width: 400, height: 300 })
        }
    },
    axisModels: [{ axis: { dim: 'x', inverse: false } }]
};

function callZoom(
    ctx: ZoomCtx,
    eScale: number,
    originX = 200
): [number, number] | void {
    return (getRangeHandlers.zoom as any).call(
        ctx,
        coordSysInfo,
        'grid',
        null,
        { scale: eScale, originX, originY: 150, isAvailableBehavior: null }
    );
}

describe('dataZoom/InsideZoomView wheel zoom', function () {

    // https://github.com/apache/echarts/issues/21541
    it('expands a collapsed range when wheel-zooming out', function () {
        const ctx = makeCtx([33.33, 33.33]);

        // Wheel-out: e.scale < 1 → handler scale = 1 / e.scale > 1.
        const result = callZoom(ctx, 1 / 1.1) as [number, number];

        expect(result).toBeDefined();
        expect(result[1] - result[0]).toBeGreaterThan(0);
        // The seed expansion is anchored on the wheel position (centered here).
        expect((result[0] + result[1]) / 2).toBeCloseTo(33.33, 5);
    });

    it('does not expand a collapsed range when wheel-zooming in', function () {
        const ctx = makeCtx([33.33, 33.33]);
        const result = callZoom(ctx, 1.1);
        // Range did not change, so the handler returns undefined.
        expect(result).toBeUndefined();
        expect(ctx.range[0]).toBeCloseTo(33.33, 6);
        expect(ctx.range[1]).toBeCloseTo(33.33, 6);
    });

    it('keeps the existing multiplicative behavior on a non-degenerate range', function () {
        const ctx = makeCtx([25, 75]);
        const before = ctx.range[1] - ctx.range[0];
        const result = callZoom(ctx, 1 / 1.1) as [number, number];
        const after = result[1] - result[0];

        expect(after).toBeGreaterThan(before);
        // Roughly the wheel factor (1.1×).
        expect(after / before).toBeCloseTo(1.1, 1);
    });

    it('clamps the seeded range to [0, 100] without crashing near the edge', function () {
        const ctx = makeCtx([99.5, 99.5]);
        const result = callZoom(ctx, 1 / 1.1, 400) as [number, number];

        expect(result).toBeDefined();
        expect(result[1] - result[0]).toBeGreaterThan(0);
        expect(result[0]).toBeGreaterThanOrEqual(0);
        expect(result[1]).toBeLessThanOrEqual(100);
    });
});
