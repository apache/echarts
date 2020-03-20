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

// @ts-nocheck

import * as zrUtil from 'zrender/src/core/util';
import List from '../../data/List';
import Graph from '../../data/Graph';
import linkList from '../../data/helper/linkList';
import createDimensions from '../../data/helper/createDimensions';
import CoordinateSystem from '../../CoordinateSystem';
import createListFromArray from './createListFromArray';

export default function (nodes, edges, seriesModel, directed, beforeLink) {
    // ??? TODO
    // support dataset?
    let graph = new Graph(directed);
    for (let i = 0; i < nodes.length; i++) {
        graph.addNode(zrUtil.retrieve(
            // Id, name, dataIndex
            nodes[i].id, nodes[i].name, i
        ), i);
    }

    let linkNameList = [];
    let validEdges = [];
    let linkCount = 0;
    for (let i = 0; i < edges.length; i++) {
        let link = edges[i];
        let source = link.source;
        let target = link.target;
        // addEdge may fail when source or target not exists
        if (graph.addEdge(source, target, linkCount)) {
            validEdges.push(link);
            linkNameList.push(zrUtil.retrieve(link.id, source + ' > ' + target));
            linkCount++;
        }
    }

    let coordSys = seriesModel.get('coordinateSystem');
    let nodeData;
    if (coordSys === 'cartesian2d' || coordSys === 'polar') {
        nodeData = createListFromArray(nodes, seriesModel);
    }
    else {
        let coordSysCtor = CoordinateSystem.get(coordSys);
        let coordDimensions = (coordSysCtor && coordSysCtor.type !== 'view')
            ? (coordSysCtor.dimensions || []) : [];
        // FIXME: Some geo do not need `value` dimenson, whereas `calendar` needs
        // `value` dimension, but graph need `value` dimension. It's better to
        // uniform this behavior.
        if (zrUtil.indexOf(coordDimensions, 'value') < 0) {
            coordDimensions.concat(['value']);
        }

        let dimensionNames = createDimensions(nodes, {
            coordDimensions: coordDimensions
        });
        nodeData = new List(dimensionNames, seriesModel);
        nodeData.initData(nodes);
    }

    let edgeData = new List(['value'], seriesModel);
    edgeData.initData(validEdges, linkNameList);

    beforeLink && beforeLink(nodeData, edgeData);

    linkList({
        mainData: nodeData,
        struct: graph,
        structAttr: 'graph',
        datas: {node: nodeData, edge: edgeData},
        datasAttr: {node: 'data', edge: 'edgeData'}
    });

    // Update dataIndex of nodes and edges because invalid edge may be removed
    graph.update();

    return graph;
}
