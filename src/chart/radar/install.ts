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
import radarLayout from '../radar/radarLayout';
import dataFilter from '../../processor/dataFilter';
import backwardCompat from '../radar/backwardCompat';
import RadarView from './RadarView';
import RadarSeriesModel from './RadarSeries';
import { install as installRadarComponent } from '../../component/radar/install';

export function install(registers: EChartsExtensionInstallRegisters) {
    use(installRadarComponent);

    registers.registerChartView(RadarView);
    registers.registerSeriesModel(RadarSeriesModel);

    registers.registerLayout(radarLayout);
    registers.registerProcessor(dataFilter('radar'));
    registers.registerPreprocessor(backwardCompat);
}