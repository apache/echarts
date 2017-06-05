/**
 * @file  The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *        the tree.
 * @author Deqing Li(annong035@sina.com)
 */
define(function (require) {

    var layout = require('../../util/layout');
    var Tree = require('../../data/Tree');

    return function (ecModel, api, payload) {

        ecModel.eachSeriesByType('tree', function (seriesModel) {

            var layoutInfo = getViewRect(seriesModel, api);

            seriesModel.layoutInfo = layoutInfo;

            var width = layoutInfo.width;
            var height = layoutInfo.height;

            var virtualRoot = seriesModel.getData().tree.root;
            var realRoot = virtualRoot.children[0];








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

    function initial(root) {
        root.hierNode = root.hierNode || {
            defaultAncestor = null,
            ancestor = root,
            prelim = 0,
            modifier = 0,
            change = 0,
            shift = 0,
            i = 0,
            thread = null
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
                        defaultAncestor = null,
                        ancestor = child,
                        prelim = 0,
                        modifier = 0,
                        change = 0,
                        shift = 0,
                        i = i,
                        thread = null
                    };
                    nodes.push(child);
                }
            }
        }
    }

    function eachAfter(root, callback) {
        var nodes = [node];
        var next = [];
        var node;

        while (node = nodes.pop()) {
            next.push(node);
            var children = node.children;
            if (children) {
                var n = children.length;
                for (var i = 0, i < n; i++) {
                    nodes.push(children[i]);
                }
            }
        }
        while (node = next.pop()){
            callback(node);
        }
    }

    function eachBefore(root, callback) {

    }


    function firstWalk(node) {
        var children = node.children;
        var siblings = node.parentNode.children;
        var subtreeW = node.hierNode.i ? siblings[i -1] : null;
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
                shift = nodeInLeft.hierNode.prelim + sumInLeft - nodeInRight.hierNode.prelim
                     - sumInRight + separation(nodeInLeft, nodeInRight);
                if (shift > 0) {
                    moveSubtree(nestAncestor(nodeInLeft, subtreeV, ancestor), v, shift);
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

            }



        }



    }

    function nextRight(node) {
        var children = node.children;
        return children ? children[children.length - 1] : node.hierNode.thread;
    }

    function nextLeft(node) {
        var children = node.children;
        return children ? children[0] : node.hierNode.thread;
    }

    function nextAncestor(nodeInLeft, node, ancestor) {
        return nodeInLeft.hierNode.ancestor.parentNode === node.parentNode
            ? nodeInLeft.hierNode.ancestor : ancestor;
    }

    function moveSubtree(wl, wr,shift) {
        var change = shift / (wr.hierNode.i - wl.hierNode.i);
        wr.hierNode.change -= change;
        wr.hierNode.shift += shift;
        wr.hierNode.modifier += shift;
        wr.hierNode.prelim += shift;
        wl.hierNode.change += change;
    }

    function secondWalk(node) {

    }











});