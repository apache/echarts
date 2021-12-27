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

import { EChartsExtensionInstallRegisters } from '../../extension';
import { VisualMapOption } from './VisualMapModel';
import { PiecewiseVisualMapOption } from './PiecewiseModel';
import { ContinousVisualMapOption } from './ContinuousModel';
import { visualMapActionInfo, visualMapActionHander } from './visualMapAction';
import { visualMapEncodingHandlers } from './visualEncoding';
import { each } from 'zrender/src/core/util';
import preprocessor from './preprocessor';

let installed = false;
export default function installCommon(registers: EChartsExtensionInstallRegisters) {
    if (installed) {
        return;
    }
    installed = true;

    registers.registerSubTypeDefaulter(
        'visualMap', function (option: VisualMapOption) {
        // Compatible with ec2, when splitNumber === 0, continuous visualMap will be used.
        return (
                !option.categories
                && (
                    !(
                        (option as PiecewiseVisualMapOption).pieces
                            ? ((option as PiecewiseVisualMapOption)).pieces.length > 0
                            : ((option as PiecewiseVisualMapOption)).splitNumber > 0
                    )
                    || (option as ContinousVisualMapOption).calculable
                )
            )
            ? 'continuous' : 'piecewise';
    });

    registers.registerAction(visualMapActionInfo, visualMapActionHander);

    each(visualMapEncodingHandlers, (handler) => {
        registers.registerVisual(registers.PRIORITY.VISUAL.COMPONENT, handler);
    });
    registers.registerPreprocessor(preprocessor);
}