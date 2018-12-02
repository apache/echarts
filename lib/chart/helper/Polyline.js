
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

var graphic = require("../../util/graphic");

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

/**
 * @module echarts/chart/helper/Line
 */

/**
 * @constructor
 * @extends {module:zrender/graphic/Group}
 * @alias {module:echarts/chart/helper/Polyline}
 */
function Polyline(lineData, idx, seriesScope) {
  graphic.Group.call(this);

  this._createPolyline(lineData, idx, seriesScope);
}

var polylineProto = Polyline.prototype;

polylineProto._createPolyline = function (lineData, idx, seriesScope) {
  // var seriesModel = lineData.hostModel;
  var points = lineData.getItemLayout(idx);
  var line = new graphic.Polyline({
    shape: {
      points: points
    }
  });
  this.add(line);

  this._updateCommonStl(lineData, idx, seriesScope);
};

polylineProto.updateData = function (lineData, idx, seriesScope) {
  var seriesModel = lineData.hostModel;
  var line = this.childAt(0);
  var target = {
    shape: {
      points: lineData.getItemLayout(idx)
    }
  };
  graphic.updateProps(line, target, seriesModel, idx);

  this._updateCommonStl(lineData, idx, seriesScope);
};

polylineProto._updateCommonStl = function (lineData, idx, seriesScope) {
  var line = this.childAt(0);
  var itemModel = lineData.getItemModel(idx);
  var visualColor = lineData.getItemVisual(idx, 'color');
  var lineStyle = seriesScope && seriesScope.lineStyle;
  var hoverLineStyle = seriesScope && seriesScope.hoverLineStyle;

  if (!seriesScope || lineData.hasItemOption) {
    lineStyle = itemModel.getModel('lineStyle').getLineStyle();
    hoverLineStyle = itemModel.getModel('emphasis.lineStyle').getLineStyle();
  }

  line.useStyle(zrUtil.defaults({
    strokeNoScale: true,
    fill: 'none',
    stroke: visualColor
  }, lineStyle));
  line.hoverStyle = hoverLineStyle;
  graphic.setHoverStyle(this);
};

polylineProto.updateLayout = function (lineData, idx) {
  var polyline = this.childAt(0);
  polyline.setShape('points', lineData.getItemLayout(idx));
};

zrUtil.inherits(Polyline, graphic.Group);
var _default = Polyline;
module.exports = _default;