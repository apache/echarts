
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

var echarts = require("../../echarts");

var RibbonPath = require("./Ribbon");

var graphic = require("../../util/graphic");

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
var _default = echarts.extendChartView({
  type: 'chord',
  init: function (option) {},
  render: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    var graph = seriesModel.getGraph();
    var edgeData = seriesModel.getEdgeData();
    var group = this.group;
    group.removeAll();
    data.each(function (idx) {
      var layout = data.getItemLayout(idx);
      var sector = new graphic.Sector({
        shape: {
          cx: layout.cx,
          cy: layout.cy,
          clockwise: layout.clockwise,
          r0: layout.r0,
          r: layout.r,
          startAngle: layout.startAngle,
          endAngle: layout.endAngle
        }
      });
      sector.setStyle({
        fill: data.getItemVisual(idx, 'color')
      });
      data.setItemLayout(idx);
      group.add(sector);
    });
    var edgeRendered = {};
    edgeData.each(function (idx) {
      if (edgeRendered[idx]) {
        return;
      }

      var layout = edgeData.getItemLayout(idx);
      var edge = graph.getEdgeByIndex(idx);
      var otherEdge = graph.getEdge(edge.node2, edge.node1);
      var otherEdgeLayout = otherEdge.getLayout();
      edgeRendered[idx] = edgeRendered[otherEdge.dataIndex] = true;
      var ribbon = new RibbonPath({
        shape: {
          cx: layout.cx,
          cy: layout.cy,
          r: layout.r,
          s0: layout.startAngle,
          s1: layout.endAngle,
          t0: otherEdgeLayout.startAngle,
          t1: otherEdgeLayout.endAngle,
          clockwise: layout.clockwise
        }
      });
      ribbon.setStyle({
        // Use color of source
        fill: edge.node1.getVisual('color'),
        opacity: 0.5
      });
      group.add(ribbon);
    });
  },
  dispose: function () {}
});

module.exports = _default;