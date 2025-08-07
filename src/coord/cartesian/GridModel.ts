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


import ComponentModel from '../../model/Component';
import {
    ComponentOption, BoxLayoutOptionMixin, ZRColor, ShadowOptionMixin, NullUndefined,
    ComponentOnCalendarOptionMixin, ComponentOnMatrixOptionMixin
} from '../../util/types';
import Grid from './Grid';
import { CoordinateSystemHostModel } from '../CoordinateSystem';
import type GlobalModel from '../../model/Global';
import { getLayoutParams, mergeLayoutParam } from '../../util/layout';
import tokens from '../../visual/tokens';

// For backward compatibility, do not use a margin. Although the labels might touch the edge of
// the canvas, the chart canvas probably does not have an border or a different background color within a page.
export const OUTER_BOUNDS_DEFAULT = {left: 0, right: 0, top: 0, bottom: 0};
export const OUTER_BOUNDS_CLAMP_DEFAULT = ['25%', '25%'];

export interface GridOption extends ComponentOption,
    ComponentOnCalendarOptionMixin, ComponentOnMatrixOptionMixin,
    BoxLayoutOptionMixin, ShadowOptionMixin {

    mainType?: 'grid';

    show?: boolean;

    /**
     * @deprecated Use `grid.outerBounds` instead.
     * Whether grid size contains axis labels. This approach estimates the size by sample labels.
     * It works for most case but it does not strictly contain all labels in some cases.
     */
    containLabel?: boolean;
    /**
     * Define a constrains rect.
     * Axis lines is firstly laid out based on the rect defined by `grid.left/right/top/bottom/width/height`.
     * (for axis line alignment requirements between multiple grids)
     * But if axisLabel and/or axisName overflow the outerBounds, shrink the layout to avoid that overflow.
     *
     * Options:
     *  - 'none': outerBounds is infinity.
     *  - 'same': outerBounds is the same as the layout rect defined by `grid.left/right/top/bottom/width/height`.
     *  - 'auto'/null/undefined: Default. Use `outerBounds`, or 'same' if `containLabel:true`.
     *
     * Note:
     *  `grid.containLabel` is equivalent to `{outerBoundsMode: 'same', outerBoundsContain: 'axisLabel'}`.
     */
    outerBoundsMode?: 'auto' | NullUndefined | 'same' | 'none';
    /**
     * {left, right, top, bottom, width, height}: Define a outerBounds rect, based on:
     *  - the canvas by default.
     *  - or the `dataToLayout` result if a `boxCoordinateSystem` is specified.
     */
    outerBounds?: BoxLayoutOptionMixin;
    /**
     * - 'all': Default. Contains the cartesian rect and axis labels and axis name.
     * - 'axisLabel': Contains the cartesian rect and axis labels. This effect differs slightly from the
     *  previous option `containLabel` but more precise.
     * - 'auto'/null/undefined: Default. be 'axisLabel' if `containLabel:true`, otherwise 'all'.
     */
    outerBoundsContain?: 'all' | 'axisLabel' | 'auto' | NullUndefined;

    /**
     * Available only when `outerBoundsMode` is not 'none'.
     * Offer a constraint to not to shrink the grid rect causing smaller that width/height.
     * A string means percent, like '30%', based on the original rect size
     *  determined by `grid.top/right/bottom/left/width/height`.
     */
    outerBoundsClampWidth?: number | string;
    outerBoundsClampHeight?: number | string;

    backgroundColor?: ZRColor;
    borderWidth?: number;
    borderColor?: ZRColor;

    tooltip?: any; // FIXME:TS add this tooltip type
}

class GridModel extends ComponentModel<GridOption> implements CoordinateSystemHostModel {

    static type = 'grid';

    static dependencies = ['xAxis', 'yAxis'];

    static layoutMode = 'box' as const;

    coordinateSystem: Grid;

    mergeDefaultAndTheme(option: GridOption, ecModel: GlobalModel): void {
        const outerBoundsCp = getLayoutParams(option.outerBounds);

        super.mergeDefaultAndTheme.apply(this, arguments as any);

        if (outerBoundsCp && option.outerBounds) {
            mergeLayoutParam(option.outerBounds, outerBoundsCp);
        }
    }

    mergeOption(newOption: GridOption, ecModel: GlobalModel) {
        super.mergeOption.apply(this, arguments as any);

        if (this.option.outerBounds && newOption.outerBounds) {
            mergeLayoutParam(this.option.outerBounds, newOption.outerBounds);
        }
    }

    static defaultOption: GridOption = {
        show: false,
        // zlevel: 0,
        z: 0,
        left: '15%',
        top: 65,
        right: '10%',
        bottom: 80,
        // If grid size contain label
        containLabel: false,
        outerBoundsMode: 'auto',
        outerBounds: OUTER_BOUNDS_DEFAULT,
        outerBoundsContain: 'all',
        outerBoundsClampWidth: OUTER_BOUNDS_CLAMP_DEFAULT[0],
        outerBoundsClampHeight: OUTER_BOUNDS_CLAMP_DEFAULT[1],

        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: tokens.color.transparent,
        borderWidth: 1,
        borderColor: tokens.color.neutral30
    };
}

export default GridModel;
