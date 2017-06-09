/**
 * @file  The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *        the tree.
 * @see  https://github.com/d3/d3-hierarchy
 */
define(function (require) {

    var layout = require('../../util/layout');

    return function (ecModel, api, payload) {

        ecModel.eachSeriesByType('tree', function (seriesModel) {
            if (seriesModel.get('layout') === 'orthogonal') {
                var layoutInfo = getViewRect(seriesModel, api);

                seriesModel.layoutInfo = layoutInfo;

                var width = layoutInfo.width;
                var height = layoutInfo.height;

                var virtualRoot = seriesModel.getData().tree.root;
                var realRoot = virtualRoot.children[0];

                initial(virtualRoot);
                eachAfter(realRoot, firstWalk);
                virtualRoot.hierNode.modifier = - realRoot.hierNode.prelim;
                eachBefore(realRoot, secondWalk);

                var left = realRoot;
                var right = realRoot;
                var bottom = realRoot;
                eachBefore(realRoot, function (node) {
                    if (node.getLayout().x < left.getLayout().x) {
                        left = node;
                    }
                    if (node.getLayout().x > right.getLayout().x) {
                        right = node;
                    }
                    if (node.depth > bottom.depth) {
                        bottom = node;
                    }
                });

                var delta = left === right ? 1 : separation(left, right);
                var tx = delta - left.getLayout().x;
                var orient = seriesModel.get('orient');
                if (orient === 'horizontal') {
                    var ky = height / right.getLayout().x + delta + tx;
                    var kx = width / (bottom.depth || 1);
                    eachBefore(realRoot, function (node) {
                        var coorY = (node.getLayout().x + tx) * ky;
                        var coorX = node.depth * kx;
                        node.setLayout({x: coorX}, true);
                        node.setLayout({y: coorY}, true);
                    });
                }
                if (orient == 'vertical') {
                    var kx = width / right.getLayout().x + delta + tx;
                    var ky = height / (bottom.depth || 1);
                    eachBefore(realRoot, function (node) {
                        var coorX = (node.getLayout().x + tx) * kx;
                        var coorY = node.depth * ky;
                        node.setLayout({x: coorX}, true);
                        node.setLayout({y: coorY}, true);
                    });
                }
            }
        });
    };

    /**
     * Get the layout position of the whole view
     *
     * @param {module:echarts/model/Series} seriesModel  the model object of sankey series
     * @param {module:echarts/ExtensionAPI} api  provide the API list that the developer can call
     * @return {module:zrender/core/BoundingRect}  size of rect to draw the sankey view
     */
    function getViewRect(seriesModel, api) {
        return layout.getLayoutRect(
            seriesModel.getBoxLayoutParams(), {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );
    }

    /**
     * Initialize all computational message for following algorithm
     * @param  {module:echarts/data/Tree~TreeNode} root   The virtual root of the tree
     */
    function initial(root) {
        root.hierNode = root.hierNode || {
            defaultAncestor: null,
            ancestor: root,
            prelim: 0,
            modifier: 0,
            change: 0,
            shift: 0,
            i: 0,
            thread: null
        };

        var nodes = [root];
        var node;
        var children;

        while (node = nodes.pop()) {
            children = node.children;
            if (children) {
                var n = children.length;
                for (var i = n - 1; i >= 0; i--) {
                    var child = children[i];
                    child.hierNode = child.hierNode || {
                        defaultAncestor: null,
                        ancestor: child,
                        prelim: 0,
                        modifier: 0,
                        change: 0,
                        shift: 0,
                        i: i,
                        thread: null
                    };
                    nodes.push(child);
                }
            }
        }
    }

    /**
     * Traverse the tree from bottom to top and do something
     * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
     * @param  {Function} callback
     */
    function eachAfter(root, callback) {
        var nodes = [node];
        var next = [];
        var node;

        while (node = nodes.pop()) {
            next.push(node);
            var children = node.children;
            if (children) {
                var n = children.length;
                for (var i = 0; i < n; i++) {
                    nodes.push(children[i]);
                }
            }
        }
        while (node = next.pop()){
            callback(node);
        }
    }

    /**
     * Computes a preliminary x coordinate for node. Before that, this function is
     * applied recursively to the children of node, as well as the function
     * apportion(). After spacing out the children by calling executeShifts(), the
     * node is placed to the midpoint of its outermost children.
     * @param  {module:echarts/data/Tree~TreeNode} node
     */
    function firstWalk(node) {
        var children = node.children;
        var siblings = node.parentNode.children;
        var subtreeW = node.hierNode.i ? siblings[node.hierNode.i -1] : null;
        if (children) {
            executeShifts(node);
            var midPoint = (children[0].hierNode.prelim + children[children.lenght - 1].hierNode.prelim) / 2;
            if (subtreeW) {
                node.hierNode.prelim = subtreeW.hierNode.prelim + separation(node, subtreeW);
                node.hierNode.modifier = node.hierNode.prelim - midPoint;
            }
            else {
                node.hierNode.prelim = midPoint;
            }
        }
        else if (subtreeW) {
            node.hierNode.prelim = subtreeW.hierNode.prelim + separation(node, subtreeW);
        }
        node.parentNode.hierNode.defaultAncestor = apportion(node, subtreeW, node.parentNode.hierNode.defaultAncestor || siblings[0]);
    }

    /**
     * All other shifts, applied to the smaller subtrees between w- and w+, are
     * performed by this function.
     * @param  {module:echarts/data/Tree~TreeNode} node
     */
    function executeShifts(node) {
        var children = node.children;
        var n = children.length;
        var shift = 0;
        var change = 0;
        while (--n > 0) {
            var child = children[n];
            child.hierNode.prelim += shift;
            child.hierNode.modifier += shift;
            change += child.hierNode.change;
            shift += child.hierNode.shift + change;
        }
    }


    function separation(node1, node2) {
        return node1.parentNode === node2.parentNode ? 1 : 2;
    }

    /**
     * The core of the algorithm. Here, a new subtree is combined with the
     * previous subtrees. Threads are used to traverse the inside and outside
     * contours of the left and right subtree up to the highest common level.
     * Whenever two nodes of the inside contours conflict, we compute the left
     * one of the greatest uncommon ancestors using the function nextAncestor()
     * and call moveSubtree() to shift the subtree and prepare the shifts of
     * smaller subtrees. Finally, we add a new thread (if necessary).
     * @param  {module:echarts/data/Tree~TreeNode} subtreeV
     * @param  {module:echarts/data/Tree~TreeNode} subtreeW
     * @param  {module:echarts/data/Tree~TreeNode} ancestor
     * @return {module:echarts/data/Tree~TreeNode}
     */
    function apportion(subtreeV, subtreeW, ancestor) {
        if (subtreeW) {
            var nodeOutRight = subtreeV;
            var nodeInRight = subtreeV;
            var nodeOutLeft = nodeOutLeft.parentNode.children[0];
            var nodeInLeft = subtreeW;

            var sumOutRight = nodeOutRight.hierNode.modifier;
            var sumInRight = nodeInRight.hierNode.modifier;
            var sumOutLeft = nodeOutLeft.hierNode.modifier;
            var sumInLeft = nodeInLeft.hierNode.modifier;

            while ((nodeInLeft = nextRight(nodeInLeft)) && (nodeInRight = nextLeft(nodeInRight))) {
                nodeOutRight = nextRight(nodeOutRight);
                nodeOutLeft = nextLeft(nodeOutLeft);
                nodeOutRight.hierNode.ancestor = subtreeV;
                var shift = nodeInLeft.hierNode.prelim + sumInLeft - nodeInRight.hierNode.prelim
                     - sumInRight + separation(nodeInLeft, nodeInRight);
                if (shift > 0) {
                    moveSubtree(nextAncestor(nodeInLeft, subtreeV, ancestor), subtreeV, shift);
                    sumInRight += shift;
                    sumOutRight += shift;
                }
                sumInLeft += nodeInLeft.hierNode.modifier;
                sumInRight += nodeInRight.hierNode.modifier;
                sumOutRight += nodeOutRight.hierNode.modifier;
                sumOutLeft + nodeOutLeft.hierNode.modifier;
            }
            if (nodeInLeft && !nextRight(nodeOutRight)) {
                nodeOutRight.hierNode.thread = nodeInLeft;
                nodeOutRight.hierNode.modifier += sumInLeft - sumOutRight;

            }
            if (nodeInRight && !nextLeft(nodeOutLeft)) {
                nodeOutLeft.hierNode.thread = nodeInRight;
                nodeOutLeft.hierNode.modifier += sumInRight - sumOutLeft;
                ancestor = subtreeV;
            }
        }
        return ancestor;
    }

    /**
     * This function is used to traverse the right contour of a subtree.
     * It returns the rightmost child of node or the thread of node. The function
     * returns null if and only if node is on the highest depth of its subtree.
     * @param  {module:echarts/data/Tree~TreeNode} node
     * @return {module:echarts/data/Tree~TreeNode}
     */
    function nextRight(node) {
        var children = node.children;
        return children ? children[children.length - 1] : node.hierNode.thread;
    }

    /**
     * This function is used to traverse the left contour of a subtree (or a subforest).
     * It returns the leftmost child of node or the thread of node. The function
     * returns null if and only if node is on the highest depth of its subtree.
     * @param  {module:echarts/data/Tree~TreeNode} node
     * @return {module:echarts/data/Tree~TreeNode}
     */
    function nextLeft(node) {
        var children = node.children;
        return children ? children[0] : node.hierNode.thread;
    }

    /**
     * If nodeInLeft’s ancestor is a sibling of node, returns nodeInLeft’s ancestor.
     * Otherwise, returns the specified ancestor.
     * @param  {module:echarts/data/Tree~TreeNode} nodeInLeft
     * @param  {module:echarts/data/Tree~TreeNode} node
     * @param  {module:echarts/data/Tree~TreeNode} ancestor
     * @return {module:echarts/data/Tree~TreeNode}
     */
    function nextAncestor(nodeInLeft, node, ancestor) {
        return nodeInLeft.hierNode.ancestor.parentNode === node.parentNode
            ? nodeInLeft.hierNode.ancestor : ancestor;
    }

    /**
     * Shifts the current subtree rooted at wr. This is done by increasing prelim(w+) and modifier(w+) by shift.
     * @param  {module:echarts/data/Tree~TreeNode} wl
     * @param  {module:echarts/data/Tree~TreeNode} wr
     * @param  {number} shift [description]
     */
    function moveSubtree(wl, wr,shift) {
        var change = shift / (wr.hierNode.i - wl.hierNode.i);
        wr.hierNode.change -= change;
        wr.hierNode.shift += shift;
        wr.hierNode.modifier += shift;
        wr.hierNode.prelim += shift;
        wl.hierNode.change += change;
    }

    /**
     * Traverse the tree from top to bottom and do something
     * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
     * @param  {Function} callback
     */
    function eachBefore(root, callback) {
        var nodes = [root];
        var node;
        while (node = nodes.pop()) {
            callback(node);
            var children = node.children;
            if (children) {
                for (var i = children.length - 1; i > 0; i--) {
                    nodes.push(children[i]);
                }
            }
        }
    }

    /**
     * Computes all real x-coordinates by summing up the modifiers recursively.
     * @param  {module:echarts/data/Tree~TreeNode} node [description]
     * @return {[type]}      [description]
     */
    function secondWalk(node) {
        var nodeX = node.hierNode.prelim + node.parentNode.hierNode.modifier;
        node.setLayout({x: nodeX}, true);
        node.hierNode.modifier += node.parentNode.hierNode.modifier;
    }

});