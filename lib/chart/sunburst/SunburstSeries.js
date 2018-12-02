
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

var SeriesModel = require("../../model/Series");

var Tree = require("../../data/Tree");

var _treeHelper = require("../helper/treeHelper");

var wrapTreePathInfo = _treeHelper.wrapTreePathInfo;

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
var _default = SeriesModel.extend({
  type: 'series.sunburst',

  /**
   * @type {module:echarts/data/Tree~Node}
   */
  _viewRoot: null,
  getInitialData: function (option, ecModel) {
    // Create a virtual root.
    var root = {
      name: option.name,
      children: option.data
    };
    completeTreeValue(root);
    var levels = option.levels || []; // levels = option.levels = setDefault(levels, ecModel);

    var treeOption = {};
    treeOption.levels = levels; // Make sure always a new tree is created when setOption,
    // in TreemapView, we check whether oldTree === newTree
    // to choose mappings approach among old shapes and new shapes.

    return Tree.createTree(root, this, treeOption).data;
  },
  optionUpdated: function () {
    this.resetViewRoot();
  },

  /*
   * @override
   */
  getDataParams: function (dataIndex) {
    var params = SeriesModel.prototype.getDataParams.apply(this, arguments);
    var node = this.getData().tree.getNodeByDataIndex(dataIndex);
    params.treePathInfo = wrapTreePathInfo(node, this);
    return params;
  },
  defaultOption: {
    zlevel: 0,
    z: 2,
    // 默认全局居中
    center: ['50%', '50%'],
    radius: [0, '75%'],
    // 默认顺时针
    clockwise: true,
    startAngle: 90,
    // 最小角度改为0
    minAngle: 0,
    percentPrecision: 2,
    // If still show when all data zero.
    stillShowZeroSum: true,
    // Policy of highlighting pieces when hover on one
    // Valid values: 'none' (for not downplay others), 'descendant',
    // 'ancestor', 'self'
    highlightPolicy: 'descendant',
    // 'rootToNode', 'link', or false
    nodeClick: 'rootToNode',
    renderLabelForZeroData: false,
    label: {
      // could be: 'radial', 'tangential', or 'none'
      rotate: 'radial',
      show: true,
      opacity: 1,
      // 'left' is for inner side of inside, and 'right' is for outter
      // side for inside
      align: 'center',
      position: 'inside',
      distance: 5,
      silent: true,
      emphasis: {}
    },
    itemStyle: {
      borderWidth: 1,
      borderColor: 'white',
      borderType: 'solid',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      opacity: 1,
      emphasis: {},
      highlight: {
        opacity: 1
      },
      downplay: {
        opacity: 0.9
      }
    },
    // Animation type canbe expansion, scale
    animationType: 'expansion',
    animationDuration: 1000,
    animationDurationUpdate: 500,
    animationEasing: 'cubicOut',
    data: [],
    levels: [],

    /**
     * Sort order.
     *
     * Valid values: 'desc', 'asc', null, or callback function.
     * 'desc' and 'asc' for descend and ascendant order;
     * null for not sorting;
     * example of callback function:
     * function(nodeA, nodeB) {
     *     return nodeA.getValue() - nodeB.getValue();
     * }
     */
    sort: 'desc'
  },
  getViewRoot: function () {
    return this._viewRoot;
  },

  /**
   * @param {module:echarts/data/Tree~Node} [viewRoot]
   */
  resetViewRoot: function (viewRoot) {
    viewRoot ? this._viewRoot = viewRoot : viewRoot = this._viewRoot;
    var root = this.getRawData().tree.root;

    if (!viewRoot || viewRoot !== root && !root.contains(viewRoot)) {
      this._viewRoot = root;
    }
  }
});
/**
 * @param {Object} dataNode
 */


function completeTreeValue(dataNode) {
  // Postorder travel tree.
  // If value of none-leaf node is not set,
  // calculate it by suming up the value of all children.
  var sum = 0;
  zrUtil.each(dataNode.children, function (child) {
    completeTreeValue(child);
    var childValue = child.value;
    zrUtil.isArray(childValue) && (childValue = childValue[0]);
    sum += childValue;
  });
  var thisValue = dataNode.value;

  if (zrUtil.isArray(thisValue)) {
    thisValue = thisValue[0];
  }

  if (thisValue == null || isNaN(thisValue)) {
    thisValue = sum;
  } // Value should not less than 0.


  if (thisValue < 0) {
    thisValue = 0;
  }

  zrUtil.isArray(dataNode.value) ? dataNode.value[0] = thisValue : dataNode.value = thisValue;
}

module.exports = _default;