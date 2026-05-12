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


import GlobalModel from '../../model/Global';
import { buildAllMapSeriesGroups, getMainMapSeries, mapSeriesGroupHasOwnGeo, SERIES_TYPE_MAP } from './MapSeries';
import { Dictionary } from '../../util/types';
import { createSimpleOverallStageHandler } from '../../util/model';
import { each } from 'zrender/src/core/util';


export const mapSymbolLayoutStageHandler = createSimpleOverallStageHandler(SERIES_TYPE_MAP, mapSymbolLayout);

function mapSymbolLayout(ecModel: GlobalModel) {

    each(buildAllMapSeriesGroups(ecModel), function (mapSeriesGroup, groupKey) {
        if (!getMainMapSeries(mapSeriesGroup) || !mapSeriesGroupHasOwnGeo(groupKey)) {
            // map series on separate geo components only provide "choropleth map", but symbols are ignored.
            return;
        }

        const mapSymbolOffsets = {} as Dictionary<number>;

        each(mapSeriesGroup.f, function (subMapSeries) {
            const geo = subMapSeries.coordinateSystem;
            const data = subMapSeries.originalData;

            if (subMapSeries.get('showLegendSymbol') && ecModel.getComponent('legend')) {
                data.each(data.mapDimension('value'), function (value, idx) {
                    const name = data.getName(idx);
                    const region = geo.getRegion(name);

                    // If input series.data is [11, 22, '-'/null/undefined, 44],
                    // it will be filled with NaN: [11, 22, NaN, 44] and NaN will
                    // not be drawn. So here must validate if value is NaN.
                    if (!region || isNaN(value as number)) {
                        return;
                    }

                    const offset = mapSymbolOffsets[name] || 0;

                    const point = geo.dataToPoint(region.getCenter());

                    mapSymbolOffsets[name] = offset + 1;

                    data.setItemLayout(idx, {
                        point: point,
                        offset: offset
                    });
                });
            }
        });

        // Show label of those region not has legendIcon (which is offset 0)
        const data = getMainMapSeries(mapSeriesGroup).getData();
        data.each(function (idx) {
            const name = data.getName(idx);
            const layout = data.getItemLayout(idx) || {};
            layout.showLabel = !mapSymbolOffsets[name];
            data.setItemLayout(idx, layout);
        });

    });
}