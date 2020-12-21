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
import { AxisModelExtendedInCreator } from '../axisModelCreator';
import {AxisModelCommonMixin} from '../axisModelCommonMixin';
import { AxisBaseOption } from '../axisCommonTypes';
import AngleAxis from './AngleAxis';
import RadiusAxis from './RadiusAxis';
import { AxisBaseModel } from '../AxisBaseModel';
import { SINGLE_REFERRING } from '../../util/model';

export interface AngleAxisOption extends AxisBaseOption {
    mainType?: 'angleAxis';
    /**
     * Index of host polar component
     */
    polarIndex?: number;
    /**
     * Id of host polar component
     */
    polarId?: string;

    startAngle?: number;
    clockwise?: boolean;

    splitNumber?: number;

    axisLabel?: AxisBaseOption['axisLabel']
}

export interface RadiusAxisOption extends AxisBaseOption {
    mainType?: 'radiusAxis';
    /**
     * Index of host polar component
     */
    polarIndex?: number;
    /**
     * Id of host polar component
     */
    polarId?: string;
}

type PolarAxisOption = AngleAxisOption | RadiusAxisOption;

class PolarAxisModel<T extends PolarAxisOption = PolarAxisOption> extends ComponentModel<T>
    implements AxisBaseModel<T> {
    static type = 'polarAxis';

    axis: AngleAxis | RadiusAxis;

    getCoordSysModel(): ComponentModel {
        return this.getReferringComponents('polar', SINGLE_REFERRING).models[0];
    }
}

interface PolarAxisModel<T extends PolarAxisOption = PolarAxisOption>
    extends AxisModelCommonMixin<T>, AxisModelExtendedInCreator<T> {}

zrUtil.mixin(PolarAxisModel, AxisModelCommonMixin);

export {PolarAxisModel};

export class AngleAxisModel extends PolarAxisModel<AngleAxisOption> {
    static type = 'angleAxis';
    type = AngleAxisModel.type;
    axis: AngleAxis;
}
export class RadiusAxisModel extends PolarAxisModel<RadiusAxisOption> {
    static type = 'radiusAxis';
    type = RadiusAxisModel.type;
    axis: RadiusAxis;
}