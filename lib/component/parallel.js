
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

var echarts = require("../echarts");

var zrUtil = require("zrender/lib/core/util");

var throttleUtil = require("../util/throttle");

var parallelPreprocessor = require("../coord/parallel/parallelPreprocessor");

require("../coord/parallel/parallelCreator");

require("../coord/parallel/ParallelModel");

require("./parallelAxis");

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
var CLICK_THRESHOLD = 5; // > 4
// Parallel view

echarts.extendComponentView({
  type: 'parallel',
  render: function (parallelModel, ecModel, api) {
    this._model = parallelModel;
    this._api = api;

    if (!this._handlers) {
      this._handlers = {};
      zrUtil.each(handlers, function (handler, eventName) {
        api.getZr().on(eventName, this._handlers[eventName] = zrUtil.bind(handler, this));
      }, this);
    }

    throttleUtil.createOrUpdate(this, '_throttledDispatchExpand', parallelModel.get('axisExpandRate'), 'fixRate');
  },
  dispose: function (ecModel, api) {
    zrUtil.each(this._handlers, function (handler, eventName) {
      api.getZr().off(eventName, handler);
    });
    this._handlers = null;
  },

  /**
   * @param {Object} [opt] If null, cancle the last action triggering for debounce.
   */
  _throttledDispatchExpand: function (opt) {
    this._dispatchExpand(opt);
  },
  _dispatchExpand: function (opt) {
    opt && this._api.dispatchAction(zrUtil.extend({
      type: 'parallelAxisExpand'
    }, opt));
  }
});
var handlers = {
  mousedown: function (e) {
    if (checkTrigger(this, 'click')) {
      this._mouseDownPoint = [e.offsetX, e.offsetY];
    }
  },
  mouseup: function (e) {
    var mouseDownPoint = this._mouseDownPoint;

    if (checkTrigger(this, 'click') && mouseDownPoint) {
      var point = [e.offsetX, e.offsetY];
      var dist = Math.pow(mouseDownPoint[0] - point[0], 2) + Math.pow(mouseDownPoint[1] - point[1], 2);

      if (dist > CLICK_THRESHOLD) {
        return;
      }

      var result = this._model.coordinateSystem.getSlidedAxisExpandWindow([e.offsetX, e.offsetY]);

      result.behavior !== 'none' && this._dispatchExpand({
        axisExpandWindow: result.axisExpandWindow
      });
    }

    this._mouseDownPoint = null;
  },
  mousemove: function (e) {
    // Should do nothing when brushing.
    if (this._mouseDownPoint || !checkTrigger(this, 'mousemove')) {
      return;
    }

    var model = this._model;
    var result = model.coordinateSystem.getSlidedAxisExpandWindow([e.offsetX, e.offsetY]);
    var behavior = result.behavior;
    behavior === 'jump' && this._throttledDispatchExpand.debounceNextCall(model.get('axisExpandDebounce'));

    this._throttledDispatchExpand(behavior === 'none' ? null // Cancle the last trigger, in case that mouse slide out of the area quickly.
    : {
      axisExpandWindow: result.axisExpandWindow,
      // Jumping uses animation, and sliding suppresses animation.
      animation: behavior === 'jump' ? null : false
    });
  }
};

function checkTrigger(view, triggerOn) {
  var model = view._model;
  return model.get('axisExpandable') && model.get('axisExpandTriggerOn') === triggerOn;
}

echarts.registerPreprocessor(parallelPreprocessor);