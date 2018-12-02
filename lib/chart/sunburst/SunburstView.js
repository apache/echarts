
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

var SunburstPiece = require("./SunburstPiece");

var DataDiffer = require("../../data/DataDiffer");

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
var ROOT_TO_NODE_ACTION = 'sunburstRootToNode';
var SunburstView = ChartView.extend({
  type: 'sunburst',
  init: function () {},
  render: function (seriesModel, ecModel, api, payload) {
    var that = this;
    this.seriesModel = seriesModel;
    this.api = api;
    this.ecModel = ecModel;
    var data = seriesModel.getData();
    var virtualRoot = data.tree.root;
    var newRoot = seriesModel.getViewRoot();
    var group = this.group;
    var renderLabelForZeroData = seriesModel.get('renderLabelForZeroData');
    var newChildren = [];
    newRoot.eachNode(function (node) {
      newChildren.push(node);
    });
    var oldChildren = this._oldChildren || [];
    dualTravel(newChildren, oldChildren);
    renderRollUp(virtualRoot, newRoot);

    if (payload && payload.highlight && payload.highlight.piece) {
      var highlightPolicy = seriesModel.getShallow('highlightPolicy');
      payload.highlight.piece.onEmphasis(highlightPolicy);
    } else if (payload && payload.unhighlight) {
      var piece = this.virtualPiece;

      if (!piece && virtualRoot.children.length) {
        piece = virtualRoot.children[0].piece;
      }

      if (piece) {
        piece.onNormal();
      }
    }

    this._initEvents();

    this._oldChildren = newChildren;

    function dualTravel(newChildren, oldChildren) {
      if (newChildren.length === 0 && oldChildren.length === 0) {
        return;
      }

      new DataDiffer(oldChildren, newChildren, getKey, getKey).add(processNode).update(processNode).remove(zrUtil.curry(processNode, null)).execute();

      function getKey(node) {
        return node.getId();
      }

      function processNode(newId, oldId) {
        var newNode = newId == null ? null : newChildren[newId];
        var oldNode = oldId == null ? null : oldChildren[oldId];
        doRenderNode(newNode, oldNode);
      }
    }

    function doRenderNode(newNode, oldNode) {
      if (!renderLabelForZeroData && newNode && !newNode.getValue()) {
        // Not render data with value 0
        newNode = null;
      }

      if (newNode !== virtualRoot && oldNode !== virtualRoot) {
        if (oldNode && oldNode.piece) {
          if (newNode) {
            // Update
            oldNode.piece.updateData(false, newNode, 'normal', seriesModel, ecModel); // For tooltip

            data.setItemGraphicEl(newNode.dataIndex, oldNode.piece);
          } else {
            // Remove
            removeNode(oldNode);
          }
        } else if (newNode) {
          // Add
          var piece = new SunburstPiece(newNode, seriesModel, ecModel);
          group.add(piece); // For tooltip

          data.setItemGraphicEl(newNode.dataIndex, piece);
        }
      }
    }

    function removeNode(node) {
      if (!node) {
        return;
      }

      if (node.piece) {
        group.remove(node.piece);
        node.piece = null;
      }
    }

    function renderRollUp(virtualRoot, viewRoot) {
      if (viewRoot.depth > 0) {
        // Render
        if (that.virtualPiece) {
          // Update
          that.virtualPiece.updateData(false, virtualRoot, 'normal', seriesModel, ecModel);
        } else {
          // Add
          that.virtualPiece = new SunburstPiece(virtualRoot, seriesModel, ecModel);
          group.add(that.virtualPiece);
        }

        if (viewRoot.piece._onclickEvent) {
          viewRoot.piece.off('click', viewRoot.piece._onclickEvent);
        }

        var event = function (e) {
          that._rootToNode(viewRoot.parentNode);
        };

        viewRoot.piece._onclickEvent = event;
        that.virtualPiece.on('click', event);
      } else if (that.virtualPiece) {
        // Remove
        group.remove(that.virtualPiece);
        that.virtualPiece = null;
      }
    }
  },
  dispose: function () {},

  /**
   * @private
   */
  _initEvents: function () {
    var that = this;

    var event = function (e) {
      var targetFound = false;
      var viewRoot = that.seriesModel.getViewRoot();
      viewRoot.eachNode(function (node) {
        if (!targetFound && node.piece && node.piece.childAt(0) === e.target) {
          var nodeClick = node.getModel().get('nodeClick');

          if (nodeClick === 'rootToNode') {
            that._rootToNode(node);
          } else if (nodeClick === 'link') {
            var itemModel = node.getModel();
            var link = itemModel.get('link');

            if (link) {
              var linkTarget = itemModel.get('target', true) || '_blank';
              window.open(link, linkTarget);
            }
          }

          targetFound = true;
        }
      });
    };

    if (this.group._onclickEvent) {
      this.group.off('click', this.group._onclickEvent);
    }

    this.group.on('click', event);
    this.group._onclickEvent = event;
  },

  /**
   * @private
   */
  _rootToNode: function (node) {
    if (node !== this.seriesModel.getViewRoot()) {
      this.api.dispatchAction({
        type: ROOT_TO_NODE_ACTION,
        from: this.uid,
        seriesId: this.seriesModel.id,
        targetNode: node
      });
    }
  },

  /**
   * @implement
   */
  containPoint: function (point, seriesModel) {
    var treeRoot = seriesModel.getData();
    var itemLayout = treeRoot.getItemLayout(0);

    if (itemLayout) {
      var dx = point[0] - itemLayout.cx;
      var dy = point[1] - itemLayout.cy;
      var radius = Math.sqrt(dx * dx + dy * dy);
      return radius <= itemLayout.r && radius >= itemLayout.r0;
    }
  }
});
var _default = SunburstView;
module.exports = _default;