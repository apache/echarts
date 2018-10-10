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
            var itemSymbolType = itemModel.getShallow('symbol', true);
            if (itemSymbolType != null) {
                categoriesData.setItemVisual(idx, 'symbol', itemSymbolType);
            }

            var itemSymbolSize = itemModel.getShallow('symbolSize', true);
            if (itemSymbolSize != null) {
                categoriesData.setItemVisual(idx, 'symbolSize', itemSymbolSize);
            }

            var itemSymbolKeepAspect = itemModel.getShallow('symbolKeepAspect',true);
            if (itemSymbolKeepAspect != null) {
                categoriesData.setItemVisual(idx, 'symbolKeepAspect', itemSymbolKeepAspect);
            }

            var itemSymbolOffset = itemModel.getShallow('symbolOffset',true);
            if (itemSymbolOffset != null) {
                categoriesData.setItemVisual(idx, 'symbolOffset', itemSymbolOffset);
            }

            var itemSymbolRotate = itemModel.getShallow('symbolRotate',true) || 0;
            if (itemSymbolRotate != null) {
                categoriesData.setItemVisual(idx, 'symbolRotate', itemSymbolRotate);
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
                    if (!data.getItemVisual(idx, 'color', true)) {
                        data.setItemVisual(
                            idx, 'color',
                            categoriesData.getItemVisual(category, 'color')
                        );
                    }
                    if (!data.getItemVisual(idx, 'opacity', true)) {
                        data.setItemVisual(
                            idx, 'opacity',
                            categoriesData.getItemVisual(category, 'opacity')
                        );
                    }

                    if (!data.getItemVisual(idx, 'symbol', true)) {
                        data.setItemVisual(
                            idx, 'symbol',
                            categoriesData.getItemVisual(category, 'symbol')
                        );
                    }

                    if (!data.getItemVisual(idx, 'symbolSize', true)) {
                        data.setItemVisual(
                            idx, 'symbolSize',
                            categoriesData.getItemVisual(category, 'symbolSize')
                        );
                    }

                    if (!data.getItemVisual(idx, 'symbolKeepAspect', true)) {
                        data.setItemVisual(
                            idx, 'symbolKeepAspect',
                            categoriesData.getItemVisual(category, 'symbolKeepAspect')
                        );
                    }

                    if (!data.getItemVisual(idx, 'symbolOffset', true)) {
                        data.setItemVisual(
                            idx, 'symbolOffset',
                            categoriesData.getItemVisual(category, 'symbolOffset')
                        );
                    }

                    if (!data.getItemVisual(idx, 'symbolRotate', true)) {
                        console.log(111);
                        data.setItemVisual(
                            idx, 'symbolRotate',
                            categoriesData.getItemVisual(category, 'symbolRotate')
                        );
                    }
                }
            });
        }
    });
}
