/**
 * @file  The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *        the tree.
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
     *
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
     * [eachAfter description]
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
     * [firstWalk description]
     * @param  {[type]} node [description]
     * @return {[type]}      [description]
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
     * [executeShifts description]
     * @param  {[type]} node [description]
     * @return {[type]}      [description]
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
     * [apportion description]
     * @param  {[type]} subtreeV [description]
     * @param  {[type]} subtreeW [description]
     * @param  {[type]} ancestor [description]
     * @return {[type]}          [description]
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
     * [nextRight description]
     * @param  {[type]} node [description]
     * @return {[type]}      [description]
     */
    function nextRight(node) {
        var children = node.children;
        return children ? children[children.length - 1] : node.hierNode.thread;
    }

    /**
     * [nextLeft description]
     * @param  {[type]} node [description]
     * @return {[type]}      [description]
     */
    function nextLeft(node) {
        var children = node.children;
        return children ? children[0] : node.hierNode.thread;
    }

    /**
     * [nextAncestor description]
     * @param  {[type]} nodeInLeft [description]
     * @param  {[type]} node       [description]
     * @param  {[type]} ancestor   [description]
     * @return {[type]}            [description]
     */
    function nextAncestor(nodeInLeft, node, ancestor) {
        return nodeInLeft.hierNode.ancestor.parentNode === node.parentNode
            ? nodeInLeft.hierNode.ancestor : ancestor;
    }

    /**
     * [moveSubtree description]
     * @param  {[type]} wl    [description]
     * @param  {[type]} wr    [description]
     * @param  {[type]} shift [description]
     * @return {[type]}       [description]
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
     * [eachBefore description]
     * @param  {module:echarts/data/Tree~TreeNode} root  The real root of the tree
     * @param  {Function} callback [description]
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
     * [secondWalk description]
     * @param  {module:echarts/data/Tree~TreeNode} node [description]
     * @return {[type]}      [description]
     */
    function secondWalk(node) {
        var nodeX = node.hierNode.prelim + node.parentNode.hierNode.modifier;
        node.setLayout({x: nodeX}, true);
        node.hierNode.modifier += node.parentNode.hierNode.modifier;
    }

});