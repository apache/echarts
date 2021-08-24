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
import SeriesData from '../../data/SeriesData';
import Graph from '../../data/Graph';
import linkSeriesData from '../../data/helper/linkSeriesData';
import prepareSeriesDataSchema from '../../data/helper/createDimensions';
import CoordinateSystem from '../../core/CoordinateSystem';
import createSeriesData from './createSeriesData';
import {
    OptionSourceDataOriginal, GraphEdgeItemObject, OptionDataValue,
    OptionDataItemObject
} from '../../util/types';
import SeriesModel from '../../model/Series';
import { convertOptionIdName } from '../../util/model';

export default function createGraphFromNodeEdge(
    nodes: OptionSourceDataOriginal<OptionDataValue, OptionDataItemObject<OptionDataValue>>,
    edges: OptionSourceDataOriginal<OptionDataValue, GraphEdgeItemObject<OptionDataValue>>,
    seriesModel: SeriesModel,
    directed: boolean,
    beforeLink: (nodeData: SeriesData, edgeData: SeriesData) => void
): Graph {
    // ??? TODO
    // support dataset?
    const graph = new Graph(directed);
    for (let i = 0; i < nodes.length; i++) {
        graph.addNode(zrUtil.retrieve(
            // Id, name, dataIndex
            nodes[i].id, nodes[i].name, i
        ), i);
    }

    const linkNameList = [];
    const validEdges = [];
    let linkCount = 0;
    for (let i = 0; i < edges.length; i++) {
        const link = edges[i];
        const source = link.source;
        const target = link.target;
        // addEdge may fail when source or target not exists
        if (graph.addEdge(source, target, linkCount)) {
            validEdges.push(link);
            linkNameList.push(zrUtil.retrieve(
                convertOptionIdName(link.id, null),
                source + ' > ' + target
            ));
            linkCount++;
        }
    }

    const coordSys = seriesModel.get('coordinateSystem');
    let nodeData;
    if (coordSys === 'cartesian2d' || coordSys === 'polar') {
        nodeData = createSeriesData(nodes, seriesModel);
    }
    else {
        const coordSysCtor = CoordinateSystem.get(coordSys);
        const coordDimensions = coordSysCtor
            ? (coordSysCtor.dimensions || []) : [];
        // FIXME: Some geo do not need `value` dimenson, whereas `calendar` needs
        // `value` dimension, but graph need `value` dimension. It's better to
        // uniform this behavior.
        if (zrUtil.indexOf(coordDimensions, 'value') < 0) {
            coordDimensions.concat(['value']);
        }

        const { dimensions } = prepareSeriesDataSchema(nodes, {
            coordDimensions: coordDimensions,
            encodeDefine: seriesModel.getEncode()
        });
        nodeData = new SeriesData(dimensions, seriesModel);
        nodeData.initData(nodes);
    }

    const edgeData = new SeriesData(['value'], seriesModel);
    edgeData.initData(validEdges, linkNameList);

    beforeLink && beforeLink(nodeData, edgeData);

    linkSeriesData({
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
