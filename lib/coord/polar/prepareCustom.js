
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
function dataToCoordSize(dataSize, dataItem) {
  // dataItem is necessary in log axis.
  return zrUtil.map(['Radius', 'Angle'], function (dim, dimIdx) {
    var axis = this['get' + dim + 'Axis']();
    var val = dataItem[dimIdx];
    var halfSize = dataSize[dimIdx] / 2;
    var method = 'dataTo' + dim;
    var result = axis.type === 'category' ? axis.getBandWidth() : Math.abs(axis[method](val - halfSize) - axis[method](val + halfSize));

    if (dim === 'Angle') {
      result = result * Math.PI / 180;
    }

    return result;
  }, this);
}

function _default(coordSys) {
  var radiusAxis = coordSys.getRadiusAxis();
  var angleAxis = coordSys.getAngleAxis();
  var radius = radiusAxis.getExtent();
  radius[0] > radius[1] && radius.reverse();
  return {
    coordSys: {
      type: 'polar',
      cx: coordSys.cx,
      cy: coordSys.cy,
      r: radius[1],
      r0: radius[0]
    },
    api: {
      coord: zrUtil.bind(function (data) {
        var radius = radiusAxis.dataToRadius(data[0]);
        var angle = angleAxis.dataToAngle(data[1]);
        var coord = coordSys.coordToPoint([radius, angle]);
        coord.push(radius, angle * Math.PI / 180);
        return coord;
      }),
      size: zrUtil.bind(dataToCoordSize, coordSys)
    }
  };
}

module.exports = _default;