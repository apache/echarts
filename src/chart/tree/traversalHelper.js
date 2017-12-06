
/**
 * Traverse the tree from bottom to top and do something
 * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
 * @param  {Function} callback
 */
function eachAfter (root, callback, separation) {
    var nodes = [root];
    var next = [];
    var node;

    while (node = nodes.pop()) { // jshint ignore:line
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

    while (node = next.pop()) { // jshint ignore:line
        callback(node, separation);
    }
}

/**
 * Traverse the tree from top to bottom and do something
 * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
 * @param  {Function} callback
 */
function eachBefore (root, callback) {
    var nodes = [root];
    var node;
    while (node = nodes.pop()) { // jshint ignore:line
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

export { eachAfter, eachBefore };