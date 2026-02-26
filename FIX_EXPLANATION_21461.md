# Fix for Issue #21461: Label moveOverlap Bug in Heatmap Series

## Issue Summary
**Repository:** apache/echarts  
**Issue:** #21461  
**Title:** "[Bug] When using the moveOverLap attribute for label overlap, the position should remain within the coordinate system, and in some cases, offsets are applied unnecessarily"

## Problem Description

When using `series.labelLayout: { moveOverlap: 'shiftX' | 'shiftY' }` on Heatmap series with value or time axes, two bugs occurred:

1. **Unnecessary Shifts**: Labels were shifted even when they didn't overlap, causing unexpected position changes.
2. **Out-of-Bounds Labels**: Labels were moved outside the coordinate system (beyond the plotting area) instead of staying within the axis bounds.

## Root Causes

### Cause 1: Incorrect Bounds in LabelManager.ts
In `src/label/LabelManager.ts`, the `layout()` method passed the entire canvas dimensions `(0, 0, width, height)` to `shiftLayoutOnXY()`:

```typescript
shiftLayoutOnXY(labelsNeedsAdjustOnX, 0, 0, width);
shiftLayoutOnXY(labelsNeedsAdjustOnY, 1, 0, height);
```

For Cartesian coordinate systems (like heatmap with value/time axes), the plotting area is typically smaller than the canvas due to axis labels, titles, and margins. This caused labels to be shifted beyond the coordinate system bounds.

### Cause 2: Unnecessary Shifts in labelLayoutHelper.ts
In `src/label/labelLayoutHelper.ts`, the `shiftLayoutOnXY()` function always attempted to eliminate gaps between labels, even when labels weren't overlapping. The function would shift labels starting from position 0, regardless of their actual initial positions.

## Solution

### Fix 1: Use Coordinate System Bounds (LabelManager.ts)
Modified the `layout()` method to detect and use the coordinate system's actual plotting area bounds:

```typescript
// Get coordinate system bounds for cartesian systems
const getCoordSysBounds = (labels: LabelLayoutWithGeometry[], xyDimIdx: 0 | 1) => {
    if (labels.length === 0) {
        return { min: 0, max: xyDimIdx === 0 ? width : height };
    }
    // Try to get bounds from the first label's series coordinate system
    const firstLabel = labels[0];
    const coordSys = firstLabel.seriesModel && firstLabel.seriesModel.coordinateSystem;
    if (coordSys && coordSys.type === 'cartesian2d') {
        const area = (coordSys as any).getArea();
        if (area) {
            return xyDimIdx === 0
                ? { min: area.x, max: area.x + area.width }
                : { min: area.y, max: area.y + area.height };
        }
    }
    return { min: 0, max: xyDimIdx === 0 ? width : height };
};

const xBounds = getCoordSysBounds(labelsNeedsAdjustOnX, 0);
const yBounds = getCoordSysBounds(labelsNeedsAdjustOnY, 1);

shiftLayoutOnXY(labelsNeedsAdjustOnX, 0, xBounds.min, xBounds.max);
shiftLayoutOnXY(labelsNeedsAdjustOnY, 1, yBounds.min, yBounds.max);
```

This ensures labels are constrained to the actual coordinate system area, not the entire canvas.

### Fix 2: Only Shift When Overlapping (labelLayoutHelper.ts)
Added an overlap detection pass before applying shifts:

```typescript
// First pass: check if there are any actual overlaps
let hasOverlap = false;
for (let i = 1; i < len; i++) {
    const prevRect = list[i - 1].rect;
    const currRect = list[i].rect;
    if (currRect[xyDim] < prevRect[xyDim] + prevRect[sizeDim]) {
        hasOverlap = true;
        break;
    }
}

// If no overlaps, only clamp labels to bounds without shifting
if (!hasOverlap) {
    let adjusted = false;
    for (let i = 0; i < len; i++) {
        const item = list[i];
        const rect = item.rect;
        const rectStart = rect[xyDim];
        const rectEnd = rectStart + rect[sizeDim];
        
        // Clamp to minBound
        if (rectStart < minBound) {
            const delta = minBound - rectStart;
            rect[xyDim] = minBound;
            item.label[xyDim] += delta;
            adjusted = true;
        }
        // Clamp to maxBound
        else if (rectEnd > maxBound) {
            const delta = maxBound - rectEnd;
            rect[xyDim] += delta;
            item.label[xyDim] += delta;
            adjusted = true;
        }
    }
    return adjusted;
}
```

This ensures labels are only shifted when they actually overlap, and otherwise only clamped to stay within bounds.

## Expected Behavior After Fix

1. **No Unnecessary Shifts**: Labels that don't overlap remain in their original positions.
2. **Within Bounds**: All labels stay within the coordinate system's plotting area.
3. **Proper Overlap Resolution**: When labels do overlap, they are shifted appropriately to resolve the overlap while staying within bounds.

## Testing

A test file `test/heatmap-label-moveOverlap.html` has been created with three test cases:
1. Heatmap with value axes and `moveOverlap: 'shiftX'` - labels should not shift unnecessarily
2. Heatmap with time axis and `moveOverlap: 'shiftY'` - labels should stay within bounds
3. Heatmap with actual overlapping labels - labels should shift to resolve overlap

## Files Modified

1. `src/label/LabelManager.ts` - Updated `layout()` method to use coordinate system bounds
2. `src/label/labelLayoutHelper.ts` - Updated `shiftLayoutOnXY()` to only shift when overlapping

## Backward Compatibility

This fix maintains backward compatibility:
- For non-Cartesian coordinate systems, the behavior remains unchanged (uses canvas bounds)
- For labels that actually overlap, the resolution logic remains the same
- Only the unnecessary shifts and out-of-bounds issues are fixed

## References

- Issue: apache/echarts#21461
- Codesandbox reproduction: https://codesandbox.io/p/sandbox/echarts-basic-example-template-mpfz1s
