/**
 * Tree data structure
 *
 * @module echarts/data/Tree
 * @author Yi Shen(https://www.github.com/pissang)
 *
 * TODO clone
 */
define(function(require) {

    var zrUtil = require('zrender/tool/util');
    var Model = require('../model/Model');

    /**
     * @constructor module:echarts/data/Tree~TreeNode
     * @param {Object} option
     */
    var TreeNode = Model.extend({

        init: function (option) {
            /**
            * @type {string}
            * @memberOf {module:echarts/data/Tree~TreeNode}
            * @readOnly
            */
            this.name = option.name || '';
            /**
            * 节点的深度
            * @type {number}
            * @readOnly
            */
            this.depth = 0;
            /**
            * 以当前节点为根节点的子树的高度
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
            * 存储的用户数据
            * @type {Object}
            */
            this.option = option || null;

            /**
            * 子节点列表
            * @type {Array.<module:echarts/data/Tree~TreeNode>}
            * @readOnly
            */
            this.children = [];
        },

        /**
        * 添加子节点
        * @param {module:echarts/data/Tree~TreeNode} child
        */
        add: function (child) {
            var children = this.children;
            if (child.parentNode === this) {
                return;
            }

            children.push(child);
            child.parentNode = this;
        },

        /**
        * 移除子节点
        * @param {module:echarts/data/Tree~TreeNode} child
        */
        remove: function (child) {
            var children = this.children;
            var idx = zrUtil.indexOf(children, child);
            if (idx >= 0) {
                children.splice(idx, 1);
                child.parentNode = null;
            }
        },

        /**
        * 遍历当前节点及其所有子节点
        * @param  {Function} cb
        * @param  {Object}   [context]
        */
        eachNode: function (cb, context) {
            cb.call(context, this);

            for (var i = 0; i < this.children.length; i++) {
                this.children[i].eachNode(cb, context);
            }
        },

        /**
        * 更新当前树及所有子树的高度和深度
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
        }
    });

    /**
     * @constructor
     * @alias module:echarts/data/Tree
     * @param {string} name
     */
    function Tree(name) {
        /**
         * @type {module:echarts/data/Tree~TreeNode}
         */
        this.root = new TreeNode(name);
    }

    Tree.prototype.type = 'tree';

    /**
     * 遍历树的所有子节点
     * @param  {Function} cb
     * @param  {Object}   [context]
     */
    Tree.prototype.eachNode = function(cb, context) {
        this.root.eachNode(cb, context);
    };

    /**
     * 生成子树
     * @param  {string} name 子树根节点 name
     * @return {module:echarts/data/Tree}
     */
    Tree.prototype.getSubTree = function(name) {
        var root = this.getNodeByName(name);
        if (root) {
            var tree = new Tree(root.name);
            tree.root = root;
            return tree;
        }
    };

    /**
     * @param  {string} name
     * @return module:echarts/data/Tree~TreeNode
     */
    Tree.prototype.getNodeByName = function (name) {
        return this.root.getNodeByName(name);
    };


    /**
     * 从 option 里的 data 数据构建树
     * @param {string} name
     * @param {Array.<Object>} data
     * @return module:echarts/data/Tree
     */
    Tree.fromOptionData = function (name, data) {
        var tree = new Tree(name);
        var rootNode = tree.root;
        // Root node
        rootNode.data = {
            name: name,
            children: data
        };

        function buildHierarchy(dataNode, parentNode) {
            var node = new TreeNode(dataNode);
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

    return Tree;
});