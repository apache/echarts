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
import * as zrUtil from 'zrender/src/core/util';
import {layout, largeLayout} from '../../layout/barGrid';
import dataSample from '../../processor/dataSample';

import BarSeries from './BarSeries';
import BarView from './BarView';
import CartesianAxisModel from '../../coord/cartesian/AxisModel';

export function install(registers: EChartsExtensionInstallRegisters) {

    registers.registerChartView(BarView);
    registers.registerSeriesModel(BarSeries);

    registers.registerLayout(registers.PRIORITY.VISUAL.LAYOUT, zrUtil.curry(layout, 'bar'));
    // Use higher prority to avoid to be blocked by other overall layout, which do not
    // only exist in this module, but probably also exist in other modules, like `barPolar`.
    registers.registerLayout(registers.PRIORITY.VISUAL.PROGRESSIVE_LAYOUT, largeLayout);

    registers.registerVisual({
        seriesType: 'bar',
        reset: function (seriesModel) {
            // Visual coding for legend
            seriesModel.getData().setVisual('legendSymbol', 'roundRect');
        }
    });

    // Down sample after filter
    registers.registerProcessor(
        registers.PRIORITY.PROCESSOR.STATISTIC,
        dataSample('bar')
    );

    /**
     * @payload
     * @property {string} [componentType=series]
     * @property {number} [dx]
     * @property {number} [dy]
     * @property {number} [zoom]
     * @property {number} [originX]
     * @property {number} [originY]
     */
    registers.registerAction({
        type: 'changeAxisOrder',
        event: 'changeAxisOrder',
        update: 'update'
    }, function (payload, ecModel) {
        const componentType = payload.componentType || 'series';

        ecModel.eachComponent(
            { mainType: componentType, query: payload },
            function (componentModel) {
                if (payload.sortInfo) {
                    (componentModel as CartesianAxisModel).axis.setCategorySortInfo(payload.sortInfo);
                }
            }
        );
    });

}