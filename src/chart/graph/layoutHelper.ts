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

import Graph, { GraphEdge, GraphNode } from '../../data/Graph';
import { sub, VectorArray } from 'zrender/src/core/vector';
import { assert, bind, each, retrieve2 } from 'zrender/src/core/util';
import { GraphEdgeItemOption } from './GraphSeries';
import { getSymbolSize } from './graphHelper';


type Radian = number;

type NodeAttrOnEdge = 'node1' | 'node2';

interface EdgeWrap {
    /**
     * Vector of the tangent line at the center node.
     */
    tangentVec: VectorArray;
    /**
     * Radian of tangentVec (to x positive) of tangentVec. [-Math.PI / 2, Math.PI / 2].
     */
    radToXPosi: Radian;
}

interface SectionWrap {
    /**
     * Radian of tangentVec (to x positive) of tangentVec. [-Math.PI / 2, Math.PI / 2].
     * Make sure radToXPosiStart <= radToXPosiEnd.
     */
    radToXPosiStart: Radian;
    radToXPosiEnd: Radian;

    /**
     * The count of edges that assign to this section.
     */
    edgeCount: number;
}

const MATH_PI = Math.PI;
const MATH_2PI = MATH_PI * 2;

/**
 * This is the radian of the intersection angle of the two control
 * point of a self-loop cubic bezier edge.
 * If the angle is bigger or smaller, the cubic curve is not pretty.
 */
const MAX_EDGE_SECTION_RADIAN = MATH_PI - getRadianToXPositive([4, 5.5]) * 2;
const MIN_EDGE_SECTION_RADIAN = MATH_PI / 3;


/**
 * @caution This method should only be called after all
 * nodes and non-self-loop edges layout finished.
 *
 * @note [Self-loop edge layout strategy]:
 * To make it have good looking when there are muliple self-loop edges,
 * place them from the biggest angle (> 60 degree) one by one.
 * If there is no enough angles, put mulitple edges in one angle
 * and use different curvenesses.
 *
 * @pending Should the section angle and self-loop edge direction be able to set by user?
 * `curveness` can not express it.
 *
 * @pending Consider the self-loop edge might overlow the canvas.
 * When calculating the view transform, there is no self-loop layout info yet.
 */
export function layoutSelfLoopEdges(
    graph: Graph,
    // Get from `getNodeGlobalScale(seriesModel)`
    nodeScaleOnCoordSys: number
): void {
    graph.eachNode(node => {
        const selfLoopEdges: GraphEdge[] = [];
        // inEdges includes outEdges if self-loop.
        each(node.inEdges, edge => {
            if (isSelfLoopEdge(edge)) {
                selfLoopEdges.push(edge);
            }
        });

        if (selfLoopEdges.length) {
            const sectionList = prepareSectionList(node, selfLoopEdges.length);
            placeSelfLoopEdges(node, sectionList, selfLoopEdges, nodeScaleOnCoordSys);
        }
    });
}

/**
 * @return Sections that can arrange self-loop angles. Ensure that:
 *         `selfLoopEdgeCount <= sectionList.reduce((sum, sec) === sec.edgeCount + sum, 0)`
 */
function prepareSectionList(centerNode: GraphNode, selfLoopEdgeCount: number): SectionWrap[] {
    const adjacentEdges: EdgeWrap[] = [];
    function addAdjacentEdge(centerNodeAttr: NodeAttrOnEdge, edge: GraphEdge): void {
        if (isSelfLoopEdge(edge)) {
            return;
        }
        const tangentVec = getTangentVector(edge, centerNodeAttr);
        const radToXPosi = getRadianToXPositive(tangentVec);
        adjacentEdges.push({ tangentVec, radToXPosi });
    }
    each(centerNode.inEdges, bind(addAdjacentEdge, null, 'node2'));
    each(centerNode.outEdges, bind(addAdjacentEdge, null, 'node1'));

    // Sort by radian asc.
    adjacentEdges.sort((edgeA, edgeB) => edgeA.radToXPosi - edgeB.radToXPosi);

    let availableEdgeCount = 0;
    const sectionList: SectionWrap[] = [];
    for (let i = 0, len = adjacentEdges.length; i < len; i++) {
        const radToXPosiStart = adjacentEdges[i].radToXPosi;
        const radToXPosiEnd = i < len - 1
            ? adjacentEdges[i + 1].radToXPosi
            : adjacentEdges[0].radToXPosi + MATH_2PI;

        // Make sure radToXPosiStart <= radToXPosiEnd.
        const rad2Minus1 = radToXPosiEnd - radToXPosiStart;

        if (rad2Minus1 >= MIN_EDGE_SECTION_RADIAN) {
            sectionList.push({ radToXPosiStart, radToXPosiEnd, edgeCount: 0 });
        }
        availableEdgeCount += rad2Minus1 / MIN_EDGE_SECTION_RADIAN;
    }

    if (availableEdgeCount >= selfLoopEdgeCount) {
        for (let iEdge = 0; iEdge < selfLoopEdgeCount; iEdge++) {
            // Find the largest section to arrange an edge.
            let iSecInMax = 0;
            let secRadInMax = 0;
            for (let iSec = 0; iSec < sectionList.length; iSec++) {
                const thisSec = sectionList[iSec];
                // If a section is too larger than anohter section, split that large section and
                // arrange multiple edges in it is probably better then arrange only one edge in
                // the large section.
                const rad = (thisSec.radToXPosiEnd - thisSec.radToXPosiStart) / (thisSec.edgeCount + 1);
                if (rad > secRadInMax) {
                    secRadInMax = rad;
                    iSecInMax = iSec;
                }
            }
            sectionList[iSecInMax].edgeCount++;
        }
    }
    // In this case there are probably too many edge on a node, and intersection between
    // edges can not avoid. So we do not care about intersection any more.
    else {
        sectionList.length = 0;
        sectionList.push({
            radToXPosiStart: -MATH_PI / 2,
            radToXPosiEnd: -MATH_PI / 2 + MATH_2PI,
            edgeCount: selfLoopEdgeCount
        });
    }

    return sectionList;
}

/**
 * @return cubic bezier curve: [p1, p2, cp1, cp2]
 */
function placeSelfLoopEdges(
    centerNode: GraphNode,
    sectionList: SectionWrap[],
    selfLoopEdges: GraphEdge[],
    nodeScaleOnCoordSys: number
): void {
    const symbolSize = getSymbolSize(centerNode);
    const centerPt = centerNode.getLayout();

    function getCubicControlPoint(radToXPosi: number, cpDistToCenter: number): number[] {
        return [
            Math.cos(radToXPosi) * cpDistToCenter + centerPt[0],
            Math.sin(radToXPosi) * cpDistToCenter + centerPt[1]
        ];
    };

    let iEdge = 0;
    each(sectionList, section => {
        const secEdgeCount = section.edgeCount;
        if (!secEdgeCount) {
            // No self-loop edge arranged in this section.
            return;
        }

        const secRadStart = section.radToXPosiStart;
        const secRadEnd = section.radToXPosiEnd;
        const splitRadHalfSpan = (secRadEnd - secRadStart) / section.edgeCount / 2;
        const edgeRadHalfSpan = Math.min(splitRadHalfSpan, MAX_EDGE_SECTION_RADIAN / 2);

        // const radMid = secRadStart + secRadSpan / section.edgeCount * (iEdge - iEdgeFirstInSec);
        for (let iEdgeInSec = 0; iEdgeInSec < section.edgeCount; iEdgeInSec++) {
            const edge = selfLoopEdges[iEdge++];
            const cpMidRad = secRadStart + splitRadHalfSpan * (iEdgeInSec * 2 + 1);

            // This is a experimental strategy to make it look better:
            // If the symbol size is small, the bezier control point need to be far from the
            // center to make the buckle obvious, while if the symbol size is big, the control
            // ponit should not too far to make the buckle too significant.
            // So we alway make control point dist to symbol radius `100`, and enable users to
            // use option `curveness` to adjust it.
            // Becuase at present we do not layout multiple self-loop edges into single
            // `[cp1Rad, cp2Rad]`, we do not use option `autoCurveness`.
            const curveness = retrieve2(
                edge.getModel<GraphEdgeItemOption>().get(['lineStyle', 'curveness']),
                0
            );
            const cpDistToCenter = (symbolSize / 2 + 100) * nodeScaleOnCoordSys
                * (curveness + 1)
                // Formula:
                // If `cpDistToCenter = symbolSize / 2 * nodeScaleOnCoordSys / 3 * 4 / Math.cos(edgeRadHalfSpan)`,
                // the control point can be tangent to the symbol circle.
                // Hint: `distCubicMiddlePtToCenterPt / 3 * 4` get the hight of the isosceles triangle made by
                // control points and center point.
                / 3 * 4 / Math.cos(edgeRadHalfSpan);

            edge.setLayout([
                centerPt.slice(),
                centerPt.slice(),
                getCubicControlPoint(cpMidRad - edgeRadHalfSpan, cpDistToCenter),
                getCubicControlPoint(cpMidRad + edgeRadHalfSpan, cpDistToCenter)
            ]);
        }
    });
    assert(iEdge === selfLoopEdges.length);

}

/**
 * @return vector representing the tangant line
 *         (from edge['node1' | 'node2'] to cp1 of the cubic bezier curve)
 */
function getTangentVector(edge: GraphEdge, nodeAttr: NodeAttrOnEdge): VectorArray {
    // points is [p1, p2] or [p1, p2, cp1].
    const points = edge.getLayout();
    const targetPt = points[2] ? points[2] : points[1];
    return sub([], targetPt, edge[nodeAttr].getLayout());
}

function getRadianToXPositive(vec: VectorArray): Radian {
    return Math.atan2(vec[1], vec[0]);
}

export function isSelfLoopEdge(edge: GraphEdge): boolean {
    return edge.node1 === edge.node2;
}
