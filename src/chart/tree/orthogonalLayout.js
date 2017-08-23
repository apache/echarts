/**
 * @file  The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *        the tree.
 * @see  https://github.com/d3/d3-hierarchy
 */
define(function (require) {

    var helper = require('./traversalHelper');
    var eachAfter = helper.eachAfter;
    var eachBefore = helper.eachBefore;
    var layoutHelper = require('./layoutHelper');
    var initial = layoutHelper.initial;
    var firstWalk = layoutHelper.firstWalk;
    var secondWalk = layoutHelper.secondWalk;
    var sep = layoutHelper.separation;
    var getViewRect = layoutHelper.getViewRect;

    return function (ecModel, api, payload) {

        ecModel.eachSeriesByType('tree', function (seriesModel) {
            if (seriesModel.get('layout') === 'orthogonal') {
                var layoutInfo = getViewRect(seriesModel, api);
                seriesModel.layoutInfo = layoutInfo;

                var width = layoutInfo.width;
                var height = layoutInfo.height;

                var virtualRoot = seriesModel.getData().tree.root;
                var realRoot = virtualRoot.children[0];
                var separation = sep();

                initial(virtualRoot);
                eachAfter(realRoot, firstWalk, separation);

                virtualRoot.hierNode.modifier = - realRoot.hierNode.prelim;

                eachBefore(realRoot, secondWalk);

                var left = realRoot;
                var right = realRoot;
                var bottom = realRoot;
                eachBefore(realRoot, function (node) {
                    var x = node.getLayout().x;

                    if (x < left.getLayout().x) {
                        left = node;
                    }
                    if (x > right.getLayout().x) {
                        right = node;
                    }
                    if (node.depth > bottom.depth) {
                        bottom = node;
                    }
                });

                var delta = left === right ? 1 : separation(left, right) / 2;
                var tx = delta - left.getLayout().x;
                var orient = seriesModel.get('orient');

                if (orient === 'horizontal') {
                    var ky = height / (right.getLayout().x + delta + tx);
                    // here we use (node.depth - 1), bucause the real root's depth is 1
                    var kx = width / ((bottom.depth - 1) || 1);
                    eachBefore(realRoot, function (node) {
                        var coorY = (node.getLayout().x + tx) * ky;
                        var coorX = (node.depth - 1) * kx;
                        node.setLayout({x: coorX, y: coorY}, true);
                    });
                }
                if (orient === 'vertical') {
                    var kx = width / (right.getLayout().x + delta + tx);
                    // here we use (node.depth - 1), bucause the real root's depth is 1
                    var ky = height / ((bottom.depth - 1) || 1);
                    eachBefore(realRoot, function (node) {
                        var coorX = (node.getLayout().x + tx) * kx;
                        var coorY = (node.depth - 1) * ky;
                        node.setLayout({x: coorX, y: coorY}, true);
                    });
                }
            }
        });
    };

});