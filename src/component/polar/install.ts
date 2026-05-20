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

import { EChartsExtensionInstallRegisters, use } from '../../extension';
import AxisView from '../axis/AxisView';
import PolarAxisPointer from '../axisPointer/PolarAxisPointer';
import {install as installAxisPointer} from '../axisPointer/install';
import PolarModel from '../../coord/polar/PolarModel';
import axisModelCreator from '../../coord/axisModelCreator';
import {
    AngleAxisOption,
    RadiusAxisOption,
    AngleAxisModel,
    RadiusAxisModel
} from '../../coord/polar/AxisModel';
import polarCreator from '../../coord/polar/polarCreator';
import AngleAxisView from '../axis/AngleAxisView';
import RadiusAxisView from '../axis/RadiusAxisView';
import ComponentView from '../../view/Component';
import { barLayoutPolarStageHandler, registerBarPolarAxisHandlers } from '../../layout/barPolar';
import { SERIES_TYPE_BAR } from '../../layout/barCommon';


const angleAxisExtraOption: AngleAxisOption = {
    startAngle: 90,

    clockwise: true,

    splitNumber: 12,

    // A round axis is not suitable for `containShape` in most cases.
    containShape: false,

    axisLabel: {
        rotate: 0
    }
};

const radiusAxisExtraOption: RadiusAxisOption = {
    splitNumber: 5
};

class PolarView extends ComponentView {
    static type = 'polar';
    type = PolarView.type;
}

export function install(registers: EChartsExtensionInstallRegisters) {

    use(installAxisPointer);

    AxisView.registerAxisPointerClass('PolarAxisPointer', PolarAxisPointer);

    registers.registerCoordinateSystem('polar', polarCreator);

    registers.registerComponentModel(PolarModel);
    registers.registerComponentView(PolarView);

    // Model and view for angleAxis and radiusAxis
    axisModelCreator(registers, 'angle', AngleAxisModel, angleAxisExtraOption);
    axisModelCreator(registers, 'radius', RadiusAxisModel, radiusAxisExtraOption);

    registers.registerComponentView(AngleAxisView);
    registers.registerComponentView(RadiusAxisView);

    registers.registerLayout(barLayoutPolarStageHandler);

    registerBarPolarAxisHandlers(registers, SERIES_TYPE_BAR);
}