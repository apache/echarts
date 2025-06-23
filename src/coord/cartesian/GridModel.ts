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
     *  - `false`: outerBounds is infinity.
     *  - 'same': outerBounds is the same as the layout rect defined by `grid.left/right/top/bottom/width/height`.
     *  - {left, right, top, bottom, width, height}: Define a outerBounds rect, based on:
     *      - the canvas by default.
     *      - or the `dataToLayout` result if a `boxCoordinateSystem` is specified.
     *  - 'auto'/null/undefined/true: Default. be 'same' if `containLabel:true`,
     *      otherwises `{left: 5, right: 5, top: 5, bottom: 5}`.
     *
     * Note:
     *  `grid.containLabel` is equivalent to `{outerBounds: 'same', outerBoundsContain: 'axisLabel'}`.
     */
    outerBounds?: boolean | 'same' | 'auto' | BoxLayoutOptionMixin | NullUndefined;
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

    static defaultOption: GridOption = {
        show: false,
        // zlevel: 0,
        z: 0,
        left: '10%',
        top: 60,
        right: '10%',
        bottom: 70,

        containLabel: false,
        outerBounds: 'auto',
        outerBoundsContain: 'all',

        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: 'rgba(0,0,0,0)',
        borderWidth: 1,
        borderColor: '#ccc'
    };
}

export default GridModel;
