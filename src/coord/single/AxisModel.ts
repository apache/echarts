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
import { AxisModelExtendedInCreator } from '../axisModelCreator';
import {AxisModelCommonMixin} from '../axisModelCommonMixin';
import Single from './Single';
import SingleAxis from './SingleAxis';
import { AxisBaseOption } from '../axisCommonTypes';
import { BoxLayoutOptionMixin, LayoutOrient } from '../../util/types';
import { AxisBaseModel } from '../AxisBaseModel';
import { mixin } from 'zrender/src/core/util';

export type SingleAxisPosition = 'top' | 'bottom' | 'left' | 'right';

export interface SingleAxisOption extends AxisBaseOption, BoxLayoutOptionMixin {
    mainType?: 'singleAxis'
    position?: SingleAxisPosition
    orient?: LayoutOrient
}

class SingleAxisModel extends ComponentModel<SingleAxisOption>
    implements AxisBaseModel<SingleAxisOption> {
    static type = 'singleAxis';
    type = SingleAxisModel.type;

    static readonly layoutMode = 'box';

    axis: SingleAxis;

    coordinateSystem: Single;

    getCoordSysModel() {
        return this;
    }

    static defaultOption: SingleAxisOption = {

        left: '5%',
        top: '5%',
        right: '5%',
        bottom: '5%',

        type: 'value',

        position: 'bottom',

        orient: 'horizontal',

        axisLine: {
            show: true,
            lineStyle: {
                width: 1,
                type: 'solid'
            }
        },

        // Single coordinate system and single axis is the,
        // which is used as the parent tooltip model.
        // same model, so we set default tooltip show as true.
        tooltip: {
            show: true
        },

        axisTick: {
            show: true,
            length: 6,
            lineStyle: {
                width: 1
            }
        },

        axisLabel: {
            show: true,
            interval: 'auto'
        },

        splitLine: {
            show: true,
            lineStyle: {
                type: 'dashed',
                opacity: 0.2
            }
        }
    };
}

interface SingleAxisModel extends AxisModelCommonMixin<SingleAxisOption>,
    AxisModelExtendedInCreator<SingleAxisOption> {}

mixin(SingleAxisModel, AxisModelCommonMixin.prototype);

export default SingleAxisModel;