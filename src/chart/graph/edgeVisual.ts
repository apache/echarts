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
import GraphSeriesModel, { GraphEdgeItemOption } from './GraphSeries';

function normalize(a: string | number | (string | number)[]): (string | number)[] {
    if (!(a instanceof Array)) {
        a = [a, a];
    }
    return a;
}

export default function (ecModel: GlobalModel) {
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        const graph = seriesModel.getGraph();
        const edgeData = seriesModel.getEdgeData();
        const symbolType = normalize(seriesModel.get('edgeSymbol'));
        const symbolSize = normalize(seriesModel.get('edgeSymbolSize'));

        const colorQuery = ['lineStyle', 'color'] as const;
        const opacityQuery = ['lineStyle', 'opacity'] as const;

        edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
        edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
        edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
        edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
        edgeData.setVisual('color', seriesModel.get(colorQuery));
        edgeData.setVisual('opacity', seriesModel.get(opacityQuery));

        edgeData.each(function (idx) {
            const itemModel = edgeData.getItemModel<GraphEdgeItemOption>(idx);
            const edge = graph.getEdgeByIndex(idx);
            const symbolType = normalize(itemModel.getShallow('symbol', true));
            const symbolSize = normalize(itemModel.getShallow('symbolSize', true));
            // Edge visual must after node visual
            let color = itemModel.get(colorQuery);
            const opacity = itemModel.get(opacityQuery);
            switch (color) {
                case 'source':
                    color = edge.node1.getVisual('color');
                    break;
                case 'target':
                    color = edge.node2.getVisual('color');
                    break;
            }

            symbolType[0] && edge.setVisual('fromSymbol', symbolType[0]);
            symbolType[1] && edge.setVisual('toSymbol', symbolType[1]);
            symbolSize[0] && edge.setVisual('fromSymbolSize', symbolSize[0]);
            symbolSize[1] && edge.setVisual('toSymbolSize', symbolSize[1]);

            edge.setVisual('color', color);
            edge.setVisual('opacity', opacity);
        });
    });
}