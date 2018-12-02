
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
 * For geo and graph.
 *
 * @param {Object} controllerHost
 * @param {module:zrender/Element} controllerHost.target
 */
function updateViewOnPan(controllerHost, dx, dy) {
  var target = controllerHost.target;
  var pos = target.position;
  pos[0] += dx;
  pos[1] += dy;
  target.dirty();
}
/**
 * For geo and graph.
 *
 * @param {Object} controllerHost
 * @param {module:zrender/Element} controllerHost.target
 * @param {number} controllerHost.zoom
 * @param {number} controllerHost.zoomLimit like: {min: 1, max: 2}
 */


function updateViewOnZoom(controllerHost, zoomDelta, zoomX, zoomY) {
  var target = controllerHost.target;
  var zoomLimit = controllerHost.zoomLimit;
  var pos = target.position;
  var scale = target.scale;
  var newZoom = controllerHost.zoom = controllerHost.zoom || 1;
  newZoom *= zoomDelta;

  if (zoomLimit) {
    var zoomMin = zoomLimit.min || 0;
    var zoomMax = zoomLimit.max || Infinity;
    newZoom = Math.max(Math.min(zoomMax, newZoom), zoomMin);
  }

  var zoomScale = newZoom / controllerHost.zoom;
  controllerHost.zoom = newZoom; // Keep the mouse center when scaling

  pos[0] -= (zoomX - pos[0]) * (zoomScale - 1);
  pos[1] -= (zoomY - pos[1]) * (zoomScale - 1);
  scale[0] *= zoomScale;
  scale[1] *= zoomScale;
  target.dirty();
}

exports.updateViewOnPan = updateViewOnPan;
exports.updateViewOnZoom = updateViewOnZoom;