/**
 * Tree data structure
 * 
 * @module echarts/data/Tree
 * @author Yi Shen(https://www.github.com/pissang)
 */
define(function(require) {

    var zrUtil = require('zrender/tool/util');

    /**
     * @constructor module:echarts/data/Tree~TreeNode
     * @param {string} id Node ID
     * @param {Object} [data]
     */
    function TreeNode(id, data) {
        /**
         * @type {string}
         */
        this.id = id;
        /**
         * 节点的深度
         * @type {number}
         */
        this.depth = 0;
        /**
         * 以当前节点为根节点的子树的高度
         * @type {number}
         */
        this.height = 0;
        /**
         * 子节点列表
         * @type {Array.<module:echarts/data/Tree~TreeNode>}
         */
        this.children = [];

        /**
         * @type {module:echarts/data/Tree~TreeNode}
         */
        this.parent = null;

        /**
         * 存储的用户数据
         * @type {Object}
         */
        this.data = data || null;
    }

    /**
     * 添加子节点
     * @param {module:echarts/data/Tree~TreeNode} child
     */
    TreeNode.prototype.add = function (child) {
        var children = this.children;
        if (child.parent === this) {
            return;
        }

        children.push(child);
        child.parent = this;
    };

    /**
     * 移除子节点
     * @param {module:echarts/data/Tree~TreeNode} child
     */
    TreeNode.prototype.remove = function (child) {
        var children = this.children;
        var idx = zrUtil.indexOf(children, child);
        if (idx >= 0) {
            children.splice(idx, 1);
            child.parent = null;
        }
    };

    /**
     * 遍历当前节点及其所有子节点
     * @param  {Function} cb
     * @param  {Object}   [context]
     */
    TreeNode.prototype.traverse = function (cb, context) {
        cb.call(context, this);

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(cb, context);
        }
    };

    /**
     * 更新当前树及所有子树的高度和深度
     * @param  {number} depth
     */
    TreeNode.prototype.updateDepthAndHeight = function (depth) {
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
    };

    /**
     * @param  {string} id
     * @return module:echarts/data/Tree~TreeNode
     */
    TreeNode.prototype.getNodeById = function (id) {
        if (this.id === id) {
            return this;
        }
        for (var i = 0; i < this.children.length; i++) {
            var res = this.children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    };

    /**
     * @constructor
     * @alias module:echarts/data/Tree
     * @param {string} id
     */
    function Tree(id) {
        /**
         * @type {module:echarts/data/Tree~TreeNode}
         */
        this.root = new TreeNode(id);
    }

    /**
     * 遍历树的所有子节点
     * @param  {Function} cb
     * @param  {Object}   [context]
     */
    Tree.prototype.traverse = function(cb, context) {
        this.root.traverse(cb, context);
    };

    /**
     * 生成子树
     * @param  {string} id 子树根节点 id
     * @return {module:echarts/data/Tree}
     */
    Tree.prototype.getSubTree = function(id) {
        var root = this.getNodeById(id);
        if (root) {
            var tree = new Tree(root.id);
            tree.root = root;
            return tree;
        }
    };

    /**
     * @param  {string} id
     * @return module:echarts/data/Tree~TreeNode
     */
    Tree.prototype.getNodeById = function (id) {
        return this.root.getNodeById(id);
    };


    /**
     * 从 option 里的 data 数据构建树
     * @param {string} id
     * @param {Array.<Object>} data
     * @return module:echarts/data/Tree
     */
    Tree.fromOptionData = function (id, data) {
        var tree = new Tree(id);
        var rootNode = tree.root;
        // Root node
        rootNode.data = {
            name: id,
            children: data
        };

        function buildHierarchy(dataNode, parentNode) {
            var node = new TreeNode(dataNode.name, dataNode);
            parentNode.add(node);
            // 遍历添加子节点
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

        return tree;
    };

    // TODO
    Tree.fromGraph = function (graph) {

        function buildHierarchy(root) {
            var graphNode = graph.getNodeById(root.id);
            for (var i = 0; i < graphNode.outEdges.length; i++) {
                var edge = graphNode.outEdges[i];
                var childTreeNode = treeNodesMap[edge.node2.id];
                root.children.push(childTreeNode);
                buildHierarchy(childTreeNode);
            }
        }

        var treeMap = {};
        var treeNodesMap = {};
        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            var treeNode;
            if (node.inDegree() === 0) {
                treeMap[node.id] = new Tree(node.id);
                treeNode = treeMap[node.id].root;
            } else {
                treeNode = new TreeNode(node.id);
            }

            treeNode.data = node.data;

            treeNodesMap[node.id] = treeNode;
        }
        var treeList = [];
        for (var id in treeMap) {
            buildHierarchy(treeMap[id].root);
            treeMap[id].root.updateDepthAndHeight(0);
            treeList.push(treeMap[id]);
        }
        return treeList;
    };

    return Tree;
});