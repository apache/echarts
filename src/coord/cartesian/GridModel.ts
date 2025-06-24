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
import { ComponentOption, BoxLayoutOptionMixin, ZRColor, ShadowOptionMixin, NullUndefined } from '../../util/types';
import Grid from './Grid';
import { CoordinateSystemHostModel } from '../CoordinateSystem';
import type GlobalModel from '../../model/Global';
import { getLayoutParams, mergeLayoutParam } from '../../util/layout';

export const OUTER_BOUNDS_DEFAULT = {left: 5, right: 5, top: 5, bottom: 5};

export interface GridOption extends ComponentOption, BoxLayoutOptionMixin, ShadowOptionMixin {
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
     * By default {left: 5, right: 5, top: 5, bottom: 5}.
     */
    outerBounds?: BoxLayoutOptionMixin;
    /**
     * - 'all': Default. Contains the cartesian rect and axis labels and axis name.
     * - 'axisLabel': Contains the cartesian rect and axis labels. This effect differs slightly from the
     *  previous option `containLabel` but more precise.
     * - 'auto'/null/undefined: Default. be 'axisLabel' if `containLabel:true`, otherwise 'all'.
     */
    outerBoundsContain?: 'all' | 'axisLabel' | 'auto' | NullUndefined;

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
        left: '10%',
        top: 60,
        right: '10%',
        bottom: 70,

        containLabel: false,
        outerBoundsMode: 'auto',
        outerBounds: OUTER_BOUNDS_DEFAULT,
        outerBoundsContain: 'all',

        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: 'rgba(0,0,0,0)',
        borderWidth: 1,
        borderColor: '#ccc'
    };
}

export default GridModel;
