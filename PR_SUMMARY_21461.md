# Pull Request Summary: Fix Issue #21461

## Issue
**#21461**: "[Bug] When using the moveOverLap attribute for label overlap, the position should remain within the coordinate system, and in some cases, offsets are applied unnecessarily"

## Problem
When using `labelLayout: { moveOverlap: 'shiftX' | 'shiftY' }` on Heatmap series with value/time axes:
1. Labels were shifted even when they didn't overlap
2. Labels moved outside the coordinate system bounds

## Root Cause
1. `LabelManager.layout()` used canvas dimensions instead of coordinate system bounds
2. `shiftLayoutOnXY()` always shifted labels to eliminate gaps, even without overlaps

## Solution

### Changes in `src/label/LabelManager.ts`
- Added `getCoordSysBounds()` helper to extract coordinate system plotting area
- Pass coordinate system bounds to `shiftLayoutOnXY()` instead of canvas dimensions
- Falls back to canvas dimensions for non-Cartesian systems

### Changes in `src/label/labelLayoutHelper.ts`
- Added overlap detection pass before shifting
- If no overlaps detected, only clamp labels to bounds without shifting
- Preserves original shift logic when overlaps exist

## Testing
- Created `test/heatmap-label-moveOverlap.html` with 3 test cases
- Verified labels stay within coordinate system bounds
- Verified no unnecessary shifts when labels don't overlap
- Verified proper overlap resolution when labels do overlap

## Backward Compatibility
✅ Maintains full backward compatibility:
- Non-Cartesian systems unchanged
- Overlap resolution logic unchanged
- Only fixes the specific bugs reported

## Files Modified
- `src/label/LabelManager.ts` (28 lines added)
- `src/label/labelLayoutHelper.ts` (35 lines added)
- `test/heatmap-label-moveOverlap.html` (new test file)

## References
- Issue: apache/echarts#21461
- Reproduction: https://codesandbox.io/p/sandbox/echarts-basic-example-template-mpfz1s
