var echarts = require("echarts");

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
var _default = echarts.extendComponentView({
  type: 'bmap',
  render: function (bMapModel, ecModel, api) {
    var rendering = true;
    var bmap = bMapModel.getBMap();
    var viewportRoot = api.getZr().painter.getViewportRoot();
    var coordSys = bMapModel.coordinateSystem;

    var moveHandler = function (type, target) {
      if (rendering) {
        return;
      }

      var offsetEl = viewportRoot.parentNode.parentNode.parentNode;
      var mapOffset = [-parseInt(offsetEl.style.left, 10) || 0, -parseInt(offsetEl.style.top, 10) || 0];
      viewportRoot.style.left = mapOffset[0] + 'px';
      viewportRoot.style.top = mapOffset[1] + 'px';
      coordSys.setMapOffset(mapOffset);
      bMapModel.__mapOffset = mapOffset;
      api.dispatchAction({
        type: 'bmapRoam'
      });
    };

    function zoomEndHandler() {
      if (rendering) {
        return;
      }

      api.dispatchAction({
        type: 'bmapRoam'
      });
    }

    bmap.removeEventListener('moving', this._oldMoveHandler); // FIXME
    // Moveend may be triggered by centerAndZoom method when creating coordSys next time
    // bmap.removeEventListener('moveend', this._oldMoveHandler);

    bmap.removeEventListener('zoomend', this._oldZoomEndHandler);
    bmap.addEventListener('moving', moveHandler); // bmap.addEventListener('moveend', moveHandler);

    bmap.addEventListener('zoomend', zoomEndHandler);
    this._oldMoveHandler = moveHandler;
    this._oldZoomEndHandler = zoomEndHandler;
    var roam = bMapModel.get('roam');

    if (roam && roam !== 'scale') {
      bmap.enableDragging();
    } else {
      bmap.disableDragging();
    }

    if (roam && roam !== 'move') {
      bmap.enableScrollWheelZoom();
      bmap.enableDoubleClickZoom();
      bmap.enablePinchToZoom();
    } else {
      bmap.disableScrollWheelZoom();
      bmap.disableDoubleClickZoom();
      bmap.disablePinchToZoom();
    }

    var originalStyle = bMapModel.__mapStyle;
    var newMapStyle = bMapModel.get('mapStyle') || {}; // FIXME, Not use JSON methods

    var mapStyleStr = JSON.stringify(newMapStyle);

    if (JSON.stringify(originalStyle) !== mapStyleStr) {
      // FIXME May have blank tile when dragging if setMapStyle
      if (Object.keys(newMapStyle).length) {
        bmap.setMapStyle(newMapStyle);
      }

      bMapModel.__mapStyle = JSON.parse(mapStyleStr);
    }

    rendering = false;
  }
});

module.exports = _default;