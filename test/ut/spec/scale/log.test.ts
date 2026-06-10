
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

import {
    asinhScaleForwardTick,
    asinhScaleInverseTick,
    symlogScaleForwardTick,
    symlogScaleInverseTick,
} from '@/src/scale/helper';
import LogScale from '@/src/scale/Log';

// Relative tolerance used by `approxEqual` in round-trip tests:
// `|a - b| <= tolerance * (1 + |b|)`.
// `Number.EPSILON` is too strict for chained transcendentals
// (`asinh/sinh`, `log1p/expm1`) due to floating-point drift.
// `1e-10` keeps tests stable across the covered range while still catching
// meaningful regressions.
const ROUND_TRIP_REL_TOLERANCE = 1e-10;

function approxEqual(a: number, b: number, tolerance = ROUND_TRIP_REL_TOLERANCE): boolean {
    return Math.abs(a - b) <= tolerance * (1 + Math.abs(b));
}

describe('asinhScaleForwardTick', () => {
    const a0 = 1;

    it('maps 0 to 0', () => {
        expect(asinhScaleForwardTick(0, a0)).toBe(0);
    });

    it('is odd-symmetric: f(-x) = -f(x)', () => {
        for (const x of [0.1, 1, 10, 100, 1000]) {
            expect(asinhScaleForwardTick(-x, a0)).toBeCloseTo(
                -asinhScaleForwardTick(x, a0), 10
            );
        }
    });

    it('round-trips with asinhScaleInverseTick', () => {
        for (const x of [-1000, -100, -10, -1, -0.1, 0, 0.1, 1, 10, 100, 1000]) {
            const forward = asinhScaleForwardTick(x, a0);
            const back = asinhScaleInverseTick(forward, a0, null);
            expect(approxEqual(back, x)).toBe(true);
        }
    });

    it('behaves linearly near zero (|x| << a0)', () => {
        // For small x: asinh(x/a0)*a0 ≈ x
        const small = 0.001;
        expect(asinhScaleForwardTick(small, a0)).toBeCloseTo(small, 5);
    });

    it('uses a0 as scale parameter: f(a0, a0) = asinh(1) * a0', () => {
        const expected = Math.asinh(1) * a0;
        expect(asinhScaleForwardTick(a0, a0)).toBeCloseTo(expected, 10);
    });

    it('responds to a0 changes: larger a0 gives less compression for the same |x|', () => {
        const x = 10;
        expect(asinhScaleForwardTick(x, 10)).toBeGreaterThan(asinhScaleForwardTick(x, 1));
    });

    it('returns NaN when a0 is zero (invalid)', () => {
        expect(Number.isNaN(asinhScaleForwardTick(1, 0))).toBe(true);
    });

    it('propagates non-finite inputs', () => {
        expect(Number.isNaN(asinhScaleForwardTick(NaN, a0))).toBe(true);
        expect(asinhScaleForwardTick(Infinity, a0)).toBe(Infinity);
        expect(asinhScaleForwardTick(-Infinity, a0)).toBe(-Infinity);
    });
});

describe('asinhScaleInverseTick', () => {
    const a0 = 1;

    it('returns lookup value when available', () => {
        const opt = { lookup: { from: [5], to: [42] } };
        expect(asinhScaleInverseTick(5, a0, opt)).toBe(42);
    });

    it('supports multiple lookup entries (extent start/end style)', () => {
        const opt = { lookup: { from: [-2, 0, 2], to: [-100, 0, 100] } };
        expect(asinhScaleInverseTick(-2, a0, opt)).toBe(-100);
        expect(asinhScaleInverseTick(0, a0, opt)).toBe(0);
        expect(asinhScaleInverseTick(2, a0, opt)).toBe(100);
    });

    it('falls through lookup for non-matching value', () => {
        const opt = { lookup: { from: [5], to: [42] } };
        const result = asinhScaleInverseTick(1, a0, opt);
        expect(result).toBeCloseTo(Math.sinh(1) * a0, 10);
    });

    it('computes inverse when opt is null', () => {
        const linearVal = 1;
        const result = asinhScaleInverseTick(linearVal, a0, null);
        expect(result).toBeCloseTo(Math.sinh(linearVal) * a0, 10);
    });

    it('round-trips very large finite values', () => {
        const x = 1e300;
        const forward = asinhScaleForwardTick(x, a0);
        expect(Number.isFinite(forward)).toBe(true);

        const back = asinhScaleInverseTick(forward, a0, null);
        expect(Number.isFinite(back)).toBe(true);
        expect(approxEqual(back, x)).toBe(true);
    });

    it('returns NaN when a0 is zero (invalid)', () => {
        expect(Number.isNaN(asinhScaleInverseTick(1, 0, null))).toBe(true);
    });

    it('propagates non-finite transformed values', () => {
        expect(Number.isNaN(asinhScaleInverseTick(NaN, a0, null))).toBe(true);
        expect(asinhScaleInverseTick(Infinity, a0, null)).toBe(Infinity);
        expect(asinhScaleInverseTick(-Infinity, a0, null)).toBe(-Infinity);
    });
});

describe('symlogScaleForwardTick', () => {
    const C = 1;

    it('maps 0 to 0', () => {
        expect(symlogScaleForwardTick(0, C)).toBe(0);
    });

    it('is odd-symmetric: f(-x) = -f(x)', () => {
        for (const x of [0.1, 1, 10, 100, 1000]) {
            expect(symlogScaleForwardTick(-x, C)).toBeCloseTo(
                -symlogScaleForwardTick(x, C), 10
            );
        }
    });

    it('round-trips with symlogScaleInverseTick', () => {
        for (const x of [-1000, -100, -10, -1, -0.1, 0, 0.1, 1, 10, 100, 1000]) {
            const forward = symlogScaleForwardTick(x, C);
            const back = symlogScaleInverseTick(forward, C, null);
            expect(approxEqual(back, x)).toBe(true);
        }
    });

    it('behaves linearly near zero (|x| << C): f(x) ≈ x/C', () => {
        const small = 0.001;
        // log1p(small/C) ≈ small/C, times sign(x) => ≈ small
        expect(symlogScaleForwardTick(small, C)).toBeCloseTo(small, 5);
    });

    it('f(C, C) = ln(2)', () => {
        expect(symlogScaleForwardTick(C, C)).toBeCloseTo(Math.LN2, 10);
    });

    it('responds to C changes: larger C compresses the same |x| more', () => {
        const x = 10;
        expect(symlogScaleForwardTick(x, 10)).toBeLessThan(symlogScaleForwardTick(x, 1));
    });

    it('returns non-finite when C is non-positive (invalid)', () => {
        expect(symlogScaleForwardTick(1, 0)).toBe(Infinity);
        expect(Number.isNaN(symlogScaleForwardTick(2, -1))).toBe(true);
    });

    it('propagates non-finite inputs', () => {
        expect(Number.isNaN(symlogScaleForwardTick(NaN, C))).toBe(true);
        expect(symlogScaleForwardTick(Infinity, C)).toBe(Infinity);
        expect(symlogScaleForwardTick(-Infinity, C)).toBe(-Infinity);
    });
});

describe('symlogScaleInverseTick', () => {
    const C = 1;

    it('returns lookup value when available', () => {
        const opt = { lookup: { from: [2], to: [99] } };
        expect(symlogScaleInverseTick(2, C, opt)).toBe(99);
    });

    it('supports multiple lookup entries (extent start/end style)', () => {
        const opt = { lookup: { from: [-2, 0, 2], to: [-100, 0, 100] } };
        expect(symlogScaleInverseTick(-2, C, opt)).toBe(-100);
        expect(symlogScaleInverseTick(0, C, opt)).toBe(0);
        expect(symlogScaleInverseTick(2, C, opt)).toBe(100);
    });

    it('falls through lookup for non-matching value', () => {
        const opt = { lookup: { from: [2], to: [99] } };
        const result = symlogScaleInverseTick(1, C, opt);
        expect(result).toBeCloseTo(Math.expm1(1) * C, 10);
    });

    it('computes inverse when opt is null', () => {
        const linearVal = 1;
        const result = symlogScaleInverseTick(linearVal, C, null);
        expect(result).toBeCloseTo(Math.expm1(linearVal) * C, 10);
    });

    it('responds to C changes in inverse mapping', () => {
        const linearVal = 1;
        expect(symlogScaleInverseTick(linearVal, 10, null))
            .toBeGreaterThan(symlogScaleInverseTick(linearVal, 1, null));
    });

    it('collapses to zero when C is zero (invalid)', () => {
        expect(symlogScaleInverseTick(1, 0, null)).toBe(0);
    });

    it('propagates non-finite transformed values', () => {
        expect(Number.isNaN(symlogScaleInverseTick(NaN, C, null))).toBe(true);
        expect(symlogScaleInverseTick(Infinity, C, null)).toBe(Infinity);
        expect(symlogScaleInverseTick(-Infinity, C, null)).toBe(-Infinity);
    });
});

// ---------------------------------------------------------------------------
// Cross-transform: asinh vs symlog comparison
// ---------------------------------------------------------------------------

describe('asinh vs symlog comparison', () => {
    it('both map 0 to 0 exactly', () => {
        expect(asinhScaleForwardTick(0, 1)).toBe(0);
        expect(symlogScaleForwardTick(0, 1)).toBe(0);
    });

    it('both are strictly monotone (positive side)', () => {
        const xs = [0.1, 1, 10, 100];
        for (let i = 1; i < xs.length; i++) {
            expect(asinhScaleForwardTick(xs[i], 1))
                .toBeGreaterThan(asinhScaleForwardTick(xs[i - 1], 1));
            expect(symlogScaleForwardTick(xs[i], 1))
                .toBeGreaterThan(symlogScaleForwardTick(xs[i - 1], 1));
        }
    });
});

// ---------------------------------------------------------------------------
// LogScale — scale-level tests
// ---------------------------------------------------------------------------

describe('LogScale — standard log (regression)', () => {
    function makeLogScale(base = 10) {
        return new LogScale({
            logBase: base,
            logMapping: undefined,
            logLinearWidth: undefined,
            breakOption: undefined,
        });
    }

    it('accepts positive extent', () => {
        const s = makeLogScale();
        s.setExtent(1, 1000);
        expect(s.getExtent()).toEqual([1, 1000]);
    });

    it('silently rejects zero in setExtent (no-op)', () => {
        const s = makeLogScale();
        s.setExtent(1, 1000);
        s.setExtent(0, 1000);
        expect(s.getExtent()).toEqual([1, 1000]);
    });

    it('silently rejects negative in setExtent (no-op)', () => {
        const s = makeLogScale();
        s.setExtent(1, 1000);
        s.setExtent(-10, 1000);
        expect(s.getExtent()).toEqual([1, 1000]);
    });

    it('getFilter returns positivity guard', () => {
        const s = makeLogScale();
        s.setExtent(1, 1000);
        const filter = s.getFilter!();
        expect(filter).toHaveProperty('g');
        expect((filter as any).g).toBeGreaterThanOrEqual(0);
    });

    it('getDefaultStartValue returns 1', () => {
        const s = makeLogScale();
        expect(s.getDefaultStartValue!()).toBe(1);
    });
});

describe('LogScale — logMapping: asinh', () => {
    function makeAsinhScale(logBase = 10, logLinearWidth = 1) {
        return new LogScale({
            logBase,
            logMapping: 'asinh',
            logLinearWidth,
            breakOption: undefined,
        });
    }

    it('setExtent accepts zero (start=0)', () => {
        const s = makeAsinhScale();
        expect(() => s.setExtent(0, 100)).not.toThrow();
    });

    it('setExtent accepts negative extent', () => {
        const s = makeAsinhScale();
        s.setExtent(-100, 100);
        expect(s.getExtent()).toEqual([-100, 100]);
    });

    it('getFilter returns no positivity guard', () => {
        const s = makeAsinhScale();
        s.setExtent(-100, 100);
        expect(s.getFilter!()).not.toHaveProperty('g');
    });

    it('sanitize does not clamp negative values', () => {
        const s = makeAsinhScale();
        s.setExtent(-100, 100);
        expect(s.sanitize!(-50, [-100, 100])).toBe(-50);
        expect(s.sanitize!(0, [-100, 100])).toBe(0);
    });

    it('getDefaultStartValue returns 0', () => {
        expect(makeAsinhScale().getDefaultStartValue!()).toBe(0);
    });

    it('normalize / scale round-trip', () => {
        const s = makeAsinhScale();
        s.setExtent(-100, 100);
        for (const x of [-100, -10, -1, 0, 1, 10, 100]) {
            const norm = s.normalize(x);
            const back = s.scale(norm);
            expect(back).toBeCloseTo(x, 5);
        }
    });

    it('uses pre-computed mapped ticks when `_mappedLogTicks` is set', () => {
        const s = makeAsinhScale();
        const mappedTicks = [{ value: -1 }, { value: 0 }, { value: 1 }];
        s._mappedLogTicks = mappedTicks;
        expect(s.getTicks()).toBe(mappedTicks);
    });

    it('invalid logLinearWidth values fall back to 1', () => {
        const expected = makeAsinhScale(10, 1);
        expected.setExtent(-100, 100);

        for (const invalidLw of [0, -1, Infinity, NaN]) {
            const s = makeAsinhScale(10, invalidLw);
            expect(s.linearWidth).toBe(1);

            s.setExtent(-100, 100);
            for (const x of [-100, -10, -1, 0, 1, 10, 100]) {
                expect(s.normalize(x)).toBeCloseTo(expected.normalize(x), 10);
                expect(s.scale(s.normalize(x))).toBeCloseTo(expected.scale(expected.normalize(x)), 10);
            }
        }
    });
});

describe('LogScale — logMapping: symlog', () => {
    function makeSymlogScale(logBase = 10, logLinearWidth = 1) {
        return new LogScale({
            logBase,
            logMapping: 'symlog',
            logLinearWidth,
            breakOption: undefined,
        });
    }

    it('setExtent accepts zero and negative', () => {
        const s = makeSymlogScale();
        s.setExtent(-100, 100);
        expect(s.getExtent()).toEqual([-100, 100]);
    });

    it('getFilter returns no positivity guard', () => {
        const s = makeSymlogScale();
        s.setExtent(-100, 100);
        expect(s.getFilter!()).not.toHaveProperty('g');
    });

    it('sanitize does not clamp negative values', () => {
        const s = makeSymlogScale();
        s.setExtent(-100, 100);
        expect(s.sanitize!(-50, [-100, 100])).toBe(-50);
    });

    it('getDefaultStartValue returns 0', () => {
        expect(makeSymlogScale().getDefaultStartValue!()).toBe(0);
    });

    it('normalize / scale round-trip', () => {
        const s = makeSymlogScale();
        s.setExtent(-100, 100);
        for (const x of [-100, -10, -1, 0, 1, 10, 100]) {
            const back = s.scale(s.normalize(x));
            expect(back).toBeCloseTo(x, 5);
        }
    });

    it('invalid logLinearWidth values fall back to 1', () => {
        const expected = makeSymlogScale(10, 1);
        expected.setExtent(-100, 100);

        for (const invalidLw of [0, -1, Infinity, NaN]) {
            const s = makeSymlogScale(10, invalidLw);
            expect(s.linearWidth).toBe(1);

            s.setExtent(-100, 100);
            for (const x of [-100, -10, -1, 0, 1, 10, 100]) {
                expect(s.normalize(x)).toBeCloseTo(expected.normalize(x), 10);
                expect(s.scale(s.normalize(x))).toBeCloseTo(expected.scale(expected.normalize(x)), 10);
            }
        }
    });
});
