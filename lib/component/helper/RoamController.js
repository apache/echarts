
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

var Eventful = require("zrender/lib/mixin/Eventful");

var eventTool = require("zrender/lib/core/event");

var interactionMutex = require("./interactionMutex");

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
 * @alias module:echarts/component/helper/RoamController
 * @constructor
 * @mixin {module:zrender/mixin/Eventful}
 *
 * @param {module:zrender/zrender~ZRender} zr
 */
function RoamController(zr) {
  /**
   * @type {Function}
   */
  this.pointerChecker;
  /**
   * @type {module:zrender}
   */

  this._zr = zr;
  /**
   * @type {Object}
   */

  this._opt = {}; // Avoid two roamController bind the same handler

  var bind = zrUtil.bind;
  var mousedownHandler = bind(mousedown, this);
  var mousemoveHandler = bind(mousemove, this);
  var mouseupHandler = bind(mouseup, this);
  var mousewheelHandler = bind(mousewheel, this);
  var pinchHandler = bind(pinch, this);
  Eventful.call(this);
  /**
   * @param {Function} pointerChecker
   *                   input: x, y
   *                   output: boolean
   */

  this.setPointerChecker = function (pointerChecker) {
    this.pointerChecker = pointerChecker;
  };
  /**
   * Notice: only enable needed types. For example, if 'zoom'
   * is not needed, 'zoom' should not be enabled, otherwise
   * default mousewheel behaviour (scroll page) will be disabled.
   *
   * @param  {boolean|string} [controlType=true] Specify the control type,
   *                          which can be null/undefined or true/false
   *                          or 'pan/move' or 'zoom'/'scale'
   * @param {Object} [opt]
   * @param {Object} [opt.zoomOnMouseWheel=true] The value can be: true / false / 'shift' / 'ctrl' / 'alt'.
   * @param {Object} [opt.moveOnMouseMove=true] The value can be: true / false / 'shift' / 'ctrl' / 'alt'.
   * @param {Object} [opt.moveOnMouseWheel=false] The value can be: true / false / 'shift' / 'ctrl' / 'alt'.
   * @param {Object} [opt.preventDefaultMouseMove=true] When pan.
   */


  this.enable = function (controlType, opt) {
    // Disable previous first
    this.disable();
    this._opt = zrUtil.defaults(zrUtil.clone(opt) || {}, {
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      // By default, wheel do not trigger move.
      moveOnMouseWheel: false,
      preventDefaultMouseMove: true
    });

    if (controlType == null) {
      controlType = true;
    }

    if (controlType === true || controlType === 'move' || controlType === 'pan') {
      zr.on('mousedown', mousedownHandler);
      zr.on('mousemove', mousemoveHandler);
      zr.on('mouseup', mouseupHandler);
    }

    if (controlType === true || controlType === 'scale' || controlType === 'zoom') {
      zr.on('mousewheel', mousewheelHandler);
      zr.on('pinch', pinchHandler);
    }
  };

  this.disable = function () {
    zr.off('mousedown', mousedownHandler);
    zr.off('mousemove', mousemoveHandler);
    zr.off('mouseup', mouseupHandler);
    zr.off('mousewheel', mousewheelHandler);
    zr.off('pinch', pinchHandler);
  };

  this.dispose = this.disable;

  this.isDragging = function () {
    return this._dragging;
  };

  this.isPinching = function () {
    return this._pinching;
  };
}

zrUtil.mixin(RoamController, Eventful);

function mousedown(e) {
  if (eventTool.notLeftMouse(e) || e.target && e.target.draggable) {
    return;
  }

  var x = e.offsetX;
  var y = e.offsetY; // Only check on mosedown, but not mousemove.
  // Mouse can be out of target when mouse moving.

  if (this.pointerChecker && this.pointerChecker(e, x, y)) {
    this._x = x;
    this._y = y;
    this._dragging = true;
  }
}

function mousemove(e) {
  if (eventTool.notLeftMouse(e) || !isAvailableBehavior('moveOnMouseMove', e, this._opt) || !this._dragging || e.gestureEvent === 'pinch' || interactionMutex.isTaken(this._zr, 'globalPan')) {
    return;
  }

  var x = e.offsetX;
  var y = e.offsetY;
  var oldX = this._x;
  var oldY = this._y;
  var dx = x - oldX;
  var dy = y - oldY;
  this._x = x;
  this._y = y;
  this._opt.preventDefaultMouseMove && eventTool.stop(e.event);
  trigger(this, 'pan', 'moveOnMouseMove', e, {
    dx: dx,
    dy: dy,
    oldX: oldX,
    oldY: oldY,
    newX: x,
    newY: y
  });
}

function mouseup(e) {
  if (!eventTool.notLeftMouse(e)) {
    this._dragging = false;
  }
}

function mousewheel(e) {
  var shouldZoom = isAvailableBehavior('zoomOnMouseWheel', e, this._opt);
  var shouldMove = isAvailableBehavior('moveOnMouseWheel', e, this._opt);
  var wheelDelta = e.wheelDelta;
  var absWheelDeltaDelta = Math.abs(wheelDelta);
  var originX = e.offsetX;
  var originY = e.offsetY; // wheelDelta maybe -0 in chrome mac.

  if (wheelDelta === 0 || !shouldZoom && !shouldMove) {
    return;
  } // If both `shouldZoom` and `shouldMove` is true, trigger
  // their event both, and the final behavior is determined
  // by event listener themselves.


  if (shouldZoom) {
    // Convenience:
    // Mac and VM Windows on Mac: scroll up: zoom out.
    // Windows: scroll up: zoom in.
    // FIXME: Should do more test in different environment.
    // wheelDelta is too complicated in difference nvironment
    // (https://developer.mozilla.org/en-US/docs/Web/Events/mousewheel),
    // although it has been normallized by zrender.
    // wheelDelta of mouse wheel is bigger than touch pad.
    var factor = absWheelDeltaDelta > 3 ? 1.4 : absWheelDeltaDelta > 1 ? 1.2 : 1.1;
    var scale = wheelDelta > 0 ? factor : 1 / factor;
    checkPointerAndTrigger(this, 'zoom', 'zoomOnMouseWheel', e, {
      scale: scale,
      originX: originX,
      originY: originY
    });
  }

  if (shouldMove) {
    // FIXME: Should do more test in different environment.
    var absDelta = Math.abs(wheelDelta); // wheelDelta of mouse wheel is bigger than touch pad.

    var scrollDelta = (wheelDelta > 0 ? 1 : -1) * (absDelta > 3 ? 0.4 : absDelta > 1 ? 0.15 : 0.05);
    checkPointerAndTrigger(this, 'scrollMove', 'moveOnMouseWheel', e, {
      scrollDelta: scrollDelta,
      originX: originX,
      originY: originY
    });
  }
}

function pinch(e) {
  if (interactionMutex.isTaken(this._zr, 'globalPan')) {
    return;
  }

  var scale = e.pinchScale > 1 ? 1.1 : 1 / 1.1;
  checkPointerAndTrigger(this, 'zoom', null, e, {
    scale: scale,
    originX: e.pinchX,
    originY: e.pinchY
  });
}

function checkPointerAndTrigger(controller, eventName, behaviorToCheck, e, contollerEvent) {
  if (controller.pointerChecker && controller.pointerChecker(e, contollerEvent.originX, contollerEvent.originY)) {
    // When mouse is out of roamController rect,
    // default befavoius should not be be disabled, otherwise
    // page sliding is disabled, contrary to expectation.
    eventTool.stop(e.event);
    trigger(controller, eventName, behaviorToCheck, e, contollerEvent);
  }
}

function trigger(controller, eventName, behaviorToCheck, e, contollerEvent) {
  // Also provide behavior checker for event listener, for some case that
  // multiple components share one listener.
  contollerEvent.isAvailableBehavior = zrUtil.bind(isAvailableBehavior, null, behaviorToCheck, e);
  controller.trigger(eventName, contollerEvent);
} // settings: {
//     zoomOnMouseWheel
//     moveOnMouseMove
//     moveOnMouseWheel
// }
// The value can be: true / false / 'shift' / 'ctrl' / 'alt'.


function isAvailableBehavior(behaviorToCheck, e, settings) {
  var setting = settings[behaviorToCheck];
  return !behaviorToCheck || setting && (!zrUtil.isString(setting) || e.event[setting + 'Key']);
}

var _default = RoamController;
module.exports = _default;