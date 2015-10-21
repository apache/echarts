/**
 * Tree data structure
 *
 * @module echarts/data/Tree
 * @author Yi Shen(https://www.github.com/pissang)
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('../model/Model');
    var List = require('./List');
    var arraySlice = Array.prototype.slice;

    /**
     * @constructor module:echarts/data/Tree~TreeNode
     * @param {number} dataIndex
     */
    var TreeNode = Model.extend({

        init: function (name, dataIndex, hostTree) {

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
             *
             * @type {Object}
             * @readOnly
             */
            this.dataIndex = dataIndex;

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
        },

        /**
         * @param {(module:echarts/data/Tree~TreeNode|Object)} child
         */
        add: function (child) {
            var children = this.children;
            if (child.parentNode === this) {
                return;
            }

            children.push(child);
            child.parentNode = this;

            this.hostTree._nodes.push(child);
        },

        /**
         * Travel this subtree (include this node).
         * Usage:
         *    node.eachNode(function () { ... }); // preorder
         *    node.eachNode('preorder', function () { ... }); // preorder
         *    node.eachNode('postorder', function () { ... }); // postorder
         *
         * @param {string} order 'preorder' or 'postorder'
         * @param {Function} cb
         * @param {Object} [context]
         */
        eachNode: function (order, cb, context) {
            if (typeof order === 'function') {
                context = cb;
                cb = order;
                order = 'preorder';
            }

            order === 'preorder' && cb.call(context, this);

            for (var i = 0; i < this.children.length; i++) {
                this.children[i].eachNode(order, cb, context);
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
         * @param  {string} name
         * @return module:echarts/data/Tree~TreeNode
         */
        getNodeByName: function (name) {
            if (this.name === name) {
                return this;
            }
            for (var i = 0; i < this.children.length; i++) {
                var res = this.children[i].getNodeByName(name);
                if (res) {
                    return res;
                }
            }
        },

        /**
         * @param {string=} dimension Default 'value'. can be 'a', 'b', 'c', 'd', 'e'.
         * @return {number} Value.
         */
        getValue: function (dimension) {
            return this.hostTree.list.get(dimension || 'value', this.dataIndex);
        },

        /**
         * @param {Object} layout
         * @param {boolean=} merge
         */
        setLayout: function (layout, merge) {
            return this.hostTree.list.setItemLayout(this.dataIndex, layout, merge);
        },

        /**
         * @return {Object} layout
         */
        getLayout: function () {
            return this.hostTree.list.getItemLayout(this.dataIndex);
        },

        /**
         * @return {module:echarts/model/Model}
         */
        getItemModel: function () {
            return this.hostTree.list.getItemModel(this.dataIndex);
        },

        /**
         * @example
         *  setItemVisual(0, 'color', color);
         *  setItemVisual(0, {
         *      'color': color
         *  });
         */
        setVisual: function (key, value) {
            return this.hostTree.list.setItemVisual(this.dataIndex, key, value);
        },

        /**
         * @public
         */
        getVisual: function (key, ignoreParent) {
            return this.hostTree.list.getItemVisual(this.dataIndex, key, ignoreParent);
        }
    });

    /**
     * @constructor
     * @alias module:echarts/data/Tree
     * @param {string=} name Root name
     */
    function Tree(name) {
        /**
         * @type {module:echarts/data/Tree~TreeNode}
         * @readOnly
         */
        this.root = new TreeNode(name, null, this);

        /**
         * @type {module:echarts/data/List}
         * @readOnly
         */
        this.list;

        /**
         * @private
         * @type {Array.<module:echarts/data/Tree~TreeNode}
         */
        this._nodes = [];
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
         *
         * @param {string} order 'preorder' or 'postorder'
         * @param {Function} cb
         * @param {Object}   [context]
         */
        eachNode: function(order, cb, context) {
            if (typeof order === 'function') {
                context = cb;
                cb = order;
                order = 'preorder';
            }

            this.root.eachNode(order, cb, context);
        },

        /**
         * @param {string} name
         * @return module:echarts/data/Tree~TreeNode
         */
        getNodeByName: function (name) {
            return this.root.getNodeByName(name);
        },

        /**
         * Update item available by list,
         * when list has been performed options like 'filterSelf' or 'map'.
         */
        update: function () {
            var list = this.list;
            var nodes = this._nodes;

            for (var i = 0, len = nodes.length; i < len; i++) {
                nodes[i].dataIndex = null;
            }

            for (var i = 0, len = list.count(); i < len; i++) {
                nodes[list.getRawIndex(i)].dataIndex = i;
            }
        }
    };

    /**
     * data format:
     * [
     *     {
     *         name: ...
     *         value: ...
     *         children: [
     *             {
     *                 name: ...
     *                 value: ...
     *                 children: ...
     *             },
     *             ...
     *         ]
     *     },
     *     ...
     * ]
     *
     * @static
     * @param {Array.<Object>} data
     * @param {module:echarts/model/Model} hostModel
     * @return module:echarts/data/Tree
     */
    Tree.createTree = function (data, hostModel) {
        var listData = [];

        var tree = new Tree();
        var rootNode = tree.root;

        function buildHierarchy(dataNode, parentNode) {
            listData.push(dataNode);

            var node = new TreeNode(dataNode.name, listData.length - 1, tree);
            parentNode.add(node);

            var children = dataNode.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    buildHierarchy(children[i], node);
                }
            }
        }

        for (var i = 0; i < data.length; i++) {
            buildHierarchy(data[i], rootNode);
        }

        tree.root.updateDepthAndHeight(0);

        var list = createList(listData, hostModel);

        tree.list = list;

        proxyList(list, tree);

        return tree;
    };

    function createList(listData, hostModel) {
        var firstValue = listData[0] && listData[0].value;
        var dimSize = zrUtil.isArray(firstValue) ? firstValue.length : 1;
        // FIXME
        // 和 createListFromArray中一样，怎么改好看点。
        var dimensionNames = ['value', 'a', 'b', 'c', 'd', 'e', 'f'];
        var list = new List(dimensionNames.slice(0, dimSize), hostModel);
        list.initData(listData);

        return list;
    }

    function proxyList(list, tree) {
        zrUtil.each(listProxyMethods, function (method, methodName) {
            var originMethod = list[methodName];
            list[methodName] = zrUtil.curry(method, originMethod, tree);
        });

        // Among list and its clones, only one can be active in echarts process.
        // So a tree instance can be share by list and its clone.
        list.tree = tree;

        return list;
    }

    var listProxyMethods = {
        cloneShallow: function (originMethod, tree) {
            var newList = originMethod.apply(this, arraySlice.call(arguments, 1));
            return proxyList(newList, tree);
        },
        map: function (originMethod, tree) {
            var newList = originMethod.apply(this, arraySlice.call(arguments, 1));
            return proxyList(newList, tree);
        },
        filterSelf: function (originMethod, tree) {
            var result = originMethod.apply(this, arraySlice.call(arguments, 1));
            tree.update();
            return result;
        }
    };

    return Tree;
});