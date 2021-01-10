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

import parallelPreprocessor from '../../coord/parallel/parallelPreprocessor';

import { EChartsExtensionInstallRegisters } from '../../extension';
import ParallelView from './ParallelView';
import ParallelModel from '../../coord/parallel/ParallelModel';
import parallelCoordSysCreator from '../../coord/parallel/parallelCreator';
import axisModelCreator from '../../coord/axisModelCreator';
import ParallelAxisModel, {ParallelAxisOption} from '../../coord/parallel/AxisModel';
import ParallelAxisView from '../axis/ParallelAxisView';
import { installParallelActions } from '../axis/parallelAxisAction';

const defaultAxisOption: ParallelAxisOption = {
    type: 'value',
    areaSelectStyle: {
        width: 20,
        borderWidth: 1,
        borderColor: 'rgba(160,197,232)',
        color: 'rgba(160,197,232)',
        opacity: 0.3
    },
    realtime: true,
    z: 10
};

export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerComponentView(ParallelView);
    registers.registerComponentModel(ParallelModel);

    registers.registerCoordinateSystem('parallel', parallelCoordSysCreator);
    registers.registerPreprocessor(parallelPreprocessor);

    registers.registerComponentModel(ParallelAxisModel);
    registers.registerComponentView(ParallelAxisView);

    axisModelCreator<ParallelAxisOption, typeof ParallelAxisModel>(
        registers, 'parallel', ParallelAxisModel, defaultAxisOption
    );

    installParallelActions(registers);
}