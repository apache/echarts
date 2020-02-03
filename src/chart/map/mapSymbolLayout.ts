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

import * as zrUtil from 'zrender/src/core/util';

export default function (ecModel) {

    var processedMapType = {};

    ecModel.eachSeriesByType('map', function (mapSeries) {
        var mapType = mapSeries.getMapType();
        if (mapSeries.getHostGeoModel() || processedMapType[mapType]) {
            return;
        }

        var mapSymbolOffsets = {};

        zrUtil.each(mapSeries.seriesGroup, function (subMapSeries) {
            var geo = subMapSeries.coordinateSystem;
            var data = subMapSeries.originalData;
            if (subMapSeries.get('showLegendSymbol') && ecModel.getComponent('legend')) {
                data.each(data.mapDimension('value'), function (value, idx) {
                    var name = data.getName(idx);
                    var region = geo.getRegion(name);

                    // If input series.data is [11, 22, '-'/null/undefined, 44],
                    // it will be filled with NaN: [11, 22, NaN, 44] and NaN will
                    // not be drawn. So here must validate if value is NaN.
                    if (!region || isNaN(value)) {
                        return;
                    }

                    var offset = mapSymbolOffsets[name] || 0;

                    var point = geo.dataToPoint(region.center);

                    mapSymbolOffsets[name] = offset + 1;

                    data.setItemLayout(idx, {
                        point: point,
                        offset: offset
                    });
                });
            }
        });

        // Show label of those region not has legendSymbol(which is offset 0)
        var data = mapSeries.getData();
        data.each(function (idx) {
            var name = data.getName(idx);
            var layout = data.getItemLayout(idx) || {};
            layout.showLabel = !mapSymbolOffsets[name];
            data.setItemLayout(idx, layout);
        });

        processedMapType[mapType] = true;
    });
}