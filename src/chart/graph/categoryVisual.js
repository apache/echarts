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


export default function (ecModel) {

    var paletteScope = {};
    ecModel.eachSeriesByType('graph', function (seriesModel) {
        var categoriesData = seriesModel.getCategoriesData();
        var data = seriesModel.getData();

        var categoryNameIdxMap = {};

        categoriesData.each(function (idx) {
            var name = categoriesData.getName(idx);
            // Add prefix to avoid conflict with Object.prototype.
            categoryNameIdxMap['ec-' + name] = idx;
            var itemModel = categoriesData.getItemModel(idx);

            var color = itemModel.get('itemStyle.color')
                || seriesModel.getColorFromPalette(name, paletteScope);
            categoriesData.setItemVisual(idx, 'color', color);

            var opacity = itemModel.get('itemStyle.opacity') || 1;
            categoriesData.setItemVisual(idx, 'opacity', opacity);

            var symbolStyleList = ['symbol', 'symbolSize', 'symbolKeepAspect', 'symbolOffset', 'symbolRotate'];

            for (var i = 0; i < symbolStyleList.length; i++) {
                var symbolStyleItem = itemModel.getShallow(symbolStyleList[i], true);
                console.log(symbolStyleItem);
                if (symbolStyleItem != null) {
                    categoriesData.setItemVisual(idx, symbolStyleList[i], symbolStyleItem);
                }
            }

        });

        // Assign category color to visual
        if (categoriesData.count()) {
            data.each(function (idx) {
                var model = data.getItemModel(idx);
                var category = model.getShallow('category');
                if (category != null) {
                    if (typeof category === 'string') {
                        category = categoryNameIdxMap['ec-' + category];
                    }

                    var itemStyleList = ['color', 'opacity'];

                    for (var i = 0; i < itemStyleList.length; i++) {
                        if (!data.getItemVisual(idx, itemStyleList[i], true)) {
                            data.setItemVisual(
                                idx, itemStyleList[i],
                                categoriesData.getItemVisual(category, itemStyleList[i])
                            );
                        }
                    }

                    var symbolStyleList = ['symbol', 'symbolSize', 'symbolKeepAspect', 'symbolOffset', 'symbolRotate'];

                    for (var i = 0; i < symbolStyleList.length; i++) {
                        if (!data.getItemVisual(idx, symbolStyleList[i], true)) {
                            data.setItemVisual(
                                idx, symbolStyleList[i],
                                categoriesData.getItemVisual(category, symbolStyleList[i])
                            );
                        }
                    }
                }
            });
        }
    });
}
