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

import { StageHandler } from '../util/types';

export default function dataFilter(seriesType: string): StageHandler {
    return {
        seriesType: seriesType,
        reset: function (seriesModel, ecModel) {
            const legendModels = ecModel.findComponents({
                mainType: 'legend'
            });
            if (!legendModels || !legendModels.length) {
                return;
            }
            const data = seriesModel.getData();
            data.filterSelf(function (idx) {
                const name = data.getName(idx);
                // If in any legend component the status is not selected.
                for (let i = 0; i < legendModels.length; i++) {
                    // @ts-ignore FIXME: LegendModel
                    if (!legendModels[i].isSelected(name)) {
                        return false;
                    }
                }
                return true;
            });
        }
    };
}