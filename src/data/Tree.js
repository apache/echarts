/**
 * Tree data structure
 * 
 * @module echarts/data/Tree
 * @author Yi Shen(https://www.github.com/pissang)
 */
define(function(require) {

    /**
     * @constructor module:echarts/data/Tree~TreeNode
     * @param {string} id Node ID
     */
    function TreeNode(id) {
        /**
         * @type {string}
         */
        this.id = id;
        /**
         * @type {number}
         */
        this.depth = 0;
        /**
         * @type {number}
         */
        this.height = 0;
        /**
         * @type {Array.<module:echarts/data/Tree~TreeNode>}
         */
        this.children = [];
    }

    TreeNode.prototype.traverse = function (cb, context) {
        cb.call(context, this);

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(cb, context);
        }
    };

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

    Tree.prototype.traverse = function(cb, context) {
        this.root.traverse(cb, context);
    };

    Tree.prototype.getSubTree = function(id) {
        var root = this.getNodeById(id);
        if (root) {
            var tree = new Tree(root.id);
            tree.root = root;
            return tree;
        }
    };

    Tree.prototype.getNodeById = function (id) {
        return this.root.getNodeById(id);
    };

    // TODO
    Tree.fromGraph = function (graph) {

        function buildHierarch(root) {
            var graphNode = graph.getNodeById(root.id);
            for (var i = 0; i < graphNode.outEdges.length; i++) {
                var edge = graphNode.outEdges[i];
                var childTreeNode = treeNodesMap[edge.node2.id];
                root.children.push(childTreeNode);
                buildHierarch(childTreeNode);
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
            buildHierarch(treeMap[id].root);
            treeMap[id].root.updateDepthAndHeight(0);
            treeList.push(treeMap[id]);
        }
        return treeList;
    };

    return Tree;
});