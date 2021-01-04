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

import MarkerModel, { MarkerOption, MarkerStatisticType, MarkerPositionOption } from './MarkerModel';
import { SeriesLabelOption, ItemStyleOption, StatesOptionMixin } from '../../util/types';
import GlobalModel from '../../model/Global';


interface MarkAreaStateOption {
    itemStyle?: ItemStyleOption
    label?: SeriesLabelOption
}

interface MarkAreaDataItemOptionBase extends MarkAreaStateOption, StatesOptionMixin<MarkAreaStateOption> {
    name?: string
}

// 1D markArea for horizontal or vertical. Similar to markLine
export interface MarkArea1DDataItemOption extends MarkAreaDataItemOptionBase {

    xAxis?: number
    yAxis?: number

    type?: MarkerStatisticType

    valueIndex?: number
    valueDim?: string
}

// 2D markArea on any direction. Similar to markLine
interface MarkArea2DDataItemDimOption extends MarkAreaDataItemOptionBase, MarkerPositionOption {
}


export type MarkArea2DDataItemOption = [
    // Start point
    MarkArea2DDataItemDimOption,
    // End point
    MarkArea2DDataItemDimOption
];

export interface MarkAreaOption extends MarkerOption, MarkAreaStateOption, StatesOptionMixin<MarkAreaStateOption> {
    mainType?: 'markArea'

    precision?: number

    data?: (MarkArea1DDataItemOption | MarkArea2DDataItemOption)[]
}

class MarkAreaModel extends MarkerModel<MarkAreaOption> {

    static type = 'markArea';
    type = MarkAreaModel.type;

    createMarkerModelFromSeries(
        markerOpt: MarkAreaOption,
        masterMarkerModel: MarkAreaModel,
        ecModel: GlobalModel
    ) {
        return new MarkAreaModel(markerOpt, masterMarkerModel, ecModel);
    }

    static defaultOption: MarkAreaOption = {
        zlevel: 0,
        // PENDING
        z: 1,
        tooltip: {
            trigger: 'item'
        },
        // markArea should fixed on the coordinate system
        animation: false,
        label: {
            show: true,
            position: 'top'
        },
        itemStyle: {
            // color and borderColor default to use color from series
            // color: 'auto'
            // borderColor: 'auto'
            borderWidth: 0
        },

        emphasis: {
            label: {
                show: true,
                position: 'top'
            }
        }
    };
}

export default MarkAreaModel;