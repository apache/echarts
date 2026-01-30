# Heatmap Axis Type Support Fix

## Problem
Heatmap charts with `xAxis.type = "time"` or `"value"` and `yAxis.type = "value"` behaved inconsistently between dev and prod builds:
- **Dev build**: Threw runtime error "Heatmap on cartesian must have two category axes"
- **Prod build**: Rendered successfully without errors

This inconsistency was caused by validation code wrapped in `__DEV__` blocks that only executed in development builds.

## Root Cause
In `src/chart/heatmap/HeatmapView.ts` (lines 186-193), the code enforced:
1. Both axes must be category type
2. Both axes must have `onBand = true` (boundaryGap)

These restrictions were only checked in dev builds via `__DEV__` conditional blocks, which are stripped in production builds.

## Solution
Modified `src/chart/heatmap/HeatmapView.ts` to:

1. **Removed restrictive validation** - Eliminated the `__DEV__` checks that enforced category axes only

2. **Added dynamic cell size calculation** - Implemented logic to calculate heatmap cell dimensions for different axis types:
   - **Category axes with onBand**: Use `getBandWidth()` (original behavior)
   - **Time/Value axes**: Calculate cell size as `pixelSpan / dataSpan`
     - `pixelSpan`: Pixel distance across the axis (from getGlobalExtent)
     - `dataSpan`: Data value range across the axis (from scale.getExtent)

3. **Ensured consistent behavior** - Both dev and prod builds now support time/value axes

## Code Changes

### Before (lines 186-203):
```typescript
if (isCartesian2d) {
    const xAxis = coordSys.getAxis('x');
    const yAxis = coordSys.getAxis('y');

    if (__DEV__) {
        if (!(xAxis.type === 'category' && yAxis.type === 'category')) {
            throw new Error('Heatmap on cartesian must have two category axes');
        }
        if (!(xAxis.onBand && yAxis.onBand)) {
            throw new Error('Heatmap on cartesian must have two axes with boundaryGap true');
        }
    }

    // add 0.5px to avoid the gaps
    width = xAxis.getBandWidth() + .5;
    height = yAxis.getBandWidth() + .5;
    xAxisExtent = xAxis.scale.getExtent();
    yAxisExtent = yAxis.scale.getExtent();
}
```

### After (lines 186-211):
```typescript
if (isCartesian2d) {
    const xAxis = coordSys.getAxis('x');
    const yAxis = coordSys.getAxis('y');

    xAxisExtent = xAxis.scale.getExtent();
    yAxisExtent = yAxis.scale.getExtent();

    if (xAxis.type === 'category' && xAxis.onBand) {
        width = xAxis.getBandWidth() + .5;
    } else {
        const xGlobalExtent = xAxis.getGlobalExtent();
        const xSpan = Math.abs(xGlobalExtent[1] - xGlobalExtent[0]);
        const xDataSpan = Math.abs(xAxisExtent[1] - xAxisExtent[0]);
        width = xDataSpan > 0 ? xSpan / xDataSpan : 0;
    }

    if (yAxis.type === 'category' && yAxis.onBand) {
        height = yAxis.getBandWidth() + .5;
    } else {
        const yGlobalExtent = yAxis.getGlobalExtent();
        const ySpan = Math.abs(yGlobalExtent[1] - yGlobalExtent[0]);
        const yDataSpan = Math.abs(yAxisExtent[1] - yAxisExtent[0]);
        height = yDataSpan > 0 ? ySpan / yDataSpan : 0;
    }
}
```

## Impact

### Supported Configurations
Heatmaps now officially support:
- `xAxis.type`: `'category'`, `'time'`, or `'value'`
- `yAxis.type`: `'category'`, `'time'`, or `'value'`
- Any combination of the above

### Backward Compatibility
✅ Fully backward compatible - existing heatmaps with category axes continue to work exactly as before

### Build Consistency
✅ Dev and prod builds now behave identically for all axis type combinations

## Testing
A test file has been created at `test/heatmap-time-value-axes.html` demonstrating:
- xAxis with type 'time'
- yAxis with type 'value'
- Proper rendering without errors in both dev and prod builds

## Files Modified
- `src/chart/heatmap/HeatmapView.ts` - Core fix implementation

## Files Added
- `test/heatmap-time-value-axes.html` - Test case for time/value axes
- `HEATMAP_FIX_SUMMARY.md` - This documentation
