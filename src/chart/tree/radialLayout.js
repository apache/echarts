define(function (require) {

    var layout = require('../../util/layout');
    var helper = require('./traversalHelper');
    var eachAfter = helper.eachAfter;
    var eachBefore = helper.eachBefore;
    var layoutHelper = require('./layoutHelper');
    var initial = layoutHelper.initial;
    var firstWalk = layoutHelper.firstWalk;
    var secondWalk = layoutHelper.secondWalk;
    var sep = layoutHelper.separation;
    var radialCoordinate = layoutHelper.radialCoordinate;

    return function (ecModel, api, payload) {

        ecModel.eachSeriesByType('tree', function (seriesModel) {

            if (seriesModel.get('layout') === 'radial') {

                var layoutInfo = getViewRect(seriesModel, api);

                seriesModel.layoutInfo = layoutInfo;

                var width = 2 * Math.PI;
                var height = layoutInfo.height;

                var virtualRoot = seriesModel.getData().tree.root;
                var realRoot = virtualRoot.children[0];
                var separation= sep(function (node1, node2) {
                    return (node1.parentNode === node2.parentNode ? 1 : 2) / node1.depth;
                });

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

                var kx = width / (right.getLayout().x + delta + tx);

                // here we use (node.depth - 1), bucause the real root's depth is 1
                var ky = height/ ((bottom.depth - 1) || 1);
                eachBefore(realRoot, function (node) {
                    var coorX = (node.getLayout().x + tx) * kx;
console.log(node.name);
console.log(coorX);

                    var coorY = (node.depth - 1) * ky;
console.log(coorY);
                    var finalCoor = radialCoordinate(coorX, coorY);
console.log(finalCoor);
                    node.setLayout({x: finalCoor.x, y: finalCoor.y, rawX: coorX, rawY: coorY}, true);
                });
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



});