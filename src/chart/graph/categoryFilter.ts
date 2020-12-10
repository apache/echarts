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
import type LegendModel from '../../component/legend/LegendModel';

export default function categoryFilter(ecModel: GlobalModel) {
    const legendModels = ecModel.findComponents({
        mainType: 'legend'
    }) as LegendModel[];
    if (!legendModels || !legendModels.length) {
        return;
    }
    ecModel.eachSeriesByType('graph', function (graphSeries: GraphSeriesModel) {
        const categoriesData = graphSeries.getCategoriesData();
        const graph = graphSeries.getGraph();
        const data = graph.data;

        const categoryNames = categoriesData.mapArray(categoriesData.getName);

        data.filterSelf(function (idx) {
            const model = data.getItemModel<GraphNodeItemOption>(idx);
            let category = model.getShallow('category');
            if (category != null) {
                if (typeof category === 'number') {
                    category = categoryNames[category];
                }
                // If in any legend component the status is not selected.
                for (let i = 0; i < legendModels.length; i++) {
                    if (!legendModels[i].isSelected(category)) {
                        return false;
                    }
                }
            }
            return true;
        });
    });
}
