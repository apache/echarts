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
import GraphSeriesModel, { GraphEdgeItemOption, GraphNodeItemOption } from './GraphSeries';
import Graph, { GraphNode } from '../../data/Graph';
import Symbol from '../helper/Symbol';
import SeriesData from '../../data/SeriesData';
import * as zrUtil from 'zrender/src/core/util';
import {getCurvenessForEdge} from '../helper/multipleGraphEdgeHelper';

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
    basedOn: 'value' | 'symbolSize',
    draggingNode?: GraphNode,
    pointer?: [number, number]
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

    if (draggingNode) {
        const [tempX, tempY] = coordSys.pointToData(pointer) as [number, number];
        const v = [tempX - cx, tempY - cy];
        vec2.normalize(v, v);
        vec2.scale(v, v, r);
        draggingNode.setLayout([cx + v[0], cy + v[1]], true);

        const circularRotateLabel = seriesModel.get(['circular', 'rotateLabel']);
        rotateNodeLabel(draggingNode, circularRotateLabel, cx, cy);
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
        const x12 = (p1[0] + p2[0]) / 2;
        const y12 = (p1[1] + p2[1]) / 2;
        if (+curveness) {
            curveness *= 3;
            cp1 = [
                cx * curveness + x12 * (1 - curveness),
                cy * curveness + y12 * (1 - curveness)
            ];
        }
        edge.setLayout([p1, p2, cp1]);
    });
}

interface LayoutNode {
    (
        seriesModel: GraphSeriesModel,
        graph: Graph,
        nodeData: SeriesData,
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
            // init circular layout for
            // 1. layout undefined node
            // 2. not fixed node
            (!node.getLayout() || !node.getLayout().fixed)
            && node.setLayout([
                r * Math.cos(angle) + cx,
                r * Math.sin(angle) + cy
            ]);
            angle += radianHalf;
        });
    }
};

export function rotateNodeLabel(
    node: GraphNode,
    circularRotateLabel: boolean,
    cx: number,
    cy: number
) {
    const el = node.getGraphicEl() as Symbol;
    // need to check if el exists. '-' value may not create node element.
    if (!el) {
        return;
    }
    const nodeModel = node.getModel<GraphNodeItemOption>();
    let labelRotate = nodeModel.get(['label', 'rotate']) || 0;
    const symbolPath = el.getSymbolPath();
    if (circularRotateLabel) {
        const pos = node.getLayout();
        let rad = Math.atan2(pos[1] - cy, pos[0] - cx);
        if (rad < 0) {
            rad = Math.PI * 2 + rad;
        }
        const isLeft = pos[0] < cx;
        if (isLeft) {
            rad = rad - Math.PI;
        }
        const textPosition = isLeft ? 'left' as const : 'right' as const;

        symbolPath.setTextConfig({
            rotation: -rad,
            position: textPosition,
            origin: 'center'
        });
        const emphasisState = symbolPath.ensureState('emphasis');
        zrUtil.extend(emphasisState.textConfig || (emphasisState.textConfig = {}), {
            position: textPosition
        });
    }
    else {
        symbolPath.setTextConfig({
            rotation: labelRotate *= Math.PI / 180
        });
    }
}
