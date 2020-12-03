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


import ParallelSeriesModel, { ParallelSeriesOption } from './ParallelSeries';
import { StageHandler } from '../../util/types';


const opacityAccessPath = ['lineStyle', 'opacity'] as const;

const parallelVisual: StageHandler = {

    seriesType: 'parallel',

    reset: function (seriesModel: ParallelSeriesModel, ecModel) {

        const coordSys = seriesModel.coordinateSystem;

        const opacityMap = {
            normal: seriesModel.get(['lineStyle', 'opacity']),
            active: seriesModel.get('activeOpacity'),
            inactive: seriesModel.get('inactiveOpacity')
        };

        return {
            progress(params, data) {
                coordSys.eachActiveState(data, function (activeState, dataIndex) {
                    let opacity = opacityMap[activeState];
                    if (activeState === 'normal' && data.hasItemOption) {
                        const itemOpacity = data.getItemModel<ParallelSeriesOption>(dataIndex).get(
                            opacityAccessPath, true
                        );
                        itemOpacity != null && (opacity = itemOpacity);
                    }
                    const existsStyle = data.ensureUniqueItemVisual(dataIndex, 'style');
                    existsStyle.opacity = opacity;
                }, params.start, params.end);
            }
        };
    }
};

export default parallelVisual;
