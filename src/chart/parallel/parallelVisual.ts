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


var opacityAccessPath = ['lineStyle', 'opacity'] as const;

var parallelVisual: StageHandler = {

    seriesType: 'parallel',

    reset: function (seriesModel: ParallelSeriesModel, ecModel) {

        // var itemStyleModel = seriesModel.getModel('itemStyle');
        var lineStyleModel = seriesModel.getModel('lineStyle');
        var globalColors = ecModel.get('color');

        var color = lineStyleModel.get('color')
            // || itemStyleModel.get('color')
            || globalColors[seriesModel.seriesIndex % globalColors.length];
        var inactiveOpacity = seriesModel.get('inactiveOpacity');
        var activeOpacity = seriesModel.get('activeOpacity');
        var lineStyle = seriesModel.getModel('lineStyle').getLineStyle();

        var coordSys = seriesModel.coordinateSystem;
        var data = seriesModel.getData();

        var opacityMap = {
            normal: lineStyle.opacity,
            active: activeOpacity,
            inactive: inactiveOpacity
        };

        data.setVisual('color', color);

        return {
            progress(params, data) {
                coordSys.eachActiveState(data, function (activeState, dataIndex) {
                    var opacity = opacityMap[activeState];
                    if (activeState === 'normal' && data.hasItemOption) {
                        var itemOpacity = data.getItemModel<ParallelSeriesOption>(dataIndex).get(
                            opacityAccessPath, true
                        );
                        itemOpacity != null && (opacity = itemOpacity);
                    }
                    data.setItemVisual(dataIndex, 'opacity', opacity);
                }, params.start, params.end);
            }
        };
    }
};

export default parallelVisual;
