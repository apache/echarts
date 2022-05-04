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
import { extend, isString } from 'zrender/src/core/util';

export default function categoryVisual(ecModel: GlobalModel) {

    const paletteScope: Dictionary<ColorString> = {};
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        const categoriesData = seriesModel.getCategoriesData();
        const data = seriesModel.getData();

        const categoryNameIdxMap: Dictionary<number> = {};

        categoriesData.each(function (idx) {
            const name = categoriesData.getName(idx);
            // Add prefix to avoid conflict with Object.prototype.
            categoryNameIdxMap['ec-' + name] = idx;
            const itemModel = categoriesData.getItemModel<GraphNodeItemOption>(idx);

            const style = itemModel.getModel('itemStyle').getItemStyle();
            if (!style.fill) {
                // Get color from palette.
                style.fill = seriesModel.getColorFromPalette(name, paletteScope);
            }
            categoriesData.setItemVisual(idx, 'style', style);

            const symbolVisualList = ['symbol', 'symbolSize', 'symbolKeepAspect'] as const;

            for (let i = 0; i < symbolVisualList.length; i++) {
                const symbolVisual = itemModel.getShallow(symbolVisualList[i], true);
                if (symbolVisual != null) {
                    categoriesData.setItemVisual(idx, symbolVisualList[i], symbolVisual);
                }
            }
        });

        // Assign category color to visual
        if (categoriesData.count()) {
            data.each(function (idx) {
                const model = data.getItemModel<GraphNodeItemOption>(idx);
                let categoryIdx = model.getShallow('category');
                if (categoryIdx != null) {
                    if (isString(categoryIdx)) {
                        categoryIdx = categoryNameIdxMap['ec-' + categoryIdx];
                    }

                    const categoryStyle = categoriesData.getItemVisual(categoryIdx, 'style');
                    const style = data.ensureUniqueItemVisual(idx, 'style');
                    extend(style, categoryStyle);

                    const visualList = ['symbol', 'symbolSize', 'symbolKeepAspect'] as const;

                    for (let i = 0; i < visualList.length; i++) {
                        data.setItemVisual(
                            idx, visualList[i],
                            categoriesData.getItemVisual(categoryIdx, visualList[i])
                        );
                    }
                }
            });
        }
    });
}
