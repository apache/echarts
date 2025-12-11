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

import { HashMap, createHashMap, each, extend, isArray, isObject } from 'zrender/src/core/util';
import type { NullUndefined } from '../../util/types';
import type { MatrixXYLocator, MatrixDimPair, MatrixXYLocatorRange } from './MatrixDim';
import { error } from '../../util/log';
import Point from 'zrender/src/core/Point';
import { RectLike } from 'zrender/src/core/BoundingRect';
import type { MatrixBodyCornerCellOption, MatrixBodyOption, MatrixCornerOption } from './MatrixModel';
import {
    resolveXYLocatorRangeByCellMerge,
    MatrixClampOption,
    parseCoordRangeOption,
    fillIdSpanFromLocatorRange,
    createNaNRectLike,
    isXYLocatorRangeInvalidOnDim,
    resetXYLocatorRange,
    cloneXYLocatorRange,
} from './matrixCoordHelper';
import type Model from '../../model/Model';


/**
 * Key: @see `makeCellMapKey`
 */
type MatrixModelBodyCornerCellMap = HashMap<MatrixBodyCornerCell, string>;

export type MatrixBodyOrCornerKind = 'body' | 'corner';
type MatrixBodyOrCornerOption<TKind extends MatrixBodyOrCornerKind> =
    ('body' extends TKind ? MatrixBodyOption : MatrixCornerOption);

export interface MatrixBodyCornerCell {
    // Represents col/row, serves as both id and locator.
    // Actually its `x` is `xDimCell.id.x`; its `y` is `yDimCell.id.y`
    id: Point;
    // raw option in `matrix.body/corner.data[i]`.
    option: MatrixBodyCornerCellOption | NullUndefined;
    // `matrix.body/corner.data[i].coord` can locate a rect of cells (say, area).
    // `inSpanOf` refers to the top-left cell, which represents that area.
    // The top-left cell has `inSpanOf` refering to itself.
    inSpanOf: MatrixBodyCornerCell | NullUndefined;
    // If existing, it indicates cell merging, and this cell is the top-left cell
    // of the merging area.
    cellMergeOwner: boolean;
    // Exist only if `cellMergeOwner: true`.
    // In this case, it enusres that x > 1 and y > 1 and never out of boundary;
    // othewise it is null/undefined.
    span: Point | NullUndefined;
    // Exist only if `cellMergeOwner: true`.
    // Convey the same info with `id`+`span`, but be used in different calculation.
    locatorRange: MatrixXYLocatorRange | NullUndefined;
    // Exist only if `cellMergeOwner: true`.
    spanRect: RectLike | NullUndefined;
}

/**
 * Lifetime: the same with `MatrixModel`, but different from `coord/Matrix`.
 */
export class MatrixBodyCorner<TKind extends MatrixBodyOrCornerKind> {

    /**
     * Be sparse, item exists only if needed.
     */
    private _cellMap: MatrixModelBodyCornerCellMap | NullUndefined;
    private _cellMergeOwnerList: MatrixBodyCornerCell[];

    private _model: Model<MatrixBodyOrCornerOption<TKind>>;
    private _dims: MatrixDimPair;
    private _kind: TKind;

    constructor(
        kind: TKind,
        bodyOrCornerModel: Model<MatrixBodyOrCornerOption<TKind>>,
        dims: MatrixDimPair
    ) {
        this._model = bodyOrCornerModel;
        this._dims = dims;
        this._kind = kind;
        this._cellMergeOwnerList = [];
    }

    /**
     * Can not be called before series models initialization finished, since the ordinalMeta may
     * use collect the values from `series.data` in series initialization.
     */
    private _ensureCellMap(): MatrixModelBodyCornerCellMap {
        const self = this;

        let _cellMap = self._cellMap;
        if (!_cellMap) {
            _cellMap = self._cellMap = createHashMap();
            fillCellMap();
        }
        return _cellMap;

        function fillCellMap(): void {
            type TmpParsed = {
                id: Point;
                span: Point;
                locatorRange: MatrixXYLocatorRange;
                option: MatrixBodyCornerCellOption;
                cellMergeOwner: boolean;
            };
            const parsedList: TmpParsed[] = [];

            let cellOptionList = self._model.getShallow('data');
            if (cellOptionList && !isArray(cellOptionList)) {
                if (__DEV__) {
                    error(`matrix.${cellOptionList}.data must be an array if specified.`);
                }
                cellOptionList = null;
            }
            each(cellOptionList, (option, idx) => {
                if (!isObject(option) || !isArray(option.coord)) {
                    if (__DEV__) {
                        error(`Illegal matrix.${self._kind}.data[${idx}], must be a {coord: [...], ...}`);
                    }
                    return;
                }

                const locatorRange = resetXYLocatorRange([]);
                let reasonArr: string[] | NullUndefined = null;
                if (__DEV__) {
                    reasonArr = [];
                }
                parseCoordRangeOption(
                    locatorRange, reasonArr, option.coord, self._dims,
                    option.coordClamp ? MatrixClampOption[self._kind] : MatrixClampOption.none
                );
                if (isXYLocatorRangeInvalidOnDim(locatorRange, 0) || isXYLocatorRangeInvalidOnDim(locatorRange, 1)) {
                    if (__DEV__) {
                        error(`Can not determine cells by option matrix.${self._kind}.data[${idx}]: `
                            + `${reasonArr.join(' ')}`
                        );
                    }
                    return;
                }

                const cellMergeOwner = option && option.mergeCells;
                const parsed: TmpParsed = {id: new Point(), span: new Point(), locatorRange, option, cellMergeOwner};
                fillIdSpanFromLocatorRange(parsed, locatorRange);

                // The order of the `parsedList` determines the precedence of the styles, if there
                // are overlaps between ranges specified in different items. Preserve the original
                // order of `matrix.body/corner/data` to make it predictable for users.
                parsedList.push(parsed);
            });

            // Resolve cell merging intersection - union to a larger rect.
            const mergedMarkList: boolean[] = [];
            for (let parsedIdx = 0; parsedIdx < parsedList.length; parsedIdx++) {
                const parsed = parsedList[parsedIdx];
                if (!parsed.cellMergeOwner) {
                    continue;
                }
                const locatorRange = parsed.locatorRange;
                resolveXYLocatorRangeByCellMerge(locatorRange, mergedMarkList, parsedList, parsedIdx);
                for (let idx = 0; idx < parsedIdx; idx++) {
                    if (mergedMarkList[idx]) {
                        parsedList[idx].cellMergeOwner = false;
                    }
                }
                if (locatorRange[0][0] !== parsed.id.x || locatorRange[1][0] !== parsed.id.y) {
                    // The top-left cell of the unioned locatorRange is not this cell any more.
                    parsed.cellMergeOwner = false;
                    // Reconcile: simply use the last style and value option if multiple styles involved
                    // in a merged area, since there might be no commonly used merge strategy.
                    const newOption = extend({} as MatrixBodyCornerCellOption, parsed.option);
                    newOption.coord = null;
                    const newParsed: TmpParsed = {
                        id: new Point(),
                        span: new Point(),
                        locatorRange,
                        option: newOption,
                        cellMergeOwner: true
                    };
                    fillIdSpanFromLocatorRange(newParsed, locatorRange);
                    parsedList.push(newParsed);
                }
            }

            // Assign options to cells.
            each(parsedList, parsed => {
                const topLeftCell = ensureBodyOrCornerCell(parsed.id.x, parsed.id.y);
                if (parsed.cellMergeOwner) {
                    topLeftCell.cellMergeOwner = true;
                    topLeftCell.span = parsed.span;
                    topLeftCell.locatorRange = parsed.locatorRange;
                    topLeftCell.spanRect = createNaNRectLike();
                    self._cellMergeOwnerList.push(topLeftCell);
                }
                if (!parsed.cellMergeOwner && !parsed.option) {
                    return;
                }
                for (let yidx = 0; yidx < parsed.span.y; yidx++) {
                    for (let xidx = 0; xidx < parsed.span.x; xidx++) {
                        const cell = ensureBodyOrCornerCell(parsed.id.x + xidx, parsed.id.y + yidx);
                        // If multiple style options are defined on a cell, the later ones takes precedence.
                        cell.option = parsed.option;
                        if (parsed.cellMergeOwner) {
                            cell.inSpanOf = topLeftCell;
                        }
                    }
                }
            });
        } // End of fillCellMap

        function ensureBodyOrCornerCell(x: MatrixXYLocator, y: MatrixXYLocator): MatrixBodyCornerCell {
            const key = makeCellMapKey(x, y);
            let cell = _cellMap.get(key);
            if (!cell) {
                cell = _cellMap.set(key, {
                    id: new Point(x, y),
                    option: null,
                    inSpanOf: null,
                    span: null,
                    spanRect: null,
                    locatorRange: null,
                    cellMergeOwner: false,
                });
            }
            return cell;
        }
    }

    /**
     * Body cells or corner cell are not commonly defined specifically, especially in a large
     * table, thus his is a sparse data structure - bodys or corner cells exist only if there
     * are options specified to it (in `matrix.body.data` or `matrix.corner.data`);
     * otherwise, return `NullUndefined`.
     */
    getCell(xy: MatrixXYLocator[]): MatrixBodyCornerCell | NullUndefined {
        // Assert xy do not contain NaN
        return this._ensureCellMap().get(makeCellMapKey(xy[0], xy[1]));
    }

    /**
     * Only cell existing (has specific definition or props) will be travelled.
     */
    travelExistingCells(cb: (cell: MatrixBodyCornerCell) => void): void {
        this._ensureCellMap().each(cb);
    }

    /**
     * @param locatorRange Must be the return of `parseCoordRangeOption`.
     */
    expandRangeByCellMerge(locatorRange: MatrixXYLocatorRange): void {
        if (
            !isXYLocatorRangeInvalidOnDim(locatorRange, 0)
            && !isXYLocatorRangeInvalidOnDim(locatorRange, 1)
            && locatorRange[0][0] === locatorRange[0][1]
            && locatorRange[1][0] === locatorRange[1][1]
        ) {
            // If it locates to a single cell, use this quick path to avoid travelling.
            // It is based on the fact that any cell is not contained by more than one cell merging rect.
            _tmpERBCMLocator[0] = locatorRange[0][0];
            _tmpERBCMLocator[1] = locatorRange[1][0];
            const cell = this.getCell(_tmpERBCMLocator);
            const inSpanOf = cell && cell.inSpanOf;
            if (inSpanOf) {
                cloneXYLocatorRange(locatorRange, inSpanOf.locatorRange);
                return;
            }
        }

        const list = this._cellMergeOwnerList;
        resolveXYLocatorRangeByCellMerge(locatorRange, null, list, list.length);
    }

}
const _tmpERBCMLocator: MatrixXYLocator[] = [];

function makeCellMapKey(x: MatrixXYLocator, y: MatrixXYLocator): string {
    return `${x}|${y}`;
}
