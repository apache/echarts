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
             * Do not persistent dataIndex outside,
             * besause it may be changed by list.
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
         * @param  {string} name
         * @return {module:echarts/data/Tree~TreeNode}
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
         * @param {string} path
         * @return {module:echarts/model/Model}
         */
        getModel: function (path) {
            var hostTree = this.hostTree;
            var itemModel = hostTree.list.getItemModel(this.dataIndex);
            var levelModel = (hostTree.levelModels || [])[this.depth];

            return itemModel.getModel(path, (levelModel || hostTree.hostModel).getModel(path));
        },

        /**
         * @return {module:echarts/model/Model}
         */
        getLevelModel: function () {
            return (this.hostTree.levelModels || [])[this.depth];
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
        },

        /**
         * @public
         */
        getRawIndex: function () {
            return this.hostTree.list.getRawIndex(this.dataIndex);
        }
    });

    /**
     * @constructor
     * @alias module:echarts/data/Tree
     * @param {string=} name Root name
     * @param {module:echarts/model/Model} hostModel
     * @param {Array.<Object>} levelOptions
     */
    function Tree(name, hostModel, levelOptions) {
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
         * Index of each item is the same as the raw index of coresponding list item.
         * @private
         * @type {Array.<module:echarts/data/Tree~TreeNode}
         */
        this._nodes = [];

        /**
         * @private
         * @readOnly
         * @type {Array.<module:echarts/model/Model}
         */
        this.hostModel = hostModel;

        /**
         * @private
         * @readOnly
         * @type {Array.<module:echarts/model/Model}
         */
        this.levelModels = zrUtil.map(levelOptions || [], function (levelDefine) {
            return new Model(levelDefine, hostModel);
        });
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
        eachNode: function(options, cb, context) {
            this.root.eachNode(options, cb, context);
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
     * @param {Array.<Object>} levelOptions
     * @return module:echarts/data/Tree
     */
    Tree.createTree = function (data, hostModel, levelOptions) {

        var tree = new Tree('', hostModel, levelOptions);

        var listData = [];
        var rootNode = tree.root;

        function buildHierarchy(dataNode, parentNode) {
            listData.push(dataNode);

            var node = new TreeNode(dataNode.name, listData.length - 1, tree);
            addChild(node, parentNode);

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

        node.hostTree._nodes.push(child);
    }

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