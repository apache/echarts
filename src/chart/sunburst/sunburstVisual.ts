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

import { lift } from 'zrender/src/tool/color';
import { extend, isString } from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import SunburstSeriesModel, { SunburstSeriesNodeItemOption } from './SunburstSeries';
import { Dictionary, ColorString } from '../../util/types';
import { TreeNode } from '../../data/Tree';

export default function sunburstVisual(ecModel: GlobalModel) {

    const paletteScope: Dictionary<ColorString> = {};

    // Default color strategy
    function pickColor(node: TreeNode, seriesModel: SunburstSeriesModel, treeHeight: number) {
        // Choose color from palette based on the first level.
        let current = node;
        while (current && current.depth > 1) {
            current = current.parentNode;
        }
        let color = seriesModel.getColorFromPalette((current.name || current.dataIndex + ''), paletteScope);
        if (node.depth > 1 && isString(color)) {
            // Lighter on the deeper level.
            color = lift(color, (node.depth - 1) / (treeHeight - 1) * 0.5);
        }
        return color;
    }

    ecModel.eachSeriesByType('sunburst', function (seriesModel: SunburstSeriesModel) {
        const data = seriesModel.getData();
        const tree = data.tree;

        tree.eachNode(function (node) {
            const model = node.getModel<SunburstSeriesNodeItemOption>();
            const style = model.getModel('itemStyle').getItemStyle();

            if (!style.fill) {
                style.fill = pickColor(node, seriesModel, tree.root.height);
            }

            const existsStyle = data.ensureUniqueItemVisual(node.dataIndex, 'style');
            extend(existsStyle, style);
        });
    });
}
