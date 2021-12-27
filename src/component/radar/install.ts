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
import RadarModel from '../../coord/radar/RadarModel';
import RadarView from './RadarView';
import Radar from '../../coord/radar/Radar';
import RadarSeriesModel from '../../chart/radar/RadarSeries';

export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerCoordinateSystem('radar', Radar);
    registers.registerComponentModel(RadarModel);
    registers.registerComponentView(RadarView);

    registers.registerVisual({
        seriesType: 'radar',
        reset: function (seriesModel: RadarSeriesModel) {
            const data = seriesModel.getData();
            // itemVisual symbol is for selected data
            data.each(function (idx) {
                data.setItemVisual(idx, 'legendIcon', 'roundRect');
            });
            // visual is for unselected data
            data.setVisual('legendIcon', 'roundRect');
        }
    });
}
