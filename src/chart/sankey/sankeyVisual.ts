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

import VisualMapping from '../../visual/VisualMapping';
import * as zrUtil from 'zrender/src/core/util';

export default function (ecModel, payload) {
    ecModel.eachSeriesByType('sankey', function (seriesModel) {
        var graph = seriesModel.getGraph();
        var nodes = graph.nodes;
        if (nodes.length) {
            var minValue = Infinity;
            var maxValue = -Infinity;
            zrUtil.each(nodes, function (node) {
                var nodeValue = node.getLayout().value;
                if (nodeValue < minValue) {
                    minValue = nodeValue;
                }
                if (nodeValue > maxValue) {
                    maxValue = nodeValue;
                }
            });

            zrUtil.each(nodes, function (node) {
                var mapping = new VisualMapping({
                    type: 'color',
                    mappingMethod: 'linear',
                    dataExtent: [minValue, maxValue],
                    visual: seriesModel.get('color')
                });

                var mapValueToColor = mapping.mapValueToVisual(node.getLayout().value);
                var customColor = node.getModel().get('itemStyle.color');
                customColor != null
                    ? node.setVisual('color', customColor)
                    : node.setVisual('color', mapValueToColor);
            });
        }
    });
}