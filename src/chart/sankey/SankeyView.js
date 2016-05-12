define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    var SankeyShape = graphic.extendShape({
        shape: {
            x1: 0, y1: 0,
            x2: 0, y2: 0,
            cpx1: 0, cpy1: 0,
            cpx2: 0, cpy2: 0,

            extent: 0
        },

        buildPath: function (ctx, shape) {
            var halfExtent = shape.extent / 2;
            ctx.moveTo(shape.x1, shape.y1 - halfExtent);
            ctx.bezierCurveTo(
                shape.cpx1, shape.cpy1 - halfExtent,
                shape.cpx2, shape.cpy2 - halfExtent,
                shape.x2, shape.y2 - halfExtent
            );
            ctx.lineTo(shape.x2, shape.y2 + halfExtent);
            ctx.bezierCurveTo(
                shape.cpx2, shape.cpy2 + halfExtent,
                shape.cpx1, shape.cpy1 + halfExtent,
                shape.x1, shape.y1 + halfExtent
            );
            ctx.closePath();
        }
    });

    return require('../../echarts').extendChartView({

        type: 'sankey',

        /**
         * @private
         * @type {module:echarts/chart/sankey/SankeySeries}
         */
        _model: null,

        render: function(seriesModel, ecModel, api) {
            var graph = seriesModel.getGraph();
            var group = this.group;
            var layoutInfo = seriesModel.layoutInfo;
            var nodeData = seriesModel.getData();
            var edgeData = seriesModel.getData('edge');

            this._model = seriesModel;

            group.removeAll();

            group.position = [layoutInfo.x, layoutInfo.y];

            // generate a rect  for each node
            graph.eachNode(function (node) {
                var layout = node.getLayout();
                var itemModel = node.getModel();
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');
                var labelHoverModel = itemModel.getModel('label.emphasis');
                var textStyleHoverModel = labelHoverModel.getModel('textStyle');

                var rect = new graphic.Rect({
                    shape: {
                        x: layout.x,
                        y: layout.y,
                        width: node.getLayout().dx,
                        height: node.getLayout().dy
                    },
                    style: {
                        // Get formatted label in label.normal option. Use node id if it is not specified
                        text: labelModel.get('show')
                            ? seriesModel.getFormattedLabel(node.dataIndex, 'normal') || node.id
                            // Use empty string to hide the label
                            : '',
                        textFont: textStyleModel.getFont(),
                        textFill: textStyleModel.getTextColor(),
                        textPosition: labelModel.get('position')
                    }
                });

                rect.setStyle(zrUtil.defaults(
                    {
                        fill: node.getVisual('color')
                    },
                    itemModel.getModel('itemStyle.normal').getItemStyle()
                ));

                graphic.setHoverStyle(rect, zrUtil.extend(
                    node.getModel('itemStyle.emphasis'),
                    {
                        text: labelHoverModel.get('show')
                            ? seriesModel.getFormattedLabel(node.dataIndex, 'emphasis') || node.id
                            : '',
                        textFont: textStyleHoverModel.getFont(),
                        textFill: textStyleHoverModel.getTextColor(),
                        textPosition: labelHoverModel.get('position')
                    }
                ));

                group.add(rect);

                nodeData.setItemGraphicEl(node.dataIndex, rect);

                rect.dataType = 'node';
            });

            // generate a bezire Curve for each edge
            graph.eachEdge(function (edge) {
                var curve = new SankeyShape();

                curve.dataIndex = edge.dataIndex;
                curve.seriesIndex = seriesModel.seriesIndex;
                curve.dataType = 'edge';

                var lineStyleModel = edge.getModel('lineStyle.normal');
                var curvature = lineStyleModel.get('curveness');
                var n1Layout = edge.node1.getLayout();
                var n2Layout = edge.node2.getLayout();
                var edgeLayout = edge.getLayout();

                curve.shape.extent = Math.max(1, edgeLayout.dy);

                var x1 = n1Layout.x + n1Layout.dx;
                var y1 = n1Layout.y + edgeLayout.sy + edgeLayout.dy / 2;
                var x2 = n2Layout.x;
                var y2 = n2Layout.y + edgeLayout.ty + edgeLayout.dy /2;
                var cpx1 = x1 * (1 - curvature) + x2 * curvature;
                var cpy1 = y1;
                var cpx2 = x1 * curvature + x2 * (1 - curvature);
                var cpy2 = y2;

                curve.setShape({
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    cpx1: cpx1,
                    cpy1: cpy1,
                    cpx2: cpx2,
                    cpy2: cpy2
                });

                curve.setStyle(lineStyleModel.getItemStyle());
                graphic.setHoverStyle(curve, edge.getModel('lineStyle.emphasis').getItemStyle());

                group.add(curve);

                edgeData.setItemGraphicEl(edge.dataIndex, curve);
            });
            if (!this._data && seriesModel.get('animation')) {
                group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                    group.removeClipPath();
                }));
            }
            this._data = seriesModel.getData();
        }
    });

    //add animation to the view
    function createGridClipShape(rect, seriesModel, cb) {
        var rectEl = new graphic.Rect({
            shape: {
                x: rect.x - 10,
                y: rect.y - 10,
                width: 0,
                height: rect.height + 20
            }
        });
        graphic.initProps(rectEl, {
            shape: {
                width: rect.width + 20,
                height: rect.height + 20
            }
        }, seriesModel, cb);

        return rectEl;
    }
});