
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
  var axis = this.getAxis();
  var val = dataItem instanceof Array ? dataItem[0] : dataItem;
  var halfSize = (dataSize instanceof Array ? dataSize[0] : dataSize) / 2;
  return axis.type === 'category' ? axis.getBandWidth() : Math.abs(axis.dataToCoord(val - halfSize) - axis.dataToCoord(val + halfSize));
}

function _default(coordSys) {
  var rect = coordSys.getRect();
  return {
    coordSys: {
      type: 'singleAxis',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    },
    api: {
      coord: function (val) {
        // do not provide "out" param
        return coordSys.dataToPoint(val);
      },
      size: zrUtil.bind(dataToCoordSize, coordSys)
    }
  };
}

module.exports = _default;