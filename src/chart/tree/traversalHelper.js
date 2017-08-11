define(function (require) {

    var traversalHelper = {

        /**
         * Traverse the tree from bottom to top and do something
         * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
         * @param  {Function} callback
         */
        eachAfter: function (root, callback, separation) {
            var nodes = [root];
            var next = [];
            var node;

            while (node = nodes.pop()) {
                next.push(node);
                if (node.isExpand) {
                    var children = node.children;
                    if (children.length) {
                        for (var i = 0; i < children.length; i++) {
                        nodes.push(children[i]);
                        }
                    }
                }
            }

            while (node = next.pop()){
                callback(node, separation);
            }
        },

        /**
         * Traverse the tree from top to bottom and do something
         * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
         * @param  {Function} callback
         */
        eachBefore: function (root, callback) {
            var nodes = [root];
            var node;
            while (node = nodes.pop()) {
                callback(node);
                if (node.isExpand) {
                    var children = node.children;
                    if (children.length) {
                        for (var i = children.length - 1; i >= 0; i--) {
                            nodes.push(children[i]);
                        }
                    }
                }
            }
        }
    };

    return traversalHelper;
});