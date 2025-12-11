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

import Point from 'zrender/src/core/Point';
import type {
    MatrixCellLayoutInfo,
    MatrixDimensionCell,
    MatrixDimPair,
    MatrixXYLocator,
    MatrixXYLocatorRange,
} from './MatrixDim';
import type { NullUndefined } from '../../util/types';
import { eqNaN, isArray, isNumber } from 'zrender/src/core/util';
import { WH, XY } from '../../util/graphic';
import type { MatrixCoordRangeOption, MatrixCoordValueOption } from './MatrixModel';
import type { RectLike } from 'zrender/src/core/BoundingRect';
import { mathMax, mathMin } from '../../util/number';

export const MatrixCellLayoutInfoType = {
    level: 1,
    leaf: 2,
    nonLeaf: 3,
} as const;
export type MatrixCellLayoutInfoType = (typeof MatrixCellLayoutInfoType)[keyof typeof MatrixCellLayoutInfoType];

/**
 * @public Public to users in `chart.convertFromPixel`.
 */
export const MatrixClampOption = {
    // No clamp, be falsy, equals to null/undefined. It means if the input part is
    // null/undefined/NaN/outOfBoundary, the result part is NaN, rather than clamp to
    // the boundary of the matrix.
    none: 0,
    // Clamp, where null/undefined/NaN/outOfBoundary can be used to cover the entire row/column.
    all: 1,
    body: 2,
    corner: 3,
};
export type MatrixClampOption = (typeof MatrixClampOption)[keyof typeof MatrixClampOption];

/**
 * For the x direction,
 *  - find dimension cell from `xMatrixDim`,
 *      - If `xDimCell` or `yDimCell` is not a leaf, return the non-leaf cell itself.
 *  - otherwise find level from `yMatrixDim`.
 *  - otherwise return `NullUndefined`.
 *
 * For the y direction, it's the opposite.
 */
export function coordDataToAllCellLevelLayout(
    coordValue: MatrixCoordValueOption,
    dims: MatrixDimPair,
    thisDimIdx: number // 0 | 1
): MatrixCellLayoutInfo | NullUndefined {
    // Find in body.
    let result: MatrixCellLayoutInfo | NullUndefined = dims[XY[thisDimIdx]].getCell(coordValue);
    // Find in corner or dimension area.
    if (!result && isNumber(coordValue) && coordValue < 0) {
        result = dims[XY[1 - thisDimIdx]].getUnitLayoutInfo(thisDimIdx, Math.round(coordValue));
    }
    return result;
}

export function resetXYLocatorRange(out: unknown[] | NullUndefined): MatrixXYLocatorRange {
    const rg = (out || []) as MatrixXYLocatorRange;
    rg[0] = rg[0] || [];
    rg[1] = rg[1] || [];
    rg[0][0] = rg[0][1] = rg[1][0] = rg[1][1] = NaN;
    return rg;
}

/**
 * If illegal or out of boundary, set NaN to `locOut`. See `isXYLocatorRangeInvalidOnDim`.
 * x dimension and y dimension are calculated separately.
 */
export function parseCoordRangeOption(
    locOut: MatrixXYLocatorRange,
    // If illegal input or can not find any target, save reason to it.
    // Do nothing if `NullUndefined`.
    reasonOut: string[] | NullUndefined,
    data: MatrixCoordRangeOption[],
    dims: MatrixDimPair,
    clamp: MatrixClampOption,
): void {
    // x and y are supported to be handled separately - if one dimension is invalid
    // (may be users do not need that), the other one should also be calculated.
    parseCoordRangeOptionOnOneDim(locOut[0], reasonOut, clamp, data, dims, 0);
    parseCoordRangeOptionOnOneDim(locOut[1], reasonOut, clamp, data, dims, 1);
}

function parseCoordRangeOptionOnOneDim(
    locDimOut: MatrixXYLocatorRange[number],
    reasonOut: string[] | NullUndefined,
    clamp: MatrixClampOption,
    data: MatrixCoordRangeOption[],
    dims: MatrixDimPair,
    dimIdx: number,
): void {
    locDimOut[0] = Infinity;
    locDimOut[1] = -Infinity;

    const dataOnDim = data[dimIdx];
    const coordValArr = isArray(dataOnDim) ? dataOnDim : [dataOnDim];
    const len = coordValArr.length;
    const hasClamp = !!clamp;

    if (len >= 1) {
        parseCoordRangeOptionOnOneDimOnePart(
            locDimOut, reasonOut, coordValArr, hasClamp, dims, dimIdx, 0
        );
        if (len > 1) {
            // Users may intuitively input the coords like `[[x1, x2, x3], ...]`;
            // consider the range as `[x1, x3]` in this case.
            parseCoordRangeOptionOnOneDimOnePart(
                locDimOut, reasonOut, coordValArr, hasClamp, dims, dimIdx, len - 1
            );
        }
    }
    else {
        if (__DEV__) {
            if (reasonOut) {
                reasonOut.push('Should be like [["x1", "x2"], ["y1", "y2"]], or ["x1", "y1"], rather than empty.');
            }
        }
        locDimOut[0] = locDimOut[1] = NaN;
    }

    if (hasClamp) {
        // null/undefined/NaN or illegal data represents the entire row/column;
        // Cover the entire locator regardless of body or corner, and confine it later.
        let locLowerBound = -dims[XY[1 - dimIdx]].getLocatorCount(dimIdx);
        let locUpperBound = dims[XY[dimIdx]].getLocatorCount(dimIdx) - 1;

        if (clamp === MatrixClampOption.body) {
            locLowerBound = mathMax(0, locLowerBound);
        }
        else if (clamp === MatrixClampOption.corner) {
            locUpperBound = mathMin(-1, locUpperBound);
        }

        if (locUpperBound < locLowerBound) { // Also considered that both x and y has no cell.
            locLowerBound = locUpperBound = NaN;
        }

        if (eqNaN(locDimOut[0])) {
            locDimOut[0] = locLowerBound;
        }
        if (eqNaN(locDimOut[1])) {
            locDimOut[1] = locUpperBound;
        }
        locDimOut[0] = mathMax(mathMin(locDimOut[0], locUpperBound), locLowerBound);
        locDimOut[1] = mathMax(mathMin(locDimOut[1], locUpperBound), locLowerBound);
    }
}

// The return val must be finite or NaN.
function parseCoordRangeOptionOnOneDimOnePart(
    locDimOut: MatrixXYLocatorRange[number],
    reasonOut: string[] | NullUndefined,
    coordValArr: MatrixCoordValueOption[],
    hasClamp: boolean,
    dims: MatrixDimPair,
    dimIdx: number,
    partIdx: number,
): void {
    const layout = coordDataToAllCellLevelLayout(coordValArr[partIdx], dims, dimIdx);
    if (!layout) {
        if (__DEV__) {
            if (!hasClamp && reasonOut) {
                reasonOut.push(`Can not find cell by coord[${dimIdx}][${partIdx}].`);
            }
        }
        locDimOut[0] = locDimOut[1] = NaN;
        return;
    }
    const locatorA = layout.id[XY[dimIdx]];
    let locatorB = locatorA;
    const dimCell = cellLayoutInfoToDimCell(layout);
    if (dimCell) { // Handle non-leaf
        locatorB += dimCell.span[XY[dimIdx]] - 1;
    }
    locDimOut[0] = mathMin(locDimOut[0], locatorA, locatorB);
    locDimOut[1] = mathMax(locDimOut[1], locatorA, locatorB);
}

/**
 * @param locatorRange Must be the return of `parseCoordRangeOption`,
 *  where if not NaN, it must be a valid locator.
 */
export function isXYLocatorRangeInvalidOnDim(
    locatorRange: MatrixXYLocatorRange, dimIdx: number
): boolean {
    return eqNaN(locatorRange[dimIdx][0]) || eqNaN(locatorRange[dimIdx][1]);
}

// `locatorRange` will be expanded (modified) if an intersection is encountered.
export function resolveXYLocatorRangeByCellMerge(
    inOutLocatorRange: MatrixXYLocatorRange,
    // Item indices coorespond to mergeDefList (len: mergeDefListTravelLen).
    // Indicating whether each item has be merged into the `locatorRange`
    outMergedMarkList: boolean[] | NullUndefined,
    mergeDefList: {
        locatorRange: MatrixXYLocatorRange | NullUndefined;
        cellMergeOwner: boolean;
    }[],
    mergeDefListTravelLen: number,
): void {
    outMergedMarkList = outMergedMarkList || _tmpOutMergedMarkList;
    for (let idx = 0; idx < mergeDefListTravelLen; idx++) {
        outMergedMarkList[idx] = false;
    }
    // In most case, cell merging definition list length is smaller than the range extent,
    // therefore, to detection intersection, travelling cell merging definition list is probably
    // performant than traveling the four edges of the rect formed by the locator range.
    while (true) {
        let expanded = false;
        for (let idx = 0; idx < mergeDefListTravelLen; idx++) {
            const mergeDef = mergeDefList[idx];
            if (!outMergedMarkList[idx]
                && mergeDef.cellMergeOwner
                && expandXYLocatorRangeIfIntersect(inOutLocatorRange, mergeDef.locatorRange)
            ) {
                outMergedMarkList[idx] = true;
                expanded = true;
            }
        }
        if (!expanded) {
            break;
        }
    }
}
const _tmpOutMergedMarkList: boolean[] = [];

// Return whether intersect.
// `thisLocRange` will be expanded (modified) if an intersection is encountered.
function expandXYLocatorRangeIfIntersect(
    thisLocRange: MatrixXYLocatorRange,
    otherLocRange: MatrixXYLocatorRange
): boolean {
    if (!locatorRangeIntersectOneDim(thisLocRange[0], otherLocRange[0])
        || !locatorRangeIntersectOneDim(thisLocRange[1], otherLocRange[1])
    ) {
        return false;
    }

    thisLocRange[0][0] = mathMin(thisLocRange[0][0], otherLocRange[0][0]);
    thisLocRange[0][1] = mathMax(thisLocRange[0][1], otherLocRange[0][1]);
    thisLocRange[1][0] = mathMin(thisLocRange[1][0], otherLocRange[1][0]);
    thisLocRange[1][1] = mathMax(thisLocRange[1][1], otherLocRange[1][1]);

    return true;
}

// Notice: If containing NaN, not intersect.
function locatorRangeIntersectOneDim(
    locRange1OneDim: MatrixXYLocatorRange[number],
    locRange2OneDim: MatrixXYLocatorRange[number],
): boolean {
    return (
        locRange1OneDim[1] >= locRange2OneDim[0]
        && locRange1OneDim[0] <= locRange2OneDim[1]
    );
}

export function fillIdSpanFromLocatorRange(
    owner: {id: Point; span: Point;},
    locatorRange: MatrixXYLocatorRange
): void {
    owner.id.set(locatorRange[0][0], locatorRange[1][0]);
    owner.span.set(locatorRange[0][1] - owner.id.x + 1, locatorRange[1][1] - owner.id.y + 1);
}

export function cloneXYLocatorRange(
    target: MatrixXYLocatorRange,
    source: MatrixXYLocatorRange
): void {
    target[0][0] = source[0][0];
    target[0][1] = source[0][1];
    target[1][0] = source[1][0];
    target[1][1] = source[1][1];
}

/**
 * If illegal, the corresponding x/y/width/height is set to `NaN`.
 * `x/width` or `y/height` is supported to be calculated separately,
 * i.e., one side are NaN, the other side are normal.
 * @param oneDimOut only write to `x/width` or `y/height`, depending on `dimIdx`.
 */
export function xyLocatorRangeToRectOneDim(
    oneDimOut: RectLike,
    locRange: MatrixXYLocatorRange,
    dims: MatrixDimPair,
    dimIdx: number
) {
    const layoutMin = coordDataToAllCellLevelLayout(locRange[dimIdx][0], dims, dimIdx);
    const layoutMax = coordDataToAllCellLevelLayout(locRange[dimIdx][1], dims, dimIdx);

    oneDimOut[XY[dimIdx]] = oneDimOut[WH[dimIdx]] = NaN;

    if (layoutMin && layoutMax) {
        oneDimOut[XY[dimIdx]] = layoutMin.xy;
        oneDimOut[WH[dimIdx]] = layoutMax.xy + layoutMax.wh - layoutMin.xy;
    }
}

// No need currently, since `span` is not allowed to be defined directly by users.
// /**
//  * If either span x or y is valid and > 1, return parsed span, otherwise return `NullUndefined`.
//  */
// export function parseSpanOption(
//     spanOptionHost: MatrixCellSpanOptionHost,
//     dimCellPair: MatrixCellLayoutInfo[]
// ): Point | NullUndefined {
//     const spanX = parseSpanOnDim(spanOptionHost.spanX, dimCellPair[0], 0);
//     const spanY = parseSpanOnDim(spanOptionHost.spanY, dimCellPair[1], 1);
//     if (!eqNaN(spanX) || !eqNaN(spanY)) {
//         return new Point(spanX || 1, spanY || 1);
//     }
//     function parseSpanOnDim(spanOption: unknown, dimCell: MatrixCellLayoutInfo, dimIdx: number): number {
//         if (!isNumber(spanOption)) {
//             return NaN;
//         }
//         // Ensure positive integer (not NaN) to avoid dead loop.
//         const span = mathMax(1, Math.round(spanOption || 1)) || 1;
//         // Clamp, and consider may also be specified as `Infinity` to span the entire col/row.
//         return mathMin(span, mathMax(1, dimCell.dim.getLocatorCount(dimIdx) - dimCell.id[XY[dimIdx]]));
//     }
// }

/**
 * @usage To get/set on dimension, use:
 *  `xyVal[XY[dim]] = val;` // set on this dimension.
 *  `xyVal[XY[1 - dim]] = val;` // set on the perpendicular dimension.
 */
export function setDimXYValue(
    out: Point,
    dimIdx: number, // 0 | 1
    valueOnThisDim: MatrixXYLocator,
    valueOnOtherDim: MatrixXYLocator
): Point {
    out[XY[dimIdx]] = valueOnThisDim;
    out[XY[1 - dimIdx]] = valueOnOtherDim;
    return out;
}

/**
 * Return NullUndefined if not dimension cell.
 */
function cellLayoutInfoToDimCell(
    cellLayoutInfo: MatrixCellLayoutInfo | NullUndefined
): MatrixDimensionCell | NullUndefined {
    return (
        cellLayoutInfo && (
            cellLayoutInfo.type === MatrixCellLayoutInfoType.leaf
            || cellLayoutInfo.type === MatrixCellLayoutInfoType.nonLeaf
        )
    ) ? (cellLayoutInfo as MatrixDimensionCell) : null;
}

export function createNaNRectLike(): RectLike {
    return {x: NaN, y: NaN, width: NaN, height: NaN};
}
