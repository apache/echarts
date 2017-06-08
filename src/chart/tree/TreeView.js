/**
 * @file  This file used to draw tree view
 */

define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendChartView({

        type: 'tree',

        render: function (seriesModel, ecModel, api) {

            // var tree = seriesModel.getData().tree;
            var virtualRoot = seriesModel.getData().tree.root;
            var realRoot = virtualRoot.children[0];
            var group = this.group;
            var layoutInfo = seriesModel.layoutInfo;
            var layout = seriesModel.get('layout');
            var orient = seriesModel.get('orient');

            group.removeAll();
            group.position = [layoutInfo.x, layoutInfo.y];

            var edges = [];
            realRoot.eachNode('preorder', function (node) {
                if (node !== realRoot) {
                    edges.push({source: node.parentNode, target: node});
                }
            });

            if (layout === 'orthogonal') {
                zrUtil.each(edges, function (edge) {
                    var x1 = edge.source.getLayout().x;
                    var y1 = edge.source.getLayout().y;
                    var x2 = edge.target.getLayout().x;
                    var y2 = edge.target.getLayout().y;
                    if (orient === 'horizontal') {
                        var cpx1 = (x1 + x2) / 2;
                        var cpy1 = y1;
                        var cpx2 = x1;
                        var cpy2 = y2
                    }
                    if (orient === 'vertical') {
                        var cpx1 = x1;
                        var cpy1 = (x1 + y1) / 2;
                        var cpx2 = x2;
                        var cpx2 = y1;
                    }

                    var curve = new graphic.BezierCurve({
                        shape: {
                            x1: x1,
                            y1: y1,
                            x2: x2,
                            y2: y2,
                            cpx1: cpx1,
                            cpy1: cpy1,
                            cpx2: cpx2,
                            cpy2: cpy2
                        }
                    });

                    curve.dataType = 'edge';

                    group.add(edge);

                });
            }

            realRoot.eachNode('preorder', function (node) {
                var layout = node.getLayout();
                var radius = seriesModel.get('nodeRadius');

                var circle = new graphic.circle({
                    shape: {
                        cx: node.getLayout().x,
                        cy: node.getLayout().y,
                        r: radius
                    }
                });

                circle.dataType = 'node';
                group.add(circle);

            });
        }

    });




});