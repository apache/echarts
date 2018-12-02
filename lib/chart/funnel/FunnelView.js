
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

var ChartView = require("../../view/Chart");

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
 * Piece of pie including Sector, Label, LabelLine
 * @constructor
 * @extends {module:zrender/graphic/Group}
 */
function FunnelPiece(data, idx) {
  graphic.Group.call(this);
  var polygon = new graphic.Polygon();
  var labelLine = new graphic.Polyline();
  var text = new graphic.Text();
  this.add(polygon);
  this.add(labelLine);
  this.add(text);
  this.updateData(data, idx, true); // Hover to change label and labelLine

  function onEmphasis() {
    labelLine.ignore = labelLine.hoverIgnore;
    text.ignore = text.hoverIgnore;
  }

  function onNormal() {
    labelLine.ignore = labelLine.normalIgnore;
    text.ignore = text.normalIgnore;
  }

  this.on('emphasis', onEmphasis).on('normal', onNormal).on('mouseover', onEmphasis).on('mouseout', onNormal);
}

var funnelPieceProto = FunnelPiece.prototype;
var opacityAccessPath = ['itemStyle', 'opacity'];

funnelPieceProto.updateData = function (data, idx, firstCreate) {
  var polygon = this.childAt(0);
  var seriesModel = data.hostModel;
  var itemModel = data.getItemModel(idx);
  var layout = data.getItemLayout(idx);
  var opacity = data.getItemModel(idx).get(opacityAccessPath);
  opacity = opacity == null ? 1 : opacity; // Reset style

  polygon.useStyle({});

  if (firstCreate) {
    polygon.setShape({
      points: layout.points
    });
    polygon.setStyle({
      opacity: 0
    });
    graphic.initProps(polygon, {
      style: {
        opacity: opacity
      }
    }, seriesModel, idx);
  } else {
    graphic.updateProps(polygon, {
      style: {
        opacity: opacity
      },
      shape: {
        points: layout.points
      }
    }, seriesModel, idx);
  } // Update common style


  var itemStyleModel = itemModel.getModel('itemStyle');
  var visualColor = data.getItemVisual(idx, 'color');
  polygon.setStyle(zrUtil.defaults({
    lineJoin: 'round',
    fill: visualColor
  }, itemStyleModel.getItemStyle(['opacity'])));
  polygon.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

  this._updateLabel(data, idx);

  graphic.setHoverStyle(this);
};

funnelPieceProto._updateLabel = function (data, idx) {
  var labelLine = this.childAt(1);
  var labelText = this.childAt(2);
  var seriesModel = data.hostModel;
  var itemModel = data.getItemModel(idx);
  var layout = data.getItemLayout(idx);
  var labelLayout = layout.label;
  var visualColor = data.getItemVisual(idx, 'color');
  graphic.updateProps(labelLine, {
    shape: {
      points: labelLayout.linePoints || labelLayout.linePoints
    }
  }, seriesModel, idx);
  graphic.updateProps(labelText, {
    style: {
      x: labelLayout.x,
      y: labelLayout.y
    }
  }, seriesModel, idx);
  labelText.attr({
    rotation: labelLayout.rotation,
    origin: [labelLayout.x, labelLayout.y],
    z2: 10
  });
  var labelModel = itemModel.getModel('label');
  var labelHoverModel = itemModel.getModel('emphasis.label');
  var labelLineModel = itemModel.getModel('labelLine');
  var labelLineHoverModel = itemModel.getModel('emphasis.labelLine');
  var visualColor = data.getItemVisual(idx, 'color');
  graphic.setLabelStyle(labelText.style, labelText.hoverStyle = {}, labelModel, labelHoverModel, {
    labelFetcher: data.hostModel,
    labelDataIndex: idx,
    defaultText: data.getName(idx),
    autoColor: visualColor,
    useInsideStyle: !!labelLayout.inside
  }, {
    textAlign: labelLayout.textAlign,
    textVerticalAlign: labelLayout.verticalAlign
  });
  labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
  labelText.hoverIgnore = !labelHoverModel.get('show');
  labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
  labelLine.hoverIgnore = !labelLineHoverModel.get('show'); // Default use item visual color

  labelLine.setStyle({
    stroke: visualColor
  });
  labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());
  labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();
};

zrUtil.inherits(FunnelPiece, graphic.Group);
var FunnelView = ChartView.extend({
  type: 'funnel',
  render: function (seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    var oldData = this._data;
    var group = this.group;
    data.diff(oldData).add(function (idx) {
      var funnelPiece = new FunnelPiece(data, idx);
      data.setItemGraphicEl(idx, funnelPiece);
      group.add(funnelPiece);
    }).update(function (newIdx, oldIdx) {
      var piePiece = oldData.getItemGraphicEl(oldIdx);
      piePiece.updateData(data, newIdx);
      group.add(piePiece);
      data.setItemGraphicEl(newIdx, piePiece);
    }).remove(function (idx) {
      var piePiece = oldData.getItemGraphicEl(idx);
      group.remove(piePiece);
    }).execute();
    this._data = data;
  },
  remove: function () {
    this.group.removeAll();
    this._data = null;
  },
  dispose: function () {}
});
var _default = FunnelView;
module.exports = _default;