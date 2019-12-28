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
 * Tree data structure
 *
 * @module echarts/data/Tree
 */

import * as zrUtil from 'zrender/src/core/util';
import Model from '../model/Model';
import linkList from './helper/linkList';
import List from './List';
import createDimensions from './helper/createDimensions';

/**
 * @constructor module:echarts/data/Tree~TreeNode
 * @param {string} name
 * @param {module:echarts/data/Tree} hostTree
 */
var TreeNode = function (name, hostTree) {
    /**
     * @type {string}
     */
    this.name = name || '';

    /**
     * Depth of node
     *
     * @type {number}
     * @readOnly
     */
    this.depth = 0;

    /**
     * Height of the subtree rooted at this node.
     * @type {number}
     * @readOnly
     */
    this.height = 0;

    /**
     * @type {module:echarts/data/Tree~TreeNode}
     * @readOnly
     */
    this.parentNode = null;

    /**
     * Reference to list item.
     * Do not persistent dataIndex outside,
     * besause it may be changed by list.
     * If dataIndex -1,
     * this node is logical deleted (filtered) in list.
     *
     * @type {Object}
     * @readOnly
     */
    this.dataIndex = -1;

    /**
     * @type {Array.<module:echarts/data/Tree~TreeNode>}
     * @readOnly
     */
    this.children = [];

    /**
     * @type {Array.<module:echarts/data/Tree~TreeNode>}
     * @pubilc
     */
    this.viewChildren = [];

    /**
     * @type {moduel:echarts/data/Tree}
     * @readOnly
     */
    this.hostTree = hostTree;
};

TreeNode.prototype = {

    constructor: TreeNode,

    /**
     * The node is removed.
     * @return {boolean} is removed.
     */
    isRemoved: function () {
        return this.dataIndex < 0;
    },

    /**
     * Travel this subtree (include this node).
     * Usage:
     *    node.eachNode(function () { ... }); // preorder
     *    node.eachNode('preorder', function () { ... }); // preorder
     *    node.eachNode('postorder', function () { ... }); // postorder
     *    node.eachNode(
     *        {order: 'postorder', attr: 'viewChildren'},
     *        function () { ... }
     *    ); // postorder
     *
     * @param {(Object|string)} options If string, means order.
     * @param {string=} options.order 'preorder' or 'postorder'
     * @param {string=} options.attr 'children' or 'viewChildren'
     * @param {Function} cb If in preorder and return false,
     *                      its subtree will not be visited.
     * @param {Object} [context]
     */
    eachNode: function (options, cb, context) {
        if (typeof options === 'function') {
            context = cb;
            cb = options;
            options = null;
        }

        options = options || {};
        if (zrUtil.isString(options)) {
            options = {order: options};
        }

        var order = options.order || 'preorder';
        var children = this[options.attr || 'children'];

        var suppressVisitSub;
        order === 'preorder' && (suppressVisitSub = cb.call(context, this));

        for (var i = 0; !suppressVisitSub && i < children.length; i++) {
            children[i].eachNode(options, cb, context);
        }

        order === 'postorder' && cb.call(context, this);
    },

    /**
     * Update depth and height of this subtree.
     *
     * @param  {number} depth
     */
    updateDepthAndHeight: function (depth) {
        var height = 0;
        this.depth = depth;
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.updateDepthAndHeight(depth + 1);
            if (child.height > height) {
                height = child.height;
            }
        }
        this.height = height + 1;
    },

    /**
     * @param  {string} id
     * @return {module:echarts/data/Tree~TreeNode}
     */
    getNodeById: function (id) {
        if (this.getId() === id) {
            return this;
        }
        for (var i = 0, children = this.children, len = children.length; i < len; i++) {
            var res = children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    },

    /**
     * @param {module:echarts/data/Tree~TreeNode} node
     * @return {boolean}
     */
    contains: function (node) {
        if (node === this) {
            return true;
        }
        for (var i = 0, children = this.children, len = children.length; i < len; i++) {
            var res = children[i].contains(node);
            if (res) {
                return res;
            }
        }
    },

    /**
     * @param {boolean} includeSelf Default false.
     * @return {Array.<module:echarts/data/Tree~TreeNode>} order: [root, child, grandchild, ...]
     */
    getAncestors: function (includeSelf) {
        var ancestors = [];
        var node = includeSelf ? this : this.parentNode;
        while (node) {
            ancestors.push(node);
            node = node.parentNode;
        }
        ancestors.reverse();
        return ancestors;
    },

    /**
     * @param {string|Array=} [dimension='value'] Default 'value'. can be 0, 1, 2, 3
     * @return {number} Value.
     */
    getValue: function (dimension) {
        var data = this.hostTree.data;
        return data.get(data.getDimension(dimension || 'value'), this.dataIndex);
    },

    /**
     * @param {Object} layout
     * @param {boolean=} [merge=false]
     */
    setLayout: function (layout, merge) {
        this.dataIndex >= 0
            && this.hostTree.data.setItemLayout(this.dataIndex, layout, merge);
    },

    /**
     * @return {Object} layout
     */
    getLayout: function () {
        return this.hostTree.data.getItemLayout(this.dataIndex);
    },

    /**
     * @param {string} [path]
     * @return {module:echarts/model/Model}
     */
    getModel: function (path) {
        if (this.dataIndex < 0) {
            return;
        }
        var hostTree = this.hostTree;
        var itemModel = hostTree.data.getItemModel(this.dataIndex);
        var levelModel = this.getLevelModel();
        var leavesModel;
        if (!levelModel && (this.children.length === 0 || (this.children.length !== 0 && this.isExpand === false))) {
            leavesModel = this.getLeavesModel();
        }
        return itemModel.getModel(path, (levelModel || leavesModel || hostTree.hostModel).getModel(path));
    },

    /**
     * @return {module:echarts/model/Model}
     */
    getLevelModel: function () {
        return (this.hostTree.levelModels || [])[this.depth];
    },

    /**
     * @return {module:echarts/model/Model}
     */
    getLeavesModel: function () {
        return this.hostTree.leavesModel;
    },

    /**
     * @example
     *  setItemVisual('color', color);
     *  setItemVisual({
     *      'color': color
     *  });
     */
    setVisual: function (key, value) {
        this.dataIndex >= 0
            && this.hostTree.data.setItemVisual(this.dataIndex, key, value);
    },

    /**
     * Get item visual
     */
    getVisual: function (key, ignoreParent) {
        return this.hostTree.data.getItemVisual(this.dataIndex, key, ignoreParent);
    },

    /**
     * @public
     * @return {number}
     */
    getRawIndex: function () {
        return this.hostTree.data.getRawIndex(this.dataIndex);
    },

    /**
     * @public
     * @return {string}
     */
    getId: function () {
        return this.hostTree.data.getId(this.dataIndex);
    },

    /**
     * if this is an ancestor of another node
     *
     * @public
     * @param {TreeNode} node another node
     * @return {boolean} if is ancestor
     */
    isAncestorOf: function (node) {
        var parent = node.parentNode;
        while (parent) {
            if (parent === this) {
                return true;
            }
            parent = parent.parentNode;
        }
        return false;
    },

    /**
     * if this is an descendant of another node
     *
     * @public
     * @param {TreeNode} node another node
     * @return {boolean} if is descendant
     */
    isDescendantOf: function (node) {
        return node !== this && node.isAncestorOf(this);
    }
};

/**
 * @constructor
 * @alias module:echarts/data/Tree
 * @param {module:echarts/model/Model} hostModel
 * @param {Array.<Object>} levelOptions
 * @param {Object} leavesOption
 */
function Tree(hostModel, levelOptions, leavesOption) {
    /**
     * @type {module:echarts/data/Tree~TreeNode}
     * @readOnly
     */
    this.root;

    /**
     * @type {module:echarts/data/List}
     * @readOnly
     */
    this.data;

    /**
     * Index of each item is the same as the raw index of coresponding list item.
     * @private
     * @type {Array.<module:echarts/data/Tree~TreeNode}
     */
    this._nodes = [];

    /**
     * @private
     * @readOnly
     * @type {module:echarts/model/Model}
     */
    this.hostModel = hostModel;

    /**
     * @private
     * @readOnly
     * @type {Array.<module:echarts/model/Model}
     */
    this.levelModels = zrUtil.map(levelOptions || [], function (levelDefine) {
        return new Model(levelDefine, hostModel, hostModel.ecModel);
    });

    this.leavesModel = new Model(leavesOption || {}, hostModel, hostModel.ecModel);
}

Tree.prototype = {

    constructor: Tree,

    type: 'tree',

    /**
     * Travel this subtree (include this node).
     * Usage:
     *    node.eachNode(function () { ... }); // preorder
     *    node.eachNode('preorder', function () { ... }); // preorder
     *    node.eachNode('postorder', function () { ... }); // postorder
     *    node.eachNode(
     *        {order: 'postorder', attr: 'viewChildren'},
     *        function () { ... }
     *    ); // postorder
     *
     * @param {(Object|string)} options If string, means order.
     * @param {string=} options.order 'preorder' or 'postorder'
     * @param {string=} options.attr 'children' or 'viewChildren'
     * @param {Function} cb
     * @param {Object}   [context]
     */
    eachNode: function (options, cb, context) {
        this.root.eachNode(options, cb, context);
    },

    /**
     * @param {number} dataIndex
     * @return {module:echarts/data/Tree~TreeNode}
     */
    getNodeByDataIndex: function (dataIndex) {
        var rawIndex = this.data.getRawIndex(dataIndex);
        return this._nodes[rawIndex];
    },

    /**
     * @param {string} name
     * @return {module:echarts/data/Tree~TreeNode}
     */
    getNodeByName: function (name) {
        return this.root.getNodeByName(name);
    },

    /**
     * Update item available by list,
     * when list has been performed options like 'filterSelf' or 'map'.
     */
    update: function () {
        var data = this.data;
        var nodes = this._nodes;

        for (var i = 0, len = nodes.length; i < len; i++) {
            nodes[i].dataIndex = -1;
        }

        for (var i = 0, len = data.count(); i < len; i++) {
            nodes[data.getRawIndex(i)].dataIndex = i;
        }
    },

    /**
     * Clear all layouts
     */
    clearLayouts: function () {
        this.data.clearItemLayouts();
    }
};

/**
 * data node format:
 * {
 *     name: ...
 *     value: ...
 *     children: [
 *         {
 *             name: ...
 *             value: ...
 *             children: ...
 *         },
 *         ...
 *     ]
 * }
 *
 * @static
 * @param {Object} dataRoot Root node.
 * @param {module:echarts/model/Model} hostModel
 * @param {Object} treeOptions
 * @param {Array.<Object>} treeOptions.levels
 * @param {Array.<Object>} treeOptions.leaves
 * @return module:echarts/data/Tree
 */
Tree.createTree = function (dataRoot, hostModel, treeOptions, beforeLink) {

    var tree = new Tree(hostModel, treeOptions.levels, treeOptions.leaves);
    var listData = [];
    var dimMax = 1;

    buildHierarchy(dataRoot);

    function buildHierarchy(dataNode, parentNode) {
        var value = dataNode.value;
        dimMax = Math.max(dimMax, zrUtil.isArray(value) ? value.length : 1);

        listData.push(dataNode);

        var node = new TreeNode(dataNode.name, tree);
        parentNode
            ? addChild(node, parentNode)
            : (tree.root = node);

        tree._nodes.push(node);

        var children = dataNode.children;
        if (children) {
            for (var i = 0; i < children.length; i++) {
                buildHierarchy(children[i], node);
            }
        }
    }

    tree.root.updateDepthAndHeight(0);

    var dimensionsInfo = createDimensions(listData, {
        coordDimensions: ['value'],
        dimensionsCount: dimMax
    });

    var list = new List(dimensionsInfo, hostModel);
    list.initData(listData);

    linkList({
        mainData: list,
        struct: tree,
        structAttr: 'tree'
    });

    tree.update();

    beforeLink && beforeLink(list);

    return tree;
};

/**
 * It is needed to consider the mess of 'list', 'hostModel' when creating a TreeNote,
 * so this function is not ready and not necessary to be public.
 *
 * @param {(module:echarts/data/Tree~TreeNode|Object)} child
 */
function addChild(child, node) {
    var children = node.children;
    if (child.parentNode === node) {
        return;
    }

    children.push(child);
    child.parentNode = node;
}

export default Tree;