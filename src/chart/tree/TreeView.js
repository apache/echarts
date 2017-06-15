/**
 * @file  This file used to draw tree view
 */

define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendChartView({

        type: 'tree',

        render: function (seriesModel, ecModel, api) {

            var nodeData = seriesModel.getData();
            var tree = nodeData.tree;
            var virtualRoot = tree.root;
            // var leavesModel = tree.leavesModel;
            var realRoot = virtualRoot.children[0];
            var group = this.group;
            var layoutInfo = seriesModel.layoutInfo;
            var layout = seriesModel.get('layout');
            var orient = seriesModel.get('orient');
            var lineStyleModel = seriesModel.getModel('lineStyle.normal');
            var curvature = lineStyleModel.get('curveness');
            var lineStyle = lineStyleModel.getLineStyle();

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
                    var cpx1;
                    var cpy1;
                    var cpx2;
                    var cpy2;
                    if (orient === 'horizontal') {
                        cpx1 = x1 + (x2 - x1) * curvature * 1.6;
                        cpy1 = y1;
                        cpx2 = x2 + (x1 - x2) * curvature;
                        cpy2 = y2;
                    }
                    // vertical
                    if (orient === 'vertical') {
                        cpx1 = x1;
                        cpy1 = (y1 + y2) / 2
                        cpx2 = x2;
                        cpy2 = y1;
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

                    curve.setStyle(lineStyle);

                    group.add(curve);

                });
            }

            var radius = seriesModel.get('nodeRadius');

            realRoot.eachNode('preorder', function (node) {
                var layout = node.getLayout();
                // leaf node will get the leavesModel
                var itemModel = node.getModel();
                var itemNormalStyle = itemModel.getModel('itemStyle.normal').getItemStyle();
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');

                var circle = new graphic.Circle({
                    shape: {
                        cx: layout.x,
                        cy: layout.y,
                        r: radius
                    },
                    style: {
                        // Get formatted label in label.normal
                        //  Use node name if it is not specified
                        text: labelModel.get('show')
                            ? seriesModel.getFormattedLabel(node.dataIndex, 'normal') || node.name
                            : '',
                        textFont: textStyleModel.getFont(),
                        // textFill must be setted, otherwise, the text can't be drawed.
                        textFill: textStyleModel.getTextColor(),
                        textPosition: labelModel.get('position')
                    }
                });

                circle.dataType = 'node';

                circle.setStyle(itemNormalStyle);

                group.add(circle);

                nodeData.setItemGraphicEl(node.dataIndex, circle);

            });
        },

        dispose: function () {}

    });

});