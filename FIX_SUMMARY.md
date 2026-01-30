# Fix for Issue #21504: axisLabel.height property doesn't work without backgroundColor

## Problem Analysis

The issue was that the `height` property on `axisLabel` would not take effect unless a `backgroundColor` was also specified. This was an unexpected dependency that limited the flexibility of label styling.

### Root Cause

Located in `src/label/labelStyle.ts`, the `setTokenTextStyle` function:

1. **Height property was being set**: The `height` property is part of the `TEXT_PROPS_SELF` array (line 485) and was being applied to the text style unconditionally.

2. **Box rendering dependency**: However, in zrender's Text component (the underlying rendering library), the height/width constraints only take effect when there's a visible bounding box. Without a `backgroundColor` or `borderColor`, no box is rendered, and thus the height constraint is ignored.

3. **The problematic code section** (lines 550-575):
   - Box properties like `backgroundColor` are only set when `!isBlock || !opt.disableBox`
   - If no `backgroundColor` is explicitly provided, the text renders without a bounding box
   - Without a bounding box, the `height` constraint has no visual effect

## Solution

The fix ensures that when `height` or `width` is specified without a `backgroundColor`, a transparent background is automatically set. This enables the box rendering in zrender, which allows the height/width constraints to work properly.

### Code Changes

**File**: `src/label/labelStyle.ts`

**Location**: After the box properties section (around line 575)

**Change**: Added the following logic:
```typescript
// If height or width is set but no backgroundColor, set transparent background
// to ensure the box constraints are applied
if ((textStyle.height != null || textStyle.width != null) && textStyle.backgroundColor == null) {
    textStyle.backgroundColor = 'transparent';
}
```

### Why This Works

1. **Transparent background is invisible**: Setting `backgroundColor: 'transparent'` doesn't change the visual appearance
2. **Enables box rendering**: It triggers zrender's box rendering logic, which respects height/width constraints
3. **Minimal impact**: Only affects cases where height/width is explicitly set without a background
4. **Backward compatible**: Doesn't change behavior for existing code that already sets backgroundColor

## Testing

Created test file: `test/axis-label-height-without-bg.html`

The test includes three scenarios:
1. **Test 1**: axisLabel with height but NO backgroundColor (the bug case)
2. **Test 2**: axisLabel with height AND backgroundColor (for comparison)
3. **Test 3**: Long labels with height constraint to verify truncation works

### Expected Behavior After Fix

- Labels should respect the `height` property even without `backgroundColor`
- Text overflow should be properly truncated based on the height constraint
- Visual appearance should be the same whether backgroundColor is transparent or not set

## Files Modified

1. `src/label/labelStyle.ts` - Added transparent background fallback logic

## Files Added

1. `test/axis-label-height-without-bg.html` - Test cases for the fix

## Impact Assessment

- **Breaking Changes**: None
- **Performance Impact**: Negligible (only adds one conditional check)
- **Scope**: Affects all text labels where height/width is set without backgroundColor
  - Axis labels (xAxis, yAxis, radiusAxis, angleAxis, etc.)
  - Series labels
  - Any other text elements using the label style system

## Related Issues

This fix resolves GitHub issue #21504 where users reported that `axisLabel.height` had no effect unless `backgroundColor` was also specified.
