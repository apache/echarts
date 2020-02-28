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

import * as zrUtil from 'zrender/src/core/util';
import * as formatUtil from '../../util/format';
import { Dictionary } from '../../util/types';


export interface DataZoomPayloadBatchItem {
    dataZoomId: string
    start?: number
    end?: number
    startValue?: number
    endValue?: number
}

const AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle', 'single'] as const;
// Supported coords.
const COORDS = ['cartesian2d', 'polar', 'singleAxis'] as const;

export function isCoordSupported(coordType: string) {
    return zrUtil.indexOf(COORDS, coordType) >= 0;
}

type AxisAttrMap = {
    // TODO zAxis ?
    'axisIndex': 'xAxisIndex' | 'yAxisIndex' | 'radiusAxisIndex' | 'angleAxisIndex' | 'singleAxisIndex'
    'axis': 'xAxis' | 'yAxis' | 'radiusAxis' | 'angleAxis' | 'singleAxis'
    'axisId': 'xAxisId' | 'yAxisId' | 'radiusAxisId' | 'angleAxisId' | 'singleAxisId'
}
/**
 * Create "each" method to iterate names.
 */
function createNameEach<T extends string>(names: readonly T[]) {
    const attrs = ['axisIndex', 'axis', 'axisId'] as const;
    const capitalNames = zrUtil.map(names.slice(), formatUtil.capitalFirst);
    const capitalAttrs = zrUtil.map((attrs || []).slice(), formatUtil.capitalFirst);

    type NameObj = {
        name: T,
        capital: string,
        axisIndex: AxisAttrMap['axisIndex']
        axis: AxisAttrMap['axis']
        axisId: AxisAttrMap['axisId']
    };
    return function<Ctx> (
        callback: (this: Ctx, nameObj: NameObj) => void,
        context?: Ctx
    ) {
        zrUtil.each(names, function (name, index) {
            var nameObj = {
                name: name,
                capital: capitalNames[index]
            } as NameObj;

            for (var j = 0; j < attrs.length; j++) {
                nameObj[attrs[j]] = (name + capitalAttrs[j]) as never;
            }

            callback.call(context, nameObj);
        });
    };
}

/**
 * Iterate each dimension name.
 *
 * @public
 * @param callback The parameter is like:
 *                            {
 *                                name: 'angle',
 *                                capital: 'Angle',
 *                                axis: 'angleAxis',
 *                                axisIndex: 'angleAxisIndex',
 *                                index: 'angleIndex'
 *                            }
 * @param context
 */
export var eachAxisDim = createNameEach(AXIS_DIMS);

/**
 * If tow dataZoomModels has the same axis controlled, we say that they are 'linked'.
 * dataZoomModels and 'links' make up one or more graphics.
 * This function finds the graphic where the source dataZoomModel is in.
 *
 * @public
 * @param forEachNode Node iterator.
 * @param forEachEdgeType edgeType iterator
 * @param edgeIdGetter Giving node and edgeType, return an array of edge id.
 * @return Input: sourceNode, Output: Like {nodes: [], dims: {}}
 */
export function createLinkedNodesFinder<N, E extends {name: string}>(
    forEachNode: (cb: (node: N) => void) => void,
    forEachEdgeType: (cb: (edge: E) => void) => void,
    edgeIdGetter: (node: N, edge: E) => number[]
) {

    type Result = {
        nodes: N[]
        // key: edgeType.name, value: Object (key: edge id, value: boolean).
        records: Dictionary<Dictionary<boolean>>
    }
    return function (sourceNode: N) {
        var result: Result = {
            nodes: [],
            records: {}
        };

        forEachEdgeType(function (edgeType) {
            result.records[edgeType.name] = {};
        });

        if (!sourceNode) {
            return result;
        }

        absorb(sourceNode, result);

        var existsLink;
        do {
            existsLink = false;
            forEachNode(processSingleNode);
        }
        while (existsLink);

        function processSingleNode(node: N) {
            if (!isNodeAbsorded(node, result) && isLinked(node, result)) {
                absorb(node, result);
                existsLink = true;
            }
        }

        return result;
    };

    function isNodeAbsorded(node: N, result: Result) {
        return zrUtil.indexOf(result.nodes, node) >= 0;
    }

    function isLinked(node: N, result: Result) {
        var hasLink = false;
        forEachEdgeType(function (edgeType: E) {
            zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                result.records[edgeType.name][edgeId] && (hasLink = true);
            });
        });
        return hasLink;
    }

    function absorb(node: N, result: Result) {
        result.nodes.push(node);
        forEachEdgeType(function (edgeType: E) {
            zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                result.records[edgeType.name][edgeId] = true;
            });
        });
    }
}
