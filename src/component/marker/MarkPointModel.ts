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

import MarkerModel, { MarkerOption, MarkerPositionOption } from './MarkerModel';
import GlobalModel from '../../model/Global';
import {
    SymbolOptionMixin,
    ItemStyleOption,
    SeriesLabelOption,
    CallbackDataParams,
    StatesOptionMixin
} from '../../util/types';

// interface MarkPointCallbackDataParams extends CallbackDataParams {
//     componentType: 'markPoint'
//     componentSubType: never
// }

interface MarkPointStateOption {
    itemStyle?: ItemStyleOption
    label?: SeriesLabelOption
}
export interface MarkPointDataItemOption extends
    MarkPointStateOption, StatesOptionMixin<MarkPointStateOption>,
    // TODO should not support callback in data
    SymbolOptionMixin<CallbackDataParams>,
    MarkerPositionOption {
    name: string
}

export interface MarkPointOption extends MarkerOption,
    SymbolOptionMixin<CallbackDataParams>,
    StatesOptionMixin<MarkPointStateOption>, MarkPointStateOption {
    mainType?: 'markPoint'

    precision?: number

    data?: MarkPointDataItemOption[]
}

class MarkPointModel extends MarkerModel<MarkPointOption> {

    static type = 'markPoint';
    type = MarkPointModel.type;

    createMarkerModelFromSeries(
        markerOpt: MarkPointOption,
        masterMarkerModel: MarkPointModel,
        ecModel: GlobalModel
    ) {
        return new MarkPointModel(markerOpt, masterMarkerModel, ecModel);
    }

    static defaultOption: MarkPointOption = {
        zlevel: 0,
        z: 5,
        symbol: 'pin',
        symbolSize: 50,
        //symbolRotate: 0,
        //symbolOffset: [0, 0]
        tooltip: {
            trigger: 'item'
        },
        label: {
            show: true,
            position: 'inside'
        },
        itemStyle: {
            borderWidth: 2
        },
        emphasis: {
            label: {
                show: true
            }
        }
    };
}

export default MarkPointModel;