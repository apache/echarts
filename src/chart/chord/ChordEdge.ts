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

import type { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import type PathProxy from 'zrender/src/core/PathProxy';
import { extend, isString } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import SeriesData from '../../data/SeriesData';
import { GraphEdge } from '../../data/Graph';
import type Model from '../../model/Model';
import { getSectorCornerRadius } from '../helper/sectorHelper';
import { saveOldStyle } from '../../animation/basicTransition';
import ChordSeriesModel, { ChordEdgeItemOption, ChordEdgeLineStyleOption, ChordNodeItemOption } from './ChordSeries';
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import { getECData } from '../../util/innerStore';

export class ChordPathShape {
    // Souce node, two points forming an arc
    s1: [number, number] = [0, 0];
    s2: [number, number] = [0, 0];
    sStartAngle: number = 0;
    sEndAngle: number = 0;

    // Target node, two points forming an arc
    t1: [number, number] = [0, 0];
    t2: [number, number] = [0, 0];
    tStartAngle: number = 0;
    tEndAngle: number = 0;

    cx: number = 0;
    cy: number = 0;
    // series.r0 of ChordSeries
    r: number = 0;

    clockwise: boolean = true;
}

interface ChordEdgePathProps extends PathProps {
    shape?: Partial<ChordPathShape>
}

export class ChordEdge extends graphic.Path<ChordEdgePathProps> {
    shape: ChordPathShape;

    constructor(
        nodeData: SeriesData<ChordSeriesModel>,
        edgeData: SeriesData,
        edgeIdx: number,
        startAngle: number
    ) {
        super();
        getECData(this).dataType = 'edge';
        this.updateData(nodeData, edgeData, edgeIdx, startAngle, true);
    }

    buildPath(ctx: PathProxy | CanvasRenderingContext2D, shape: ChordPathShape): void {
        // Start from n11
        ctx.moveTo(shape.s1[0], shape.s1[1]);

        const ratio = 0.7;
        const clockwise = shape.clockwise;

        // Draw the arc from n11 to n12
        ctx.arc(shape.cx, shape.cy, shape.r, shape.sStartAngle, shape.sEndAngle, !clockwise);

        // Bezier curve to cp1 and then to n21
        ctx.bezierCurveTo(
            (shape.cx - shape.s2[0]) * ratio + shape.s2[0],
            (shape.cy - shape.s2[1]) * ratio + shape.s2[1],
            (shape.cx - shape.t1[0]) * ratio + shape.t1[0],
            (shape.cy - shape.t1[1]) * ratio + shape.t1[1],
            shape.t1[0],
            shape.t1[1]
        );

        // Draw the arc from n21 to n22
        ctx.arc(shape.cx, shape.cy, shape.r, shape.tStartAngle, shape.tEndAngle, !clockwise);

        // Bezier curve back to cp2 and then to n11
        ctx.bezierCurveTo(
            (shape.cx - shape.t2[0]) * ratio + shape.t2[0],
            (shape.cy - shape.t2[1]) * ratio + shape.t2[1],
            (shape.cx - shape.s1[0]) * ratio + shape.s1[0],
            (shape.cy - shape.s1[1]) * ratio + shape.s1[1],
            shape.s1[0],
            shape.s1[1]
        );

        ctx.closePath();
    }

    updateData(
        nodeData: SeriesData<ChordSeriesModel>,
        edgeData: SeriesData,
        edgeIdx: number,
        startAngle: number,
        firstCreate?: boolean
    ): void {
        const seriesModel = nodeData.hostModel as ChordSeriesModel;
        const edge = edgeData.graph.getEdgeByIndex(edgeIdx);
        const layout = edge.getLayout();
        const itemModel = edge.node1.getModel<ChordNodeItemOption>();
        const edgeModel = edgeData.getItemModel<ChordEdgeItemOption>(edge.dataIndex);
        const lineStyle = edgeModel.getModel('lineStyle');
        const emphasisModel = edgeModel.getModel('emphasis');
        const focus = emphasisModel.get('focus');

        const shape: ChordPathShape = extend(
            getSectorCornerRadius(itemModel.getModel('itemStyle'), layout, true),
            layout
        );

        const el = this;

        // Ignore NaN data.
        if (isNaN(shape.sStartAngle) || isNaN(shape.tStartAngle)) {
            // Use NaN shape to avoid drawing shape.
            el.setShape(shape);
            return;
        }

        if (firstCreate) {
            el.setShape(shape);
            applyEdgeFill(el, edge, nodeData, lineStyle);
        }
        else {
            saveOldStyle(el);

            applyEdgeFill(el, edge, nodeData, lineStyle);
            graphic.updateProps(el, {
                shape: shape
            }, seriesModel, edgeIdx);
        }

        toggleHoverEmphasis(
            this,
            focus === 'adjacency'
                ? edge.getAdjacentDataIndices()
                : focus,
            emphasisModel.get('blurScope'),
            emphasisModel.get('disabled')
        );

        setStatesStylesFromModel(el, edgeModel, 'lineStyle');

        edgeData.setItemGraphicEl(edge.dataIndex, el);
    }
}

function applyEdgeFill(
    edgeShape: ChordEdge,
    edge: GraphEdge,
    nodeData: SeriesData<ChordSeriesModel>,
    lineStyleModel: Model<ChordEdgeLineStyleOption>
) {
    const node1 = edge.node1;
    const node2 = edge.node2;
    const edgeStyle = edgeShape.style as PathStyleProps;

    edgeShape.setStyle(lineStyleModel.getLineStyle());

    const color = lineStyleModel.get('color');
    switch (color) {
        case 'source':
            // TODO: use visual and node1.getVisual('color');
            edgeStyle.fill = nodeData.getItemVisual(node1.dataIndex, 'style').fill;
            edgeStyle.decal = node1.getVisual('style').decal;
            break;
        case 'target':
            edgeStyle.fill = nodeData.getItemVisual(node2.dataIndex, 'style').fill;
            edgeStyle.decal = node2.getVisual('style').decal;
            break;
        case 'gradient':
            const sourceColor = nodeData.getItemVisual(node1.dataIndex, 'style').fill;
            const targetColor = nodeData.getItemVisual(node2.dataIndex, 'style').fill;
            if (isString(sourceColor) && isString(targetColor)) {
                // Gradient direction is perpendicular to the mid-angles
                // of source and target nodes.
                const shape = edgeShape.shape;
                const sMidX = (shape.s1[0] + shape.s2[0]) / 2;
                const sMidY = (shape.s1[1] + shape.s2[1]) / 2;
                const tMidX = (shape.t1[0] + shape.t2[0]) / 2;
                const tMidY = (shape.t1[1] + shape.t2[1]) / 2;
                edgeStyle.fill = new graphic.LinearGradient(
                    sMidX, sMidY, tMidX, tMidY,
                    [
                        { offset: 0, color: sourceColor },
                        { offset: 1, color: targetColor }
                    ],
                    true
                );
            }
            break;
    }
}
