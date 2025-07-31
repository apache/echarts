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
    createHashMap,
    defaults,
    each, eqNaN, isArray, isObject, isString
} from 'zrender/src/core/util';
import Point from 'zrender/src/core/Point';
import OrdinalMeta from '../../data/OrdinalMeta';
import { NullUndefined, OrdinalNumber } from '../../util/types';
import Ordinal from '../../scale/Ordinal';
import {
    MatrixDimensionModel, MatrixDimensionCellOption, MatrixDimensionCellLooseOption,
    MatrixDimensionLevelOption,
    MatrixCoordValueOption,
} from './MatrixModel';
import { WH, XY } from '../../util/graphic';
import { ListIterator } from '../../util/model';
import { RectLike } from 'zrender/src/core/BoundingRect';
import {
    createNaNRectLike, setDimXYValue, MatrixCellLayoutInfoType
} from './matrixCoordHelper';
import { error } from '../../util/log';
import { mathMax } from '../../util/number';


export interface MatrixCellLayoutInfo {
    type: MatrixCellLayoutInfoType;
    // Represents col/row, serves as both id and locator.
    // For a `MatrixDimensionCell`:
    //  it is `setDimXYValue(new Point(), dimIdx, firstLeafLocator, level - _levels.length)`.
    //  e.g., `id[dimIdx]` is `0` or `1` or `2` or `3` if there are at most `4` leaves in the tree.
    // For a `MatrixDimensionLevelInfo`:
    //  it is `setDimXYValue(new Point(), dimIdx, 0, level - _levels.length)`
    //  e.g., `id[1 - dimIdx]` is `-3` or `-2` or `-1` if the tree has `3` levels.
    // If negative, locate to corner cells; otherwise, locate to body cells.
    id: Point;
    // By pixel. Computed left-top x (for x dimension) or y (for y dimension).
    // Used to locate.
    xy: number;
    // By pixel. Computed height (for x dimension) or width (for y dimension).
    // Used to locate.
    wh: number;
    dim: MatrixDim;
}


export type MatrixXYLocator = MatrixCellLayoutInfo['id']['x'] | MatrixCellLayoutInfo['id']['y'];
/**
 * [[xmin, xmax], [ymin, ymax]]
 * For each internal value, be NaN if invalid or out of boundary (never be null/undefined),
 * otherwise must be valid locators.
 * @see parseCoordRangeOption
 * @see resetXYLocatorRange
 */
export type MatrixXYLocatorRange = MatrixXYLocator[][] & {__brand: 'MatrixXYLocatorRange'};
/**
 * [[xmin, xmax], [ymin, ymax]], be `NullUndefined` if illegal.
 */
export type MatrixXYCellLayoutInfoRange = (MatrixCellLayoutInfo | NullUndefined)[][];

export interface MatrixDimensionCell extends MatrixCellLayoutInfo {
    // Computed col/row span. Always exists and >= 1.
    // `span[XY[dimIdx]]` is actually the leaves count of this subtree.
    span: Point;
    // Start from 0, tree depth.
    level: number;
    // It is both `MatrixXYLocator` and `OrdinalNumber` and _cell[index].
    firstLeafLocator: MatrixXYLocator;
    // Used to fatch its raw value by `matrixDim.getOrdinalMeta().category[ordinal]`,
    // or feach cell by `_cells[ordinal]`.
    // The ordinal of the leaf nodes is the same as `id.getOnDim(0)` for quick query,
    // but not the same for non-leaf nodes.
    ordinal: OrdinalNumber;
    // Normalized raw option of `matrix.x/y.data[i]`, not include any parents option.
    // Never be NullUndefined
    option: MatrixDimensionCellOption;
    // The layout rect for rendering. Available after matrix coordinate system resizing.
    rect: RectLike;
}

/**
 * Computed properties of a certain tree level.
 * In most cases this is used to describe level size or locate corner cells.
 */
export interface MatrixDimensionLevelInfo extends MatrixCellLayoutInfo {
    // The raw option of `matrix.levels[i]`
    option: MatrixDimensionLevelOption | NullUndefined;
}

export type MatrixDimPair = {
    x: MatrixDim;
    y: MatrixDim;
};

/**
 * Lifetime: the same with `MatrixModel`, but different from `coord/Matrix`.
 */
export class MatrixDim {
    // Use it to visit `cell.id` and `cell.span`
    readonly dim: 'x' | 'y';
    // Must be `0 | 1`, corresponding to 'x' | 'y'
    readonly dimIdx: number;

    // Under the current definition, every leave corresponds a unit cell,
    // and leaves can serve as the locator of cells.
    // Therefore make sure:
    //  - The first `_leavesCount` elements in `_cells` are leaves.
    //  - `_cells[leaf.id[XY[this.dimIdx]]]` is the leaf itself.
    //  - Leaves of each subtree are placed together, that is, the leaves of a dimCell are:
    //    `this._cells.slice(dimCell.firstLeafLocator, dimCell.span[XY[this.dimIdx]])`
    private _cells: MatrixDimensionCell[] = [];

    // Can be visited by `_levels[cell.level]` or `_levels[cell.id[1 - dimIdx] + _levels.length]`.
    // Items are never be null/undefined after initialized.
    private _levels: MatrixDimensionLevelInfo[] = [];

    private _leavesCount: number;

    private _model: MatrixDimensionModel;
    private _ordinalMeta: OrdinalMeta;
    // Only for uniformly parsing.
    private _scale: Ordinal;

    private _uniqueValueGen: ReturnType<typeof createUniqueValueGenerator>;

    constructor(dim: 'x' | 'y', dimModel: MatrixDimensionModel) {
        this.dim = dim;
        this.dimIdx = dim === 'x' ? 0 : 1;
        this._model = dimModel;

        this._uniqueValueGen = createUniqueValueGenerator(dim);

        let dimModelData = dimModel.get('data', true);
        if (dimModelData != null && !isArray(dimModelData)) {
            if (__DEV__) {
                error(`Illegal echarts option - matrix.${this.dim}.data must be an array if specified.`);
            }
            dimModelData = [];
        }
        if (dimModelData) {
            this._initByDimModelData(dimModelData);
        }
        else {
            this._initBySeriesData();
        }
    }

    private _initByDimModelData(dimModelData: MatrixDimensionCellLooseOption[]) {
        const self = this;
        const _cells = self._cells;
        const _levels = self._levels;
        const sameLocatorCellsLists: MatrixDimensionCell[][] = []; // Save for sorting.
        let _cellCount = 0;

        self._leavesCount = traverseInitCells(dimModelData, 0, 0);

        postInitCells();

        return;

        function traverseInitCells(
            dimModelData: MatrixDimensionCellLooseOption[] | NullUndefined,
            firstLeafLocator: number,
            level: number
        ): number {
            let totalSpan = 0;
            if (!dimModelData) {
                return totalSpan;
            }

            each(dimModelData, (option, optionIdx) => {
                let invalidOption = false;
                let cellOption: MatrixDimensionCell['option'];
                if (isString(option)) {
                    cellOption = {value: option};
                }
                else if (isObject(option)) {
                    cellOption = option;
                    if (option.value != null && !isString(option.value)) {
                        invalidOption = true;
                        cellOption = {value: null};
                    }
                }
                else {
                    cellOption = {value: null};
                    if (option != null) {
                        invalidOption = true;
                    }
                }

                if (invalidOption) {
                    if (__DEV__) {
                        error(`Illegal echarts option - matrix.${self.dim}.data[${optionIdx}]`
                            + ' must be `string | {value: string}`.'
                        );
                    }
                }

                const cell: MatrixDimensionCell = {
                    type: MatrixCellLayoutInfoType.nonLeaf, // Update to leaf later if it's a leaf.
                    ordinal: NaN, // Set it later.
                    level,
                    firstLeafLocator,
                    id: new Point(), // Set it in `_initCellsId`.
                    span: setDimXYValue(new Point(), self.dimIdx, 1, 1),
                    option: cellOption,
                    xy: NaN,
                    wh: NaN,
                    dim: self,
                    rect: createNaNRectLike(),
                };
                _cellCount++;
                (sameLocatorCellsLists[firstLeafLocator]
                    || (sameLocatorCellsLists[firstLeafLocator] = [])
                ).push(cell);

                if (!_levels[level]) {
                    // Create a level only if at least one cell exists.
                    _levels[level] = {
                        type: MatrixCellLayoutInfoType.level,
                        xy: NaN, wh: NaN, option: null, id: new Point(), dim: self
                    };
                }

                const childrenSpan = traverseInitCells(
                    cellOption.children, firstLeafLocator, level + 1
                );
                const subSpan = Math.max(1, childrenSpan);
                cell.span[XY[self.dimIdx]] = subSpan;

                totalSpan += subSpan;
                firstLeafLocator += subSpan;
            });

            return totalSpan;
        }

        function postInitCells() {
            // Sort to make sure the leaves are at the beginning, so that
            // they can be used as the locator of body cells.
            const categories: (string | NullUndefined)[] = [];
            while (_cells.length < _cellCount) {
                for (let locator = 0; locator < sameLocatorCellsLists.length; locator++) {
                    const cell = sameLocatorCellsLists[locator].pop();
                    if (cell) {
                        cell.ordinal = categories.length;
                        const val = cell.option.value;
                        categories.push(val);
                        _cells.push(cell);
                        self._uniqueValueGen.calcDupBase(val);
                    }
                }
            }
            self._uniqueValueGen.ensureValueUnique(categories, _cells);

            const ordinalMeta = self._ordinalMeta = new OrdinalMeta({
                categories: categories,
                needCollect: false,
                deduplication: false,
            });
            self._scale = new Ordinal({ordinalMeta});

            for (let idx = 0; idx < self._leavesCount; idx++) {
                const leaf = self._cells[idx];
                leaf.type = MatrixCellLayoutInfoType.leaf;
                // Handle the tree level variation: enlarge the span of the leaves to reach the body cells.
                leaf.span[XY[1 - self.dimIdx]] = self._levels.length - leaf.level;
            }

            self._initCellsId();
            self._initLevelIdOptions();
        }
    }

    private _initBySeriesData() {
        const self = this;
        self._leavesCount = 0;
        self._levels = [{
            type: MatrixCellLayoutInfoType.level,
            xy: NaN, wh: NaN, option: null, id: new Point(), dim: self
        }];
        self._initLevelIdOptions();

        const ordinalMeta = self._ordinalMeta = new OrdinalMeta({
            needCollect: true,
            deduplication: true,
            onCollect: (value: unknown, ordinalNumber: number): void => {
                const cell = self._cells[ordinalNumber] = {
                    type: MatrixCellLayoutInfoType.leaf,
                    ordinal: ordinalNumber,
                    level: 0,
                    firstLeafLocator: ordinalNumber,
                    id: new Point(), // Set it in `_initCellsId`.
                    span: setDimXYValue(new Point(), self.dimIdx, 1, 1),
                    // Theoretically `value` is from `dataset` or `series.data`, so it may be any type.
                    // Do not restrict this case for user's convenience, and here simply convert it to
                    // string for display.
                    option: {value: value + ''},
                    xy: NaN,
                    wh: NaN,
                    dim: self,
                    rect: createNaNRectLike(),
                };
                self._leavesCount++;
                self._setCellId(cell);
            },
        });
        self._scale = new Ordinal({ordinalMeta});
    }

    private _setCellId(cell: MatrixDimensionCell) {
        const levelsLen = this._levels.length;
        const dimIdx = this.dimIdx;
        setDimXYValue(cell.id, dimIdx, cell.firstLeafLocator, cell.level - levelsLen);
    }

    private _initCellsId() {
        const levelsLen = this._levels.length;
        const dimIdx = this.dimIdx;
        each(this._cells, cell => {
            setDimXYValue(cell.id, dimIdx, cell.firstLeafLocator, cell.level - levelsLen);
        });
    }

    private _initLevelIdOptions() {
        const levelsLen = this._levels.length;
        const dimIdx = this.dimIdx;
        let levelOptionList = this._model.get('levels', true);
        levelOptionList = isArray(levelOptionList) ? levelOptionList : [];

        each(this._levels, (levelCfg, level) => {
            setDimXYValue(levelCfg.id, dimIdx, 0, level - levelsLen);
            levelCfg.option = levelOptionList[level];
        });
    }

    shouldShow(): boolean {
        return !!this._model.getShallow('show', true);
    }

    /**
     * Iterate leaves (they are layout units) if dimIdx === this.dimIdx.
     * Iterate levels if dimIdx !== this.dimIdx.
     */
    resetLayoutIterator(
        it: ListIterator<MatrixCellLayoutInfo> | NullUndefined,
        dimIdx: number,
        startLocator?: MatrixXYLocator | NullUndefined,
        count?: number | NullUndefined,
    ): ListIterator<MatrixCellLayoutInfo> {
        it = it || new ListIterator<MatrixCellLayoutInfo>();
        if (dimIdx === this.dimIdx) {
            const len = this._leavesCount;
            const startIdx = startLocator != null ? Math.max(0, startLocator) : 0;
            count = count != null ? Math.min(count, len) : len;
            it.reset(this._cells, startIdx, startIdx + count);
        }
        else {
            const len = this._levels.length;
            // Corner locator is from `-this._levels.length` to `-1`.
            const startIdx = startLocator != null ? Math.max(0, startLocator + len) : 0;
            count = count != null ? Math.min(count, len) : len;
            it.reset(this._levels, startIdx, startIdx + count);
        }
        return it;
    }

    resetCellIterator(
        it?: ListIterator<MatrixDimensionCell>
    ): ListIterator<MatrixDimensionCell> {
        return (it || new ListIterator<MatrixDimensionCell>()).reset(this._cells, 0);
    }

    resetLevelIterator(
        it?: ListIterator<MatrixDimensionLevelInfo>
    ): ListIterator<MatrixDimensionLevelInfo> {
        return (it || new ListIterator<MatrixDimensionLevelInfo>()).reset(this._levels, 0);
    }

    getLayout(outRect: RectLike, dimIdx: number, locator: MatrixXYLocator): void {
        const layout = this.getUnitLayoutInfo(dimIdx, locator);
        outRect[XY[dimIdx]] = layout ? layout.xy : NaN;
        outRect[WH[dimIdx]] = layout ? layout.wh : NaN;
    }

    /**
     * Get leaf cell or get level info.
     * Should be able to return null/undefined if not found on x or y, thus input `dimIdx` is needed.
     */
    getUnitLayoutInfo(dimIdx: number, locator: MatrixXYLocator): MatrixCellLayoutInfo | NullUndefined {
        return dimIdx === this.dimIdx
            ? (locator < this._leavesCount ? this._cells[locator] : undefined)
            : this._levels[locator + this._levels.length];
    }

    /**
     * Get dimension cell by data, including leaves and non-leaves.
     */
    getCell(value: MatrixCoordValueOption): MatrixDimensionCell | NullUndefined {
        const ordinal = this._scale.parse(value);
        return eqNaN(ordinal) ? undefined : this._cells[ordinal];
    }

    /**
     * Get leaf count or get level count.
     */
    getLocatorCount(dimIdx: number): number {
        return dimIdx === this.dimIdx ? this._leavesCount : this._levels.length;
    }

    getOrdinalMeta(): OrdinalMeta {
        return this._ordinalMeta;
    }

}

function createUniqueValueGenerator(dim: 'x' | 'y') {
    const dimUpper = dim.toUpperCase();
    const defaultValReg = new RegExp(`^${dimUpper}([0-9]+)$`);
    let dupBase = 0;

    function calcDupBase(val: string | NullUndefined): void {
        let matchResult;
        if (val != null && (matchResult = val.match(defaultValReg))) {
            dupBase = mathMax(dupBase, +matchResult[1] + 1);
        }
    }

    function makeUniqueValue(): string {
        return `${dimUpper}${dupBase++}`;
    }

    // Duplicated value is allowed, because the `matrix.x/y.data` can be a tree and it's reasonable
    // that leaves in different subtrees has the same text. But only the first one is allowed to be
    // queried by the text, and the other ones can only be queried by index.
    // Additionally, `matrix.x/y.data: [null, null, ...]` is allowed.
    function ensureValueUnique(categories: (string | NullUndefined)[], cells: MatrixDimensionCell[]): void {
        // A simple way to deduplicate or handle illegal or not specified values to avoid unexpected behaviors.
        // The tree structure should not be broken even if duplicated.
        const cateMap = createHashMap<true, string>();
        for (let idx = 0; idx < categories.length; idx++) {
            let value = categories[idx];
            // value may be set to NullUndefined by users or if illegal.
            if (value == null || cateMap.get(value) != null) {
                // Still display the original option.value if duplicated, but loose the ability to query by text.
                categories[idx] = value = makeUniqueValue();
                cells[idx].option = defaults({value}, cells[idx].option);
            }
            cateMap.set(value, true);
        }
    }

    return {calcDupBase, ensureValueUnique};
}
