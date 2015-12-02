define(function (require) {

    var graphic = require('../../util/graphic');
    var modelUtil = require('../../util/model');

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
            this._model = seriesModel;

            group.removeAll();

            group.position = [seriesModel.layoutInfo.x, seriesModel.layoutInfo.y];
            var textStyle = seriesModel.getModel('label.normal').getModel('textStyle');

            var edgeData = graph.edgeData;
            var rawOption = seriesModel.option;
            var formatModel = modelUtil.createDataFormatModel(
                seriesModel, edgeData, rawOption.edges || rawOption.links
            );

            formatModel.formatTooltip = function (dataIndex) {
                var params = this.getDataParams(dataIndex);
                var rawDataOpt = params.data;
                var html = rawDataOpt.source + ' -- ' + rawDataOpt.target;
                if (params.value) {
                    html += ':' + params.value;
                }
                return html;
            };

            // generate a rect  for each node
            graph.eachNode(function (node) {
                var rect = new graphic.Rect({
                    shape: {
                        x: node.getLayout().x,
                        y: node.getLayout().y,
                        width: node.getLayout().dx,
                        height: node.getLayout().dy
                    },
                    style: {
                        stroke: '#000',
                        fill: node.getVisual('color')
                    }
                });

                // rect.setHoverStyle(rect, node.inEdges.)
                group.add(rect);

                var text = new graphic.Text({
                    style: {
                        x: node.getLayout().x + node.getLayout().dx + 4,
                        y: node.getLayout().y + node.getLayout().dy / 2,
                        text: node.id,
                        textAlign: 'start',
                        textBaseline: 'middle',
                        textFont: textStyle.getFont()                        
                    }
                });
                group.add(text);
            });

            // generate a bezire Curve for each edge
            graph.eachEdge(function (edge) {
                var curve = new graphic.BezierCurve();

                curve.dataIndex = edge.dataIndex;
                curve.hostModel = formatModel;

                curve.style.lineWidth = Math.max(1, edge.getLayout().dy);

                var lineStyleModel = edge.getModel('lineStyle.normal');
                var curvature = lineStyleModel.get('curveness');
                var x1 = edge.node1.getLayout().x + edge.node1.getLayout().dx;
                var y1 = edge.node1.getLayout().y + edge.getLayout().sy + edge.getLayout().dy / 2;
                var x2 = edge.node2.getLayout().x;
                var y2 = edge.node2.getLayout().y + edge.getLayout().ty + edge.getLayout().dy /2;
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

                // 'width' is just for 'lineWidth', lineWidth get from the computation,so user can't set it
                curve.setStyle(lineStyleModel.getLineStyle(['width']));

                graphic.setHoverStyle(curve, edge.getModel('lineStyle.emphasis').getLineStyle());

                group.add(curve);

            });
            if (!this._data) {
                group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                    group.removeClipPath();
                }));
            }
            this._data = seriesModel.getData();
        }
    });

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