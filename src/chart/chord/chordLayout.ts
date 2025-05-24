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

import { normalizeArcAngles } from 'zrender/src/core/PathProxy';
import GlobalModel from '../../model/Global';
import ChordSeriesModel from './ChordSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import { getCircleLayout } from '../../util/layout';
import SeriesModel from '../../model/Series';
import { CircleLayoutOptionMixin, SeriesOption } from '../../util/types';

const RADIAN = Math.PI / 180;

export default function chordCircularLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('chord', function (seriesModel: ChordSeriesModel) {
        chordLayout(seriesModel, api);
    });
}

function chordLayout(seriesModel: ChordSeriesModel, api: ExtensionAPI) {
    const nodeData = seriesModel.getData();
    const nodeGraph = nodeData.graph;
    const edgeData = seriesModel.getEdgeData();
    const edgeCount = edgeData.count();

    if (!edgeCount) {
        return;
    }

    const { cx, cy, r, r0 } = getCircleLayout(
        seriesModel as unknown as SeriesModel<CircleLayoutOptionMixin & SeriesOption<unknown>>,
        api
    );

    let padAngle = Math.max((seriesModel.get('padAngle') || 0) * RADIAN, 0);
    let minAngle = Math.max((seriesModel.get('minAngle') || 0) * RADIAN, 0);
    const startAngle = -seriesModel.get('startAngle') * RADIAN;
    const endAngle = startAngle + Math.PI * 2;
    const clockwise = seriesModel.get('clockwise');
    const dir = clockwise ? 1 : -1;

    // Normalize angles
    const angles = [startAngle, endAngle];
    normalizeArcAngles(angles, !clockwise);
    const [normalizedStartAngle, normalizedEndAngle] = angles;
    const totalAngle = normalizedEndAngle - normalizedStartAngle;

    const allZero = nodeData.getSum('value') === 0 && edgeData.getSum('value') === 0;

    // Sum of each node's edge values
    const nodeValues: number[] = [];
    let renderedNodeCount = 0;
    nodeGraph.eachEdge(function (edge) {
        // All links use the same value 1 when allZero is true
        const value = allZero ? 1 : edge.getValue('value') as number;
        if (allZero && (value > 0 || minAngle)) {
            // When allZero is true, angle is in direct proportion to number
            // of links both in and out of the node.
            renderedNodeCount += 2;
        }
        const node1Index = edge.node1.dataIndex;
        const node2Index = edge.node2.dataIndex;
        nodeValues[node1Index] = (nodeValues[node1Index] || 0) + value;
        nodeValues[node2Index] = (nodeValues[node2Index] || 0) + value;
    });

    // Update nodeValues with data.value if exists
    let nodeValueSum = 0;
    nodeGraph.eachNode(node => {
        const dataValue = node.getValue('value') as number;
        if (!isNaN(dataValue)) {
            nodeValues[node.dataIndex] = Math.max(dataValue, nodeValues[node.dataIndex] || 0);
        }
        if (!allZero && (nodeValues[node.dataIndex] > 0 || minAngle)) {
            // When allZero is false, angle is in direct proportion to node's
            // value
            renderedNodeCount++;
        }
        nodeValueSum += nodeValues[node.dataIndex] || 0;
    });

    if (renderedNodeCount === 0 || nodeValueSum === 0) {
        return;
    }
    if (padAngle * renderedNodeCount >= Math.abs(totalAngle)) {
        // Not enough angle to render the pad, minAngle has higher priority, and padAngle takes the rest
        padAngle = Math.max(0, (Math.abs(totalAngle) - minAngle * renderedNodeCount) / renderedNodeCount);
    }
    if ((padAngle + minAngle) * renderedNodeCount >= Math.abs(totalAngle)) {
        // Not enough angle to render the minAngle, so ignore the minAngle
        minAngle = (Math.abs(totalAngle) - padAngle * renderedNodeCount) / renderedNodeCount;
    }

    const unitAngle = (totalAngle - padAngle * renderedNodeCount * dir)
        / nodeValueSum;

    let totalDeficit = 0; // sum of deficits of nodes with span < minAngle
    let totalSurplus = 0; // sum of (spans - minAngle) of nodes with span > minAngle
    let totalSurplusSpan = 0; // sum of spans of nodes with span > minAngle
    let minSurplus = Infinity; // min of (spans - minAngle) of nodes with span > minAngle
    nodeGraph.eachNode(node => {
        const value = nodeValues[node.dataIndex] || 0;
        const spanAngle = unitAngle * (nodeValueSum ? value : 1) * dir;
        if (Math.abs(spanAngle) < minAngle) {
            totalDeficit += minAngle - Math.abs(spanAngle);
        }
        else {
            minSurplus = Math.min(minSurplus, Math.abs(spanAngle) - minAngle);
            totalSurplus += Math.abs(spanAngle) - minAngle;
            totalSurplusSpan += Math.abs(spanAngle);
        }
        node.setLayout({
            angle: spanAngle,
            value: value
        });
    });

    let surplusAsMuchAsPossible = false;
    if (totalDeficit > totalSurplus) {
        // Not enough angle to spread the nodes, scale all
        const scale = totalDeficit / totalSurplus;
        nodeGraph.eachNode(node => {
            const spanAngle = node.getLayout().angle;
            if (Math.abs(spanAngle) >= minAngle) {
                node.setLayout({
                    angle: spanAngle * scale,
                    ratio: scale
                }, true);
            }
            else {
                node.setLayout({
                    angle: minAngle,
                    ratio: minAngle === 0 ? 1 : spanAngle / minAngle
                }, true);
            }
        });
    }
    else {
        // For example, if totalDeficit is 60 degrees and totalSurplus is 70
        // degrees but one of the sector can only reduced by 1 degree,
        // if we decrease it with the ratio of value to other surplused nodes,
        // it will have smaller angle than minAngle itself.
        // So we need to borrow some angle from other nodes.
        nodeGraph.eachNode(node => {
            if (surplusAsMuchAsPossible) {
                return;
            }
            const spanAngle = node.getLayout().angle;
            const borrowRatio = Math.min(spanAngle / totalSurplusSpan, 1);
            const borrowAngle = borrowRatio * totalDeficit;
            if (spanAngle - borrowAngle < minAngle) {
                // It will have less than minAngle after borrowing
                surplusAsMuchAsPossible = true;
            }
        });
    }

    let restDeficit = totalDeficit;
    nodeGraph.eachNode(node => {
        if (restDeficit <= 0) {
            return;
        }

        const spanAngle = node.getLayout().angle;
        if (spanAngle > minAngle && minAngle > 0) {
            const borrowRatio = surplusAsMuchAsPossible
                ? 1
                : Math.min(spanAngle / totalSurplusSpan, 1);
            const maxBorrowAngle = spanAngle - minAngle;
            const borrowAngle = Math.min(maxBorrowAngle,
                Math.min(restDeficit, totalDeficit * borrowRatio)
            );
            restDeficit -= borrowAngle;
            node.setLayout({
                angle: spanAngle - borrowAngle,
                ratio: (spanAngle - borrowAngle) / spanAngle
            }, true);
        }
        else if (minAngle > 0) {
            node.setLayout({
                angle: minAngle,
                ratio: spanAngle === 0 ? 1 : minAngle / spanAngle
            }, true);
        }
    });

    let angle = normalizedStartAngle;
    const edgeAccAngle: number[] = [];
    nodeGraph.eachNode(node => {
        const spanAngle = Math.max(node.getLayout().angle, minAngle);
        node.setLayout({
            cx,
            cy,
            r0,
            r,
            startAngle: angle,
            endAngle: angle + spanAngle * dir,
            clockwise
        }, true);
        edgeAccAngle[node.dataIndex] = angle;
        angle += (spanAngle + padAngle) * dir;
    });

    nodeGraph.eachEdge(edge => {
        const value = allZero ? 1 : edge.getValue('value') as number;
        const spanAngle = unitAngle * (nodeValueSum ? value : 1) * dir;

        const node1Index = edge.node1.dataIndex;
        const sStartAngle = edgeAccAngle[node1Index] || 0;
        const sSpan = Math.abs((edge.node1.getLayout().ratio || 1) * spanAngle);
        const sEndAngle = sStartAngle + sSpan * dir;
        const s1 = [
            cx + r0 * Math.cos(sStartAngle),
            cy + r0 * Math.sin(sStartAngle)
        ];
        const s2 = [
            cx + r0 * Math.cos(sEndAngle),
            cy + r0 * Math.sin(sEndAngle)
        ];

        const node2Index = edge.node2.dataIndex;
        const tStartAngle = edgeAccAngle[node2Index] || 0;
        const tSpan = Math.abs((edge.node2.getLayout().ratio || 1) * spanAngle);
        const tEndAngle = tStartAngle + tSpan * dir;
        const t1 = [
            cx + r0 * Math.cos(tStartAngle),
            cy + r0 * Math.sin(tStartAngle)
        ];
        const t2 = [
            cx + r0 * Math.cos(tEndAngle),
            cy + r0 * Math.sin(tEndAngle)
        ];

        edge.setLayout({
            s1,
            s2,
            sStartAngle,
            sEndAngle,
            t1,
            t2,
            tStartAngle,
            tEndAngle,
            cx,
            cy,
            r: r0,
            value,
            clockwise
        });

        edgeAccAngle[node1Index] = sEndAngle;
        edgeAccAngle[node2Index] = tEndAngle;
    });
}
