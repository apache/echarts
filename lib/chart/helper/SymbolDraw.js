
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

var SymbolClz = require("./Symbol");

var _util = require("zrender/lib/core/util");

var isObject = _util.isObject;

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
 * @module echarts/chart/helper/SymbolDraw
 */

/**
 * @constructor
 * @alias module:echarts/chart/helper/SymbolDraw
 * @param {module:zrender/graphic/Group} [symbolCtor]
 */
function SymbolDraw(symbolCtor) {
  this.group = new graphic.Group();
  this._symbolCtor = symbolCtor || SymbolClz;
}

var symbolDrawProto = SymbolDraw.prototype;

function symbolNeedsDraw(data, point, idx, opt) {
  return point && !isNaN(point[0]) && !isNaN(point[1]) && !(opt.isIgnore && opt.isIgnore(idx)) // We do not set clipShape on group, because it will cut part of
  // the symbol element shape. We use the same clip shape here as
  // the line clip.
  && !(opt.clipShape && !opt.clipShape.contain(point[0], point[1])) && data.getItemVisual(idx, 'symbol') !== 'none';
}
/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 * @param {Object} [opt] Or isIgnore
 * @param {Function} [opt.isIgnore]
 * @param {Object} [opt.clipShape]
 */


symbolDrawProto.updateData = function (data, opt) {
  opt = normalizeUpdateOpt(opt);
  var group = this.group;
  var seriesModel = data.hostModel;
  var oldData = this._data;
  var SymbolCtor = this._symbolCtor;
  var seriesScope = makeSeriesScope(data); // There is no oldLineData only when first rendering or switching from
  // stream mode to normal mode, where previous elements should be removed.

  if (!oldData) {
    group.removeAll();
  }

  data.diff(oldData).add(function (newIdx) {
    var point = data.getItemLayout(newIdx);

    if (symbolNeedsDraw(data, point, newIdx, opt)) {
      var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
      symbolEl.attr('position', point);
      data.setItemGraphicEl(newIdx, symbolEl);
      group.add(symbolEl);
    }
  }).update(function (newIdx, oldIdx) {
    var symbolEl = oldData.getItemGraphicEl(oldIdx);
    var point = data.getItemLayout(newIdx);

    if (!symbolNeedsDraw(data, point, newIdx, opt)) {
      group.remove(symbolEl);
      return;
    }

    if (!symbolEl) {
      symbolEl = new SymbolCtor(data, newIdx);
      symbolEl.attr('position', point);
    } else {
      symbolEl.updateData(data, newIdx, seriesScope);
      graphic.updateProps(symbolEl, {
        position: point
      }, seriesModel);
    } // Add back


    group.add(symbolEl);
    data.setItemGraphicEl(newIdx, symbolEl);
  }).remove(function (oldIdx) {
    var el = oldData.getItemGraphicEl(oldIdx);
    el && el.fadeOut(function () {
      group.remove(el);
    });
  }).execute();
  this._data = data;
};

symbolDrawProto.isPersistent = function () {
  return true;
};

symbolDrawProto.updateLayout = function () {
  var data = this._data;

  if (data) {
    // Not use animation
    data.eachItemGraphicEl(function (el, idx) {
      var point = data.getItemLayout(idx);
      el.attr('position', point);
    });
  }
};

symbolDrawProto.incrementalPrepareUpdate = function (data) {
  this._seriesScope = makeSeriesScope(data);
  this._data = null;
  this.group.removeAll();
};
/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 * @param {Object} [opt] Or isIgnore
 * @param {Function} [opt.isIgnore]
 * @param {Object} [opt.clipShape]
 */


symbolDrawProto.incrementalUpdate = function (taskParams, data, opt) {
  opt = normalizeUpdateOpt(opt);

  function updateIncrementalAndHover(el) {
    if (!el.isGroup) {
      el.incremental = el.useHoverLayer = true;
    }
  }

  for (var idx = taskParams.start; idx < taskParams.end; idx++) {
    var point = data.getItemLayout(idx);

    if (symbolNeedsDraw(data, point, idx, opt)) {
      var el = new this._symbolCtor(data, idx, this._seriesScope);
      el.traverse(updateIncrementalAndHover);
      el.attr('position', point);
      this.group.add(el);
      data.setItemGraphicEl(idx, el);
    }
  }
};

function normalizeUpdateOpt(opt) {
  if (opt != null && !isObject(opt)) {
    opt = {
      isIgnore: opt
    };
  }

  return opt || {};
}

symbolDrawProto.remove = function (enableAnimation) {
  var group = this.group;
  var data = this._data; // Incremental model do not have this._data.

  if (data && enableAnimation) {
    data.eachItemGraphicEl(function (el) {
      el.fadeOut(function () {
        group.remove(el);
      });
    });
  } else {
    group.removeAll();
  }
};

function makeSeriesScope(data) {
  var seriesModel = data.hostModel;
  return {
    itemStyle: seriesModel.getModel('itemStyle').getItemStyle(['color']),
    hoverItemStyle: seriesModel.getModel('emphasis.itemStyle').getItemStyle(),
    symbolRotate: seriesModel.get('symbolRotate'),
    symbolOffset: seriesModel.get('symbolOffset'),
    hoverAnimation: seriesModel.get('hoverAnimation'),
    labelModel: seriesModel.getModel('label'),
    hoverLabelModel: seriesModel.getModel('emphasis.label'),
    cursorStyle: seriesModel.get('cursor')
  };
}

var _default = SymbolDraw;
module.exports = _default;