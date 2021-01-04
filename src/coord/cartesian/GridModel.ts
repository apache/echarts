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
import { ComponentOption, BoxLayoutOptionMixin, ZRColor, ShadowOptionMixin } from '../../util/types';
import Grid from './Grid';
import { CoordinateSystemHostModel } from '../CoordinateSystem';

export interface GridOption extends ComponentOption, BoxLayoutOptionMixin, ShadowOptionMixin {
    mainType?: 'grid';

    show?: boolean;

    // Whether grid size contain label.
    containLabel?: boolean;

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
        zlevel: 0,
        z: 0,
        left: '10%',
        top: 60,
        right: '10%',
        bottom: 70,
        // If grid size contain label
        containLabel: false,
        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: 'rgba(0,0,0,0)',
        borderWidth: 1,
        borderColor: '#ccc'
    };
}

export default GridModel;
