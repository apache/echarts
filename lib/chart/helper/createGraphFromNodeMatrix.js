
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

var zrUtil = require("zrender/lib/core/util");

var List = require("../../data/List");

var Graph = require("../../data/Graph");

var linkList = require("../../data/helper/linkList");

var createDimensions = require("../../data/helper/createDimensions");

var CoordinateSystem = require("../../CoordinateSystem");

var createListFromArray = require("./createListFromArray");

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

/**
 * 从邻接矩阵生成
 * ```
 *        TARGET
 *    -1--2--3--4--5-
 *  1| x  x  x  x  x
 *  2| x  x  x  x  x
 *  3| x  x  x  x  x  SOURCE
 *  4| x  x  x  x  x
 *  5| x  x  x  x  x
 * ```
 *
 * @param {Array.<Object>} nodes 节点信息
 * @param {Array} matrix 邻接矩阵
 * @param {module:echarts/model/Series}
 * @param {boolean} directed 是否是有向图
 * @return {module:echarts/data/Graph}
 */
function _default(nodes, matrix, hostModel, directed) {
  var graph = new Graph(directed);

  for (var i = 0; i < nodes.length; i++) {
    graph.addNode(zrUtil.retrieve( // Id, name, dataIndex
    nodes[i].id, nodes[i].name, i), i);
  }

  var size = matrix.length;
  var links = [];
  var linkCount = 0;

  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      var val = matrix[i][j];

      if (val === 0) {
        continue;
      }

      var n1 = graph.nodes[i];
      var n2 = graph.nodes[j];
      var edge = graph.addEdge(n1, n2, linkCount);

      if (edge) {
        linkCount++;
        links.push({
          value: val
        });
      }
    }
  }

  var coordSys = hostModel.get('coordinateSystem');
  var nodeData;

  if (coordSys === 'cartesian2d' || coordSys === 'polar') {
    nodeData = createListFromArray({
      data: nodes
    }, hostModel);
  } else {
    // FIXME
    var coordSysCtor = CoordinateSystem.get(coordSys); // FIXME

    var dimensionNames = createDimensions(nodes, {
      coordDimensions: (coordSysCtor && coordSysCtor.type !== 'view' ? coordSysCtor.dimensions || [] : []).concat(['value'])
    });
    nodeData = new List(dimensionNames, hostModel);
    nodeData.initData(nodes);
  }

  var edgeData = new List(['value'], hostModel);
  edgeData.initData(links);
  linkList({
    mainData: nodeData,
    struct: graph,
    structAttr: 'graph',
    datas: {
      node: nodeData,
      edge: edgeData
    },
    datasAttr: {
      node: 'data',
      edge: 'edgeData'
    }
  }); // Update dataIndex of nodes and edges because invalid edge may be removed

  graph.update();
  return graph;
}

module.exports = _default;