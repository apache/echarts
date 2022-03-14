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

import ComponentView from '../../view/Component';
import { HashMap, createHashMap, each } from 'zrender/src/core/util';
import MarkerModel from './MarkerModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { makeInner } from '../../util/model';
import SeriesModel from '../../model/Series';
import Group from 'zrender/src/graphic/Group';
import { enterBlur, leaveBlur } from '../../util/states';

const inner = makeInner<{
    keep: boolean
}, MarkerDraw>();

interface MarkerDraw {
    group: Group
}
abstract class MarkerView extends ComponentView {

    static type = 'marker';
    type = MarkerView.type;

    /**
     * Markline grouped by series
     */
    markerGroupMap: HashMap<MarkerDraw>;

    init() {
        this.markerGroupMap = createHashMap();
    }

    render(markerModel: MarkerModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const markerGroupMap = this.markerGroupMap;
        markerGroupMap.each(function (item) {
            inner(item).keep = false;
        });

        ecModel.eachSeries(seriesModel => {
            const markerModel = MarkerModel.getMarkerModelFromSeries(
                seriesModel,
                this.type as 'markPoint' | 'markLine' | 'markArea'
            );
            markerModel && this.renderSeries(seriesModel, markerModel, ecModel, api);
        });

        markerGroupMap.each(item => {
            !inner(item).keep && this.group.remove(item.group);
        });
    }

    markKeep(drawGroup: MarkerDraw) {
        inner(drawGroup).keep = true;
    }

    toggleBlurSeries(seriesModelList: SeriesModel[], isBlur: boolean) {
        each(seriesModelList, seriesModel => {
            const markerModel = MarkerModel.getMarkerModelFromSeries(
                seriesModel,
                this.type as 'markPoint' | 'markLine' | 'markArea'
            );
            if (markerModel) {
                const data = markerModel.getData();
                data.eachItemGraphicEl(function (el) {
                    if (el) {
                        isBlur ? enterBlur(el) : leaveBlur(el);
                    }
                });
            }
        });
    }

    abstract renderSeries(
        seriesModel: SeriesModel,
        markerModel: MarkerModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ): void;
}

export default MarkerView;
