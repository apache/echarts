
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

/**
 * @param {module:echarts/coord/View} view
 * @param {Object} payload
 * @param {Object} [zoomLimit]
 */
function updateCenterAndZoom(view, payload, zoomLimit) {
  var previousZoom = view.getZoom();
  var center = view.getCenter();
  var zoom = payload.zoom;
  var point = view.dataToPoint(center);

  if (payload.dx != null && payload.dy != null) {
    point[0] -= payload.dx;
    point[1] -= payload.dy;
    var center = view.pointToData(point);
    view.setCenter(center);
  }

  if (zoom != null) {
    if (zoomLimit) {
      var zoomMin = zoomLimit.min || 0;
      var zoomMax = zoomLimit.max || Infinity;
      zoom = Math.max(Math.min(previousZoom * zoom, zoomMax), zoomMin) / previousZoom;
    } // Zoom on given point(originX, originY)


    view.scale[0] *= zoom;
    view.scale[1] *= zoom;
    var position = view.position;
    var fixX = (payload.originX - position[0]) * (zoom - 1);
    var fixY = (payload.originY - position[1]) * (zoom - 1);
    position[0] -= fixX;
    position[1] -= fixY;
    view.updateTransform(); // Get the new center

    var center = view.pointToData(point);
    view.setCenter(center);
    view.setZoom(zoom * previousZoom);
  }

  return {
    center: view.getCenter(),
    zoom: view.getZoom()
  };
}

exports.updateCenterAndZoom = updateCenterAndZoom;