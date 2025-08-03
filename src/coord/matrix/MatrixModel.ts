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

import OrdinalMeta from '../../data/OrdinalMeta';
import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import {
    BoxLayoutOptionMixin, CommonTooltipOption, ComponentOption, ItemStyleOption, LabelOption,
    LineStyleOption,
    NullUndefined, OrdinalNumber, OrdinalRawValue,
    PositionSizeOption
} from '../../util/types';
import Matrix from './Matrix';
import { MatrixDim, MatrixXYLocator } from './MatrixDim';
import { MatrixBodyCorner } from './MatrixBodyCorner';
import { CoordinateSystemHostModel } from '../CoordinateSystem';
import tokens from '../../visual/tokens';


export interface MatrixOption extends ComponentOption, BoxLayoutOptionMixin {
    mainType?: 'matrix';
    x?: MatrixDimensionOption;
    y?: MatrixDimensionOption;
    body?: MatrixBodyOption;
    corner?: MatrixCornerOption;
    // Only for the matrix overall style, won't be inherited by x/y/coner/body.
    backgroundStyle?: ItemStyleOption;
    // Used on the outer border and the divider line.
    borderZ2?: number;
    tooltip?: CommonTooltipOption<MatrixTooltipFormatterParams>;

    // PENDING: do we need to support other states, i.e., `emphasis`, `blur`, `select`?
}

interface MatrixBodyCornerBaseOption extends MatrixCellStyleOption {
    /**
     * Only specify some special cell definitions.
     * It can represent both body cells and top-left corner cells.
     *
     * [body/corner cell locating]:
     *  The rule is uniformly applied, such as, in `matrix.dataToPoint`
     *  and `matrix.dataToLayout` and `xxxComponent.coord`.
     *  Suppose the matrix.x/y dimensions (header) are defined as:
     *  matrix: {
     *      x: [{ value: 'Xa0', children: ['Xb0', 'Xb1'] }, 'Xa1'],
     *      y: [{ value: 'Ya0', children: ['Yb0', 'Yb1'] }],
     *  }
     *  -----------------------------------------
     *  |       |       |     Xa0       |       |
     *  |-------+-------+---------------|  Xa1  |
     *  |cornerQ|cornerP|  Xb0  |  Xb1  |       |
     *  |-------+-------+-------+-------+--------
     *  |       |  Yb0  | bodyR | bodyS |       |
     *  |  Ya0  |-------+-------+---------------|
     *  |       |  Yb1  |       |     bodyT     |
     *  |---------------|------------------------
     *  "Locator number" (`MatrixXYLocator`):
     *    The term `locator` refers to a integer number to locate cells on x or y direction.
     *    Use the top-left cell of the body as the origin point (0, 0),
     *      the non-negative locator indicates the right/bottom of the origin point;
     *      the negative locator indicates the left/top of the origin point.
     *  "Ordinal number" (`OrdinalNumber`):
     *    This term follows the same meaning as that in category axis of cartesian. They are
     *    non-negative integer, designating each string `matrix.x.data[i].value`/`matrix.y.data[i].value`.
     *    'Xb0', 'Xb2', 'Xa1', 'Xa0' are assigned with the ordinal numbers 0, 1, 2, 3.
     *    For every leaf dimension cell, `OrdinalNumber` and `MatrixXYLocator` is the same.
     *
     *  A cell or pixel point or rect can be determined/located by a pair of `MatrixCoordValueOption`.
     *  See also `MatrixBodyCornerCellOption['coord']`.
     *
     *  - The body cell `bodyS` above can be located by:
     *      - `coord: [1, 0]` (`MatrixXYLocator` or `OrdinalNumber`, which is a non-negative integer)
     *      - `coord: ['Xb1', 'Yb0']`
     *      - `coord: ['Xb1', 0]` (mix them)
     *  - The corner cell `cornerQ` above can be located by:
     *      - `coord: [-2, -1]` (negative `MatrixXYLocator`)
     *      - But it is NOT supported to use `coord: ['Y1_0', 'X1_0']` (XY transposed form) here.
     *        It's mathematically sound, but may introduce confusion and unnecessary
     *        complexity (consider the 'Xa1' case), and corner locating is not frequently used.
     *  - `mergeCells`: Body cells or corner cells can be merged, such as "bodyT" above, an input
     *      - The merging can be defined by:
     *        `matrix.data[i]: {coord: [['Xb1', 'Xa1'], 'Yb0'], mergeCells: true}`.
     *      - Input `['Xa1', 'Yb1']` to `dataToPoint` will get a point in the center of "bodyT".
     *      - Input `['Xa1', 'Yb1']` to `dataToLayout` will get a rect of the "bodyT".
     *  - If inputing a non-leaf dimension cell to locate, such as `['Xa0', 'Yb0']`,
     *      - it returns only according to the center of the dimension cells, regardless of the body span.
     *        (therefore, the result can be on the boundary of two body cells.)
     *        And the oridinal number assigned to 'Xa0' is 3, thus input `[3, 'Yb0']` get the some result.
     *  - The dimension (header) cell can be located by negative `MatrixXYLocator`. For example:
     *      - The center of the node 'Ya0' can be located by `[-2, 'Ya0']`.
     */
    data?: MatrixBodyCornerCellOption[];
}
export interface MatrixBodyOption extends MatrixBodyCornerBaseOption {
}
export interface MatrixCornerOption extends MatrixBodyCornerBaseOption {
}

/**
 * Commonly used as `MatrixCoordRangeOption[]`
 * Can locate a cell or a rect range of cells.
 * `[2, 8]` indicates a cell.
 * `[2, null/undefined/NaN]` means y is not relevant.
 * `[null/undefined/NaN, 8]` means x is not relevant.
 * `[[2, 5], 8]` indicates a rect of cells in x range of `2~5` and y `8`.
 * `[[2, 5], null/undefined/NaN]` indicates a x range of `2~5` and y is not relevant.
 * `[[2, 5], [7, 8]]` indicates a rect of cells in x range of `2~5` and y range of `7~8`.
 * `['aNonLeaf', 8]` indicates a rect of cells in x range of `aNonLeaf` and y `8`.
 * @see {parseCoordRangeOption}
 * @see {MatrixBodyCornerBaseOption['data']}
 */
export type MatrixCoordRangeOption = (MatrixCoordValueOption | MatrixCoordValueOption[] | NullUndefined);
/**
 * `OrdinalRawValue` is originally provided by `matrix.x/y.data[i].value` or `series.data`.
 */
export type MatrixCoordValueOption = OrdinalRawValue | OrdinalNumber | MatrixXYLocator;


export interface MatrixBaseCellOption extends MatrixCellStyleOption {
}

export interface MatrixBodyCornerCellOption extends MatrixBaseCellOption {
    // Text that can be displayed.
    value?: string;
    // Use it to reference a coord in matrix.
    coord?: MatrixCoordRangeOption[];
    // If true, null/undefined/NaN/invalid_coord_part in `coord` means the entire column/row.
    // `false` by default, because:
    //  - Pros:
    //    - If the `coord` is incorrect and unintentional, the entire column/row will be referred,
    //      and no error message.
    //    - Inconsistent with `dataToLayout`, which is no clamp by default.
    //  - Cons:
    //    - `coord: ['x1', null]` or `coord: ['x1', ['y1', 'y999_may_out_of_range']]` is supported
    //      to refer to a entire column, which brings convenience to users and may intuitive.
    coordClamp?: boolean;
    // Merge cells determined by `coord`.
    mergeCells?: boolean;
}

interface MatrixDimensionOption extends MatrixCellStyleOption, MatrixDimensionLevelOption {
    type?: 'category'; // For internal usage; force be 'category'.
    show?: boolean;
    data?: MatrixDimensionCellLooseOption[];
    // `levels[0]`: the topmost (for x dimension) or leftmost (for y dimension) level.
    // If not specified, use null/undefined, such as `levels: [null, null, {levelSize: 10}]`
    levels?: (MatrixDimensionLevelOption | NullUndefined)[];
    dividerLineStyle?: LineStyleOption;
}

export interface MatrixDimensionCellOption extends MatrixBaseCellOption {
    // Use it to define a coord in matrix.
    // Do not use type `OrdinalRawValue` here. Number input is forbiden due to the possible confusion.
    // e.g., if `matrix.x.data: [1, 2, 3]` is allowed, then querying `coord: [1, null]` will actually get
    // the second column, since number represents the index (i.e. `MatrixXYLocator` or `OrdinalNumber`).
    value?: string | NullUndefined;
    // column width (for x dimension) or row height (for y dimension).
    // If not specified (null/undefined), auto calculate it.
    // Only available on leaves, to avoid unnecessary complex.
    // If it is a percentage, such as '30%', based on the matrix width/height, rather than the canvas size.
    size?: PositionSizeOption;
    children?: MatrixDimensionCellOption[];
}
export type MatrixDimensionCellLooseOption = MatrixDimensionCellOption | MatrixDimensionCellOption['value'];

export interface MatrixDimensionLevelOption {
    // `matrix.levelSize` specifies the default size of every tree levels.
    // `matrix.levels[i].levelSize` specifies the size of a certain level.
    // For x dimension, that is height; for y dimension, that is width.
    // If not specified (null/undefined), auto calculate it.
    // If it is a percentage, such as '30%', based on the matrix width/height, rather than the canvas size.
    levelSize?: PositionSizeOption;
    // Other level specific options may added if needed, such as border-bottom/right style.
}

export interface MatrixDimensionModel extends Model<MatrixDimensionOption> {
}

/**
 * Two levels of cascade inheritance:
 *  - priority-high: style options defined in `matrix.x/y/coner/body.data[i]` (in cell)
 *  - priority-low: style options defined in `matrix.x/y/coner/body`
 */
export interface MatrixCellStyleOption {
    // [NOTE - padding]:
    //  - Consider the option for the space between cell boundary to text, percentage value for
    //    `label.width/height` is not supported, because it is not ideal - the padding would vary
    //    with the cell size, making the layout inconsistent.
    //  - The inner text padding uses `lable.style.padding`.
    //    The text truncation rect is obtained by cell rect minus by padding.
    //  - The inner series / other coord sys padding is not supported, to avoid necessary complexity.
    //    Consider some series, such as heatmap, prefer no padding.
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    cursor?: string;
    // By default, auto decide whether to be silent, considering tooltip.
    silent?: boolean | NullUndefined;
    // Used when style conflict - especially for thick border style.
    z2?: number;
}

export interface MatrixTooltipFormatterParams {
    componentType: 'matrix'
    matrixIndex: number
    name: string
    $vars: ['name', 'xyLocator']
}

const defaultLabelOption: LabelOption = {
    show: true,
    color: tokens.color.secondary,
    // overflow: 'truncate',
    overflow: 'break',
    lineOverflow: 'truncate',
    padding: [2, 3, 2, 3],
    // Prefer to use `padding`, rather than distance.
    distance: 0,
};
function makeDefaultCellItemStyleOption(isCorner: boolean) {
    return {
        color: 'none',
        borderWidth: 1,
        borderColor: isCorner ? 'none' : tokens.color.borderTint,
    };
};
const defaultDimOption: MatrixDimensionOption = {
    show: true,
    label: defaultLabelOption,
    itemStyle: makeDefaultCellItemStyleOption(false),
    silent: undefined,
    dividerLineStyle: {
        width: 1,
        color: tokens.color.border,
    },
};
const defaultBodyOption: MatrixBodyOption = {
    label: defaultLabelOption,
    itemStyle: makeDefaultCellItemStyleOption(false),
    silent: undefined,
};
const defaultCornerOption: MatrixCornerOption = {
    label: defaultLabelOption,
    itemStyle: makeDefaultCellItemStyleOption(true),
    silent: undefined,
};
const defaultMatrixOption: MatrixOption = {
    // As a most basic coord sys, `z` should be lower than
    // other series and coord sys, such as, grid.
    z: -50,
    left: '10%',
    top: '10%',
    right: '10%',
    bottom: '10%',
    x: defaultDimOption,
    y: defaultDimOption,
    body: defaultBodyOption,
    corner: defaultCornerOption,
    backgroundStyle: {
        color: 'none',
        borderColor: tokens.color.axisLine,
        borderWidth: 1,
    },
};


class MatrixModel extends ComponentModel<MatrixOption> implements CoordinateSystemHostModel {
    static type = 'matrix';
    type = MatrixModel.type;

    coordinateSystem: Matrix;

    static layoutMode = 'box' as const;

    private _dimModels: {
        x: MatrixDimensionModel;
        y: MatrixDimensionModel;
    };

    private _body: MatrixBodyCorner<'body'>;
    private _corner: MatrixBodyCorner<'corner'>;

    static defaultOption: MatrixOption = defaultMatrixOption;

    optionUpdated(): void {
        // Simply re-create all to follow model changes.

        const dimModels = this._dimModels = {
            // Do not use matrixModel as the parent model, for preventing from cascade-fetching options to it.
            x: new MatrixDimensionModel(this.get('x', true) || {}),
            y: new MatrixDimensionModel(this.get('y', true) || {}),
        };

        dimModels.x.option.type = dimModels.y.option.type = 'category';
        const xDim = dimModels.x.dim = new MatrixDim('x', dimModels.x);
        const yDim = dimModels.y.dim = new MatrixDim('y', dimModels.y);

        const dims = {x: xDim, y: yDim};
        this._body = new MatrixBodyCorner(
            'body', new Model(this.getShallow('body')), dims
        );
        this._corner = new MatrixBodyCorner(
            'corner', new Model(this.getShallow('corner')), dims
        );
    }

    getDimensionModel(dim: 'x' | 'y'): MatrixDimensionModel {
        return this._dimModels[dim];
    }

    getBody(): MatrixBodyCorner<'body'> {
        return this._body;
    }

    getCorner(): MatrixBodyCorner<'corner'> {
        return this._corner;
    }

}

export class MatrixDimensionModel extends Model<MatrixDimensionOption> {
    dim: MatrixDim;
    getOrdinalMeta(): OrdinalMeta {
        return this.dim.getOrdinalMeta();
    }
}

export default MatrixModel;
