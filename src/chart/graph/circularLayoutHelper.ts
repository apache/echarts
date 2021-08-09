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


import * as vec2 from 'zrender/src/core/vector';
import {getSymbolSize, getNodeGlobalScale} from './graphHelper';
import GraphSeriesModel, { GraphEdgeItemOption } from './GraphSeries';
import Graph, { GraphNode } from '../../data/Graph';
import List from '../../data/List';
import * as zrUtil from 'zrender/src/core/util';
import {getCurvenessForEdge} from '../helper/multipleGraphEdgeHelper';
import {cubicPosition} from './simpleLayoutHelper'

const PI = Math.PI;

const _symbolRadiansHalf: number[] = [];

/**
 * `basedOn` can be:
 * 'value':
 *     This layout is not accurate and have same bad case. For example,
 *     if the min value is very smaller than the max value, the nodes
 *     with the min value probably overlap even though there is enough
 *     space to layout them. So we only use this approach in the as the
 *     init layout of the force layout.
 *     FIXME
 *     Probably we do not need this method any more but use
 *     `basedOn: 'symbolSize'` in force layout if
 *     delay its init operations to GraphView.
 * 'symbolSize':
 *     This approach work only if all of the symbol size calculated.
 *     That is, the progressive rendering is not applied to graph.
 *     FIXME
 *     If progressive rendering is applied to graph some day,
 *     probably we have to use `basedOn: 'value'`.
 */
export function circularLayout(
    seriesModel: GraphSeriesModel,
    basedOn: 'value' | 'symbolSize'
) {
    const coordSys = seriesModel.coordinateSystem;
    if (coordSys && coordSys.type !== 'view') {
        return;
    }

    const rect = coordSys.getBoundingRect();

    const nodeData = seriesModel.getData();
    const graph = nodeData.graph;

    const cx = rect.width / 2 + rect.x;
    const cy = rect.height / 2 + rect.y;
    const r = Math.min(rect.width, rect.height) / 2;
    const count = nodeData.count();

    nodeData.setLayout({
        cx: cx,
        cy: cy
    });

    if (!count) {
        return;
    }

    _layoutNodesBasedOn[basedOn](seriesModel, graph, nodeData, r, cx, cy, count);

    graph.eachEdge(function (edge, index) {
        let curveness = zrUtil.retrieve3(
            edge.getModel<GraphEdgeItemOption>().get(['lineStyle', 'curveness']),
            getCurvenessForEdge(edge, seriesModel, index),
            0
        );
        const p1 = vec2.clone(edge.node1.getLayout());
        const p2 = vec2.clone(edge.node2.getLayout());
        let cp1;
        let cp2;
        const x12 = (p1[0] + p2[0]) / 2;
        const y12 = (p1[1] + p2[1]) / 2;
        if (edge.node1 === edge.node2) {
            const size = getSymbolSize(edge.node1);
            const radius = getNodeGlobalScale(seriesModel) * size / 2;
            const inEdges = edge.node1.inEdges.filter((edge) => {
                return edge.node1 !== edge.node2;
            });
            const outEdges = edge.node1.outEdges.filter((edge) => {
                return edge.node1 !== edge.node2;
            });
            const allNodes: GraphNode[] = []
            inEdges.forEach((edge) => {
                allNodes.push(edge.node1);
            });
            outEdges.forEach((edge) => {
                allNodes.push(edge.node2);
            });
            const vectors: any[][] = [];
            let d = -Infinity;
            let pt1: number[] = [];
            let pt2: number[] = [];
            if (allNodes.length > 1) {
                allNodes.forEach(node => {
                    let v: any[] = [];
                    vec2.sub(v, node.getLayout(), edge.node1.getLayout());
                    vec2.normalize(v, v);
                    vectors.push(v);
                })
                // find the max angle
                for (let i = 0; i < vectors.length; i++) {
                    for (let j = i + 1; j < vectors.length; j++) {
                        if (vec2.distSquare(vectors[i], vectors[j]) > d) {
                            d = vec2.distSquare(vectors[i], vectors[j]);
                            pt1 = vectors[i];
                            pt2 = vectors[j];
                        }
                    }
                }
                // if the angle is more than sixty degree
                if (vec2.distSquare(pt1, pt2) > Math.sqrt(3)) {
                    vec2.scaleAndAdd(pt1, p1, pt1, radius);
                    vec2.scaleAndAdd(pt2, p2, pt2, radius);
                    const point1 = cubicPosition(pt1, p1, 10 * radius);
                    const point2 = cubicPosition(pt2, p2, 10 * radius);
                    const mid = [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
                    vec2.sub(mid, mid, p1);
                    const degree = Math.atan2(mid[1], mid[0]) / Math.PI * 180;
                    const v1 = [Math.cos((degree - 30) * Math.PI / 180), Math.sin((degree - 30) * Math.PI / 180)];
                    const v2 = [Math.cos((degree + 30) * Math.PI / 180), Math.sin((degree + 30) * Math.PI / 180)];
                    vec2.scaleAndAdd(v1, p1, v1, 10 * radius);
                    vec2.scaleAndAdd(v2, p2, v2, 10 * radius);
                    cp1 = v1; 
                    cp2 = v2;
                }
                else {
                    vec2.scaleAndAdd(pt1, p1, pt1, radius);
                    vec2.scaleAndAdd(pt2, p2, pt2, radius);
                    cp1 = cubicPosition(pt1, p1, 10 * radius);
                    cp2 = cubicPosition(pt2, p2, 10 * radius);
                }
            }
            else {
                cp1 = [p1[0] - radius * 2, p2[1] - radius * 4]
                cp2 = [p1[0] + radius * 2, p2[1] - radius * 4]
            }
        }
        else if (+curveness) {
            curveness *= 3;
            cp1 = [
                cx * curveness + x12 * (1 - curveness),
                cy * curveness + y12 * (1 - curveness)
            ];
        }
        edge.setLayout([p1, p2, cp1, cp2]);
    });
}

interface LayoutNode {
    (
        seriesModel: GraphSeriesModel,
        graph: Graph,
        nodeData: List,
        r: number,
        cx: number,
        cy: number,
        count: number
    ): void
}

const _layoutNodesBasedOn: Record<'value' | 'symbolSize', LayoutNode> = {

    value(seriesModel, graph, nodeData, r, cx, cy, count) {
        let angle = 0;
        const sum = nodeData.getSum('value');
        const unitAngle = Math.PI * 2 / (sum || count);

        graph.eachNode(function (node) {
            const value = node.getValue('value') as number;
            const radianHalf = unitAngle * (sum ? value : 1) / 2;

            angle += radianHalf;
            node.setLayout([
                r * Math.cos(angle) + cx,
                r * Math.sin(angle) + cy
            ]);
            angle += radianHalf;
        });
    },

    symbolSize(seriesModel, graph, nodeData, r, cx, cy, count) {
        let sumRadian = 0;
        _symbolRadiansHalf.length = count;

        const nodeScale = getNodeGlobalScale(seriesModel);

        graph.eachNode(function (node) {
            let symbolSize = getSymbolSize(node);

            // Normally this case will not happen, but we still add
            // some the defensive code (2px is an arbitrary value).
            isNaN(symbolSize) && (symbolSize = 2);
            symbolSize < 0 && (symbolSize = 0);

            symbolSize *= nodeScale;

            let symbolRadianHalf = Math.asin(symbolSize / 2 / r);
            // when `symbolSize / 2` is bigger than `r`.
            isNaN(symbolRadianHalf) && (symbolRadianHalf = PI / 2);
            _symbolRadiansHalf[node.dataIndex] = symbolRadianHalf;
            sumRadian += symbolRadianHalf * 2;
        });

        const halfRemainRadian = (2 * PI - sumRadian) / count / 2;

        let angle = 0;
        graph.eachNode(function (node) {
            const radianHalf = halfRemainRadian + _symbolRadiansHalf[node.dataIndex];

            angle += radianHalf;
            node.setLayout([
                r * Math.cos(angle) + cx,
                r * Math.sin(angle) + cy
            ]);
            angle += radianHalf;
        });
    }
};
