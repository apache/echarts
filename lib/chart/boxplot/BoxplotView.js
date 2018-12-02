
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

var ChartView = require("../../view/Chart");

var graphic = require("../../util/graphic");

var Path = require("zrender/lib/graphic/Path");

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
// Update common properties
var NORMAL_ITEM_STYLE_PATH = ['itemStyle'];
var EMPHASIS_ITEM_STYLE_PATH = ['emphasis', 'itemStyle'];
var BoxplotView = ChartView.extend({
  type: 'boxplot',
  render: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    var group = this.group;
    var oldData = this._data; // There is no old data only when first rendering or switching from
    // stream mode to normal mode, where previous elements should be removed.

    if (!this._data) {
      group.removeAll();
    }

    var constDim = seriesModel.get('layout') === 'horizontal' ? 1 : 0;
    data.diff(oldData).add(function (newIdx) {
      if (data.hasValue(newIdx)) {
        var itemLayout = data.getItemLayout(newIdx);
        var symbolEl = createNormalBox(itemLayout, data, newIdx, constDim, true);
        data.setItemGraphicEl(newIdx, symbolEl);
        group.add(symbolEl);
      }
    }).update(function (newIdx, oldIdx) {
      var symbolEl = oldData.getItemGraphicEl(oldIdx); // Empty data

      if (!data.hasValue(newIdx)) {
        group.remove(symbolEl);
        return;
      }

      var itemLayout = data.getItemLayout(newIdx);

      if (!symbolEl) {
        symbolEl = createNormalBox(itemLayout, data, newIdx, constDim);
      } else {
        updateNormalBoxData(itemLayout, symbolEl, data, newIdx);
      }

      group.add(symbolEl);
      data.setItemGraphicEl(newIdx, symbolEl);
    }).remove(function (oldIdx) {
      var el = oldData.getItemGraphicEl(oldIdx);
      el && group.remove(el);
    }).execute();
    this._data = data;
  },
  remove: function (ecModel) {
    var group = this.group;
    var data = this._data;
    this._data = null;
    data && data.eachItemGraphicEl(function (el) {
      el && group.remove(el);
    });
  },
  dispose: zrUtil.noop
});
var BoxPath = Path.extend({
  type: 'boxplotBoxPath',
  shape: {},
  buildPath: function (ctx, shape) {
    var ends = shape.points;
    var i = 0;
    ctx.moveTo(ends[i][0], ends[i][1]);
    i++;

    for (; i < 4; i++) {
      ctx.lineTo(ends[i][0], ends[i][1]);
    }

    ctx.closePath();

    for (; i < ends.length; i++) {
      ctx.moveTo(ends[i][0], ends[i][1]);
      i++;
      ctx.lineTo(ends[i][0], ends[i][1]);
    }
  }
});

function createNormalBox(itemLayout, data, dataIndex, constDim, isInit) {
  var ends = itemLayout.ends;
  var el = new BoxPath({
    shape: {
      points: isInit ? transInit(ends, constDim, itemLayout) : ends
    }
  });
  updateNormalBoxData(itemLayout, el, data, dataIndex, isInit);
  return el;
}

function updateNormalBoxData(itemLayout, el, data, dataIndex, isInit) {
  var seriesModel = data.hostModel;
  var updateMethod = graphic[isInit ? 'initProps' : 'updateProps'];
  updateMethod(el, {
    shape: {
      points: itemLayout.ends
    }
  }, seriesModel, dataIndex);
  var itemModel = data.getItemModel(dataIndex);
  var normalItemStyleModel = itemModel.getModel(NORMAL_ITEM_STYLE_PATH);
  var borderColor = data.getItemVisual(dataIndex, 'color'); // Exclude borderColor.

  var itemStyle = normalItemStyleModel.getItemStyle(['borderColor']);
  itemStyle.stroke = borderColor;
  itemStyle.strokeNoScale = true;
  el.useStyle(itemStyle);
  el.z2 = 100;
  var hoverStyle = itemModel.getModel(EMPHASIS_ITEM_STYLE_PATH).getItemStyle();
  graphic.setHoverStyle(el, hoverStyle);
}

function transInit(points, dim, itemLayout) {
  return zrUtil.map(points, function (point) {
    point = point.slice();
    point[dim] = itemLayout.initBaseline;
    return point;
  });
}

var _default = BoxplotView;
module.exports = _default;