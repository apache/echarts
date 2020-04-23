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

import * as zrUtil from 'zrender/src/core/util';
import ComponentModel from '../../model/Component';
import axisModelCreator, { AxisModelExtendedInCreator } from '../axisModelCreator';
import {AxisModelCommonMixin} from '../axisModelCommonMixin';
import Axis2D from './Axis2D';
import { AxisBaseOption } from '../axisCommonTypes';
import GridModel from './GridModel';
import { AxisBaseModel } from '../AxisBaseModel';


export type CartesianAxisPosition = 'top' | 'bottom' | 'left' | 'right';

interface CartesianAxisOption extends AxisBaseOption {
    gridIndex?: number;
    gridId?: string;
    position?: CartesianAxisPosition;
    // Offset is for multiple axis on the same position.
    offset?: number;
    sort?: boolean;
}

class CartesianAxisModel extends ComponentModel<CartesianAxisOption>
    implements AxisBaseModel<CartesianAxisOption> {

    static type = 'cartesian2dAxis';

    axis: Axis2D;

    init(...args: any) {
        super.init.apply(this, args);
        this.resetRange();
    }

    mergeOption(...args: any) {
        super.mergeOption.apply(this, args);
        this.resetRange();
    }

    restoreData(...args: any) {
        super.restoreData.apply(this, args);
        this.resetRange();
    }

    getCoordSysModel(): GridModel {
        return this.ecModel.queryComponents({
            mainType: 'grid',
            index: this.option.gridIndex,
            id: this.option.gridId
        })[0] as GridModel;
    }
}

interface CartesianAxisModel extends AxisModelCommonMixin<CartesianAxisOption>,
    AxisModelExtendedInCreator<CartesianAxisOption> {}

zrUtil.mixin(CartesianAxisModel, AxisModelCommonMixin);

const extraOption: CartesianAxisOption = {
    // gridIndex: 0,
    // gridId: '',
    offset: 0,
    sort: false
};

axisModelCreator<CartesianAxisOption, typeof CartesianAxisModel>('x', CartesianAxisModel, extraOption);
axisModelCreator<CartesianAxisOption, typeof CartesianAxisModel>('y', CartesianAxisModel, extraOption);

export default CartesianAxisModel;
