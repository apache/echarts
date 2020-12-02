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
import ComponentView from '../../view/Component';
import SingleAxisView from '../axis/SingleAxisView';
import axisModelCreator from '../../coord/axisModelCreator';
import SingleAxisModel from '../../coord/single/AxisModel';
import singleCreator from '../../coord/single/singleCreator';
import {install as installAxisPointer} from '../axisPointer/install';
import AxisView from '../axis/AxisView';
import SingleAxisPointer from '../axisPointer/SingleAxisPointer';

class SingleView extends ComponentView {
    static type = 'single';
    type = SingleView.type;
}

export function install(registers: EChartsExtensionInstallRegisters) {
    use(installAxisPointer);

    AxisView.registerAxisPointerClass('SingleAxisPointer', SingleAxisPointer);

    registers.registerComponentView(SingleView);

    // Axis
    registers.registerComponentView(SingleAxisView);
    registers.registerComponentModel(SingleAxisModel);

    axisModelCreator(registers, 'single', SingleAxisModel, SingleAxisModel.defaultOption);

    registers.registerCoordinateSystem('single', singleCreator);
}