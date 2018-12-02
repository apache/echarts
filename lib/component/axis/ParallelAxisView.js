
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

var zrUtil = require("zrender/lib/core/util");

var AxisBuilder = require("./AxisBuilder");

var BrushController = require("../helper/BrushController");

var brushHelper = require("../helper/brushHelper");

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
var elementList = ['axisLine', 'axisTickLabel', 'axisName'];
var AxisView = echarts.extendComponentView({
  type: 'parallelAxis',

  /**
   * @override
   */
  init: function (ecModel, api) {
    AxisView.superApply(this, 'init', arguments);
    /**
     * @type {module:echarts/component/helper/BrushController}
     */

    (this._brushController = new BrushController(api.getZr())).on('brush', zrUtil.bind(this._onBrush, this));
  },

  /**
   * @override
   */
  render: function (axisModel, ecModel, api, payload) {
    if (fromAxisAreaSelect(axisModel, ecModel, payload)) {
      return;
    }

    this.axisModel = axisModel;
    this.api = api;
    this.group.removeAll();
    var oldAxisGroup = this._axisGroup;
    this._axisGroup = new graphic.Group();
    this.group.add(this._axisGroup);

    if (!axisModel.get('show')) {
      return;
    }

    var coordSysModel = getCoordSysModel(axisModel, ecModel);
    var coordSys = coordSysModel.coordinateSystem;
    var areaSelectStyle = axisModel.getAreaSelectStyle();
    var areaWidth = areaSelectStyle.width;
    var dim = axisModel.axis.dim;
    var axisLayout = coordSys.getAxisLayout(dim);
    var builderOpt = zrUtil.extend({
      strokeContainThreshold: areaWidth
    }, axisLayout);
    var axisBuilder = new AxisBuilder(axisModel, builderOpt);
    zrUtil.each(elementList, axisBuilder.add, axisBuilder);

    this._axisGroup.add(axisBuilder.getGroup());

    this._refreshBrushController(builderOpt, areaSelectStyle, axisModel, coordSysModel, areaWidth, api);

    var animationModel = payload && payload.animation === false ? null : axisModel;
    graphic.groupTransition(oldAxisGroup, this._axisGroup, animationModel);
  },
  // /**
  //  * @override
  //  */
  // updateVisual: function (axisModel, ecModel, api, payload) {
  //     this._brushController && this._brushController
  //         .updateCovers(getCoverInfoList(axisModel));
  // },
  _refreshBrushController: function (builderOpt, areaSelectStyle, axisModel, coordSysModel, areaWidth, api) {
    // After filtering, axis may change, select area needs to be update.
    var extent = axisModel.axis.getExtent();
    var extentLen = extent[1] - extent[0];
    var extra = Math.min(30, Math.abs(extentLen) * 0.1); // Arbitrary value.
    // width/height might be negative, which will be
    // normalized in BoundingRect.

    var rect = graphic.BoundingRect.create({
      x: extent[0],
      y: -areaWidth / 2,
      width: extentLen,
      height: areaWidth
    });
    rect.x -= extra;
    rect.width += 2 * extra;

    this._brushController.mount({
      enableGlobalPan: true,
      rotation: builderOpt.rotation,
      position: builderOpt.position
    }).setPanels([{
      panelId: 'pl',
      clipPath: brushHelper.makeRectPanelClipPath(rect),
      isTargetByCursor: brushHelper.makeRectIsTargetByCursor(rect, api, coordSysModel),
      getLinearBrushOtherExtent: brushHelper.makeLinearBrushOtherExtent(rect, 0)
    }]).enableBrush({
      brushType: 'lineX',
      brushStyle: areaSelectStyle,
      removeOnClick: true
    }).updateCovers(getCoverInfoList(axisModel));
  },
  _onBrush: function (coverInfoList, opt) {
    // Do not cache these object, because the mey be changed.
    var axisModel = this.axisModel;
    var axis = axisModel.axis;
    var intervals = zrUtil.map(coverInfoList, function (coverInfo) {
      return [axis.coordToData(coverInfo.range[0], true), axis.coordToData(coverInfo.range[1], true)];
    }); // If realtime is true, action is not dispatched on drag end, because
    // the drag end emits the same params with the last drag move event,
    // and may have some delay when using touch pad.

    if (!axisModel.option.realtime === opt.isEnd || opt.removeOnClick) {
      // jshint ignore:line
      this.api.dispatchAction({
        type: 'axisAreaSelect',
        parallelAxisId: axisModel.id,
        intervals: intervals
      });
    }
  },

  /**
   * @override
   */
  dispose: function () {
    this._brushController.dispose();
  }
});

function fromAxisAreaSelect(axisModel, ecModel, payload) {
  return payload && payload.type === 'axisAreaSelect' && ecModel.findComponents({
    mainType: 'parallelAxis',
    query: payload
  })[0] === axisModel;
}

function getCoverInfoList(axisModel) {
  var axis = axisModel.axis;
  return zrUtil.map(axisModel.activeIntervals, function (interval) {
    return {
      brushType: 'lineX',
      panelId: 'pl',
      range: [axis.dataToCoord(interval[0], true), axis.dataToCoord(interval[1], true)]
    };
  });
}

function getCoordSysModel(axisModel, ecModel) {
  return ecModel.getComponent('parallel', axisModel.get('parallelIndex'));
}

var _default = AxisView;
module.exports = _default;