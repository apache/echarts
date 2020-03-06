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
import GraphSeriesModel, { GraphNodeItemOption } from './GraphSeries';
import { Dictionary, ColorString } from '../../util/types';

export default function (ecModel: GlobalModel) {

    var paletteScope: Dictionary<ColorString> = {};
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        var categoriesData = seriesModel.getCategoriesData();
        var data = seriesModel.getData();

        var categoryNameIdxMap: Dictionary<number> = {};

        categoriesData.each(function (idx) {
            var name = categoriesData.getName(idx);
            // Add prefix to avoid conflict with Object.prototype.
            categoryNameIdxMap['ec-' + name] = idx;
            var itemModel = categoriesData.getItemModel<GraphNodeItemOption>(idx);

            var color = itemModel.get(['itemStyle', 'color'])
                || seriesModel.getColorFromPalette(name, paletteScope);
            categoriesData.setItemVisual(idx, 'color', color);

            var opacity = itemModel.get(['itemStyle', 'opacity']);
            if (opacity != null) {
                categoriesData.setItemVisual(idx, 'opacity', opacity);
            }

            var symbolVisualList = ['symbol', 'symbolSize', 'symbolKeepAspect'] as const;

            for (var i = 0; i < symbolVisualList.length; i++) {
                var symbolVisual = itemModel.getShallow(symbolVisualList[i], true);
                if (symbolVisual != null) {
                    categoriesData.setItemVisual(idx, symbolVisualList[i], symbolVisual);
                }
            }
        });

        // Assign category color to visual
        if (categoriesData.count()) {
            data.each(function (idx) {
                var model = data.getItemModel<GraphNodeItemOption>(idx);
                var category = model.getShallow('category');
                if (category != null) {
                    if (typeof category === 'string') {
                        category = categoryNameIdxMap['ec-' + category];
                    }

                    var visualList = ['color', 'opacity', 'symbol', 'symbolSize', 'symbolKeepAspect'] as const;

                    for (var i = 0; i < visualList.length; i++) {
                        if (data.getItemVisual(idx, visualList[i], true) == null) {
                            data.setItemVisual(
                                idx, visualList[i],
                                categoriesData.getItemVisual(category, visualList[i])
                            );
                        }
                    }
                }
            });
        }
    });
}
