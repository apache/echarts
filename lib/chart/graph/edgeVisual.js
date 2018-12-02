
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
function normalize(a) {
  if (!(a instanceof Array)) {
    a = [a, a];
  }

  return a;
}

function _default(ecModel) {
  ecModel.eachSeriesByType('graph', function (seriesModel) {
    var graph = seriesModel.getGraph();
    var edgeData = seriesModel.getEdgeData();
    var symbolType = normalize(seriesModel.get('edgeSymbol'));
    var symbolSize = normalize(seriesModel.get('edgeSymbolSize'));
    var colorQuery = 'lineStyle.color'.split('.');
    var opacityQuery = 'lineStyle.opacity'.split('.');
    edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
    edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
    edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
    edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
    edgeData.setVisual('color', seriesModel.get(colorQuery));
    edgeData.setVisual('opacity', seriesModel.get(opacityQuery));
    edgeData.each(function (idx) {
      var itemModel = edgeData.getItemModel(idx);
      var edge = graph.getEdgeByIndex(idx);
      var symbolType = normalize(itemModel.getShallow('symbol', true));
      var symbolSize = normalize(itemModel.getShallow('symbolSize', true)); // Edge visual must after node visual

      var color = itemModel.get(colorQuery);
      var opacity = itemModel.get(opacityQuery);

      switch (color) {
        case 'source':
          color = edge.node1.getVisual('color');
          break;

        case 'target':
          color = edge.node2.getVisual('color');
          break;
      }

      symbolType[0] && edge.setVisual('fromSymbol', symbolType[0]);
      symbolType[1] && edge.setVisual('toSymbol', symbolType[1]);
      symbolSize[0] && edge.setVisual('fromSymbolSize', symbolSize[0]);
      symbolSize[1] && edge.setVisual('toSymbolSize', symbolSize[1]);
      edge.setVisual('color', color);
      edge.setVisual('opacity', opacity);
    });
  });
}

module.exports = _default;