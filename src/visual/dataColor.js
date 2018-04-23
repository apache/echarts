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

// Pick color from palette for each data item.
// Applicable for charts that require applying color palette
// in data level (like pie, funnel, chord).
import {createHashMap} from 'zrender/src/core/util';

export default function (seriesType) {
    return {
        getTargetSeries: function (ecModel) {
            // Pie and funnel may use diferrent scope
            var paletteScope = {};
            var seiresModelMap = createHashMap();

            ecModel.eachSeriesByType(seriesType, function (seriesModel) {
                seriesModel.__paletteScope = paletteScope;
                seiresModelMap.set(seriesModel.uid, seriesModel);
            });

            return seiresModelMap;
        },
        reset: function (seriesModel, ecModel) {
            var dataAll = seriesModel.getRawData();
            var idxMap = {};
            var data = seriesModel.getData();

            data.each(function (idx) {
                var rawIdx = data.getRawIndex(idx);
                idxMap[rawIdx] = idx;
            });

            dataAll.each(function (rawIdx) {
                var filteredIdx = idxMap[rawIdx];

                // If series.itemStyle.normal.color is a function. itemVisual may be encoded
                var singleDataColor = filteredIdx != null
                    && data.getItemVisual(filteredIdx, 'color', true);

                if (!singleDataColor) {
                    // FIXME Performance
                    var itemModel = dataAll.getItemModel(rawIdx);

                    var color = itemModel.get('itemStyle.color')
                        || seriesModel.getColorFromPalette(
                            dataAll.getName(rawIdx) || (rawIdx + ''), seriesModel.__paletteScope,
                            dataAll.count()
                        );
                    // Legend may use the visual info in data before processed
                    dataAll.setItemVisual(rawIdx, 'color', color);

                    // Data is not filtered
                    if (filteredIdx != null) {
                        data.setItemVisual(filteredIdx, 'color', color);
                    }
                }
                else {
                    // Set data all color for legend
                    dataAll.setItemVisual(rawIdx, 'color', singleDataColor);
                }
            });
        }
    };
}