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

import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import { ActionInfo } from '../util/types';
import SeriesModel from '../model/Series';
import { Dictionary } from 'zrender/src/core/types';
import { DataSelectableMixin, DataSelectableOptionMixin } from '../component/helper/selectableMixin';


type SelectableSeriesModel = SeriesModel & DataSelectableMixin<DataSelectableOptionMixin>;

interface DataSelectAction extends ActionInfo {
    method: string
}

export default function (seriesType: string, actionInfos: DataSelectAction[]) {
    zrUtil.each(actionInfos, function (actionInfo) {
        actionInfo.update = 'updateView';
        /**
         * @payload
         * @property {string} seriesName
         * @property {string} name
         */
        echarts.registerAction(actionInfo, function (payload, ecModel) {
            let selected: Dictionary<Boolean> = {};
            ecModel.eachComponent(
                {mainType: 'series', subType: seriesType, query: payload},
                function (seriesModel: SelectableSeriesModel) {
                    // TODO: TYPE method type checking
                    if ((seriesModel as any)[actionInfo.method]) {
                        (seriesModel as any)[actionInfo.method](
                            payload.name,
                            payload.dataIndex
                        );
                    }
                    let data = seriesModel.getData();
                    // Create selected map
                    data.each(function (idx) {
                        let name = data.getName(idx);
                        selected[name] = seriesModel.isSelected(name)
                            || false;
                    });
                }
            );
            return {
                name: payload.name,
                selected: selected,
                seriesId: payload.seriesId
            };
        });
    });
}