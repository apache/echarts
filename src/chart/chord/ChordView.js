define(function (require) {

    var RibbonPath = require('./Ribbon');
    var graphic = require('../../util/graphic');

    return require('../../echarts').extendChartView({

        type: 'chord',

        init: function (option) {

        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var graph = seriesModel.getGraph();
            var edgeData = seriesModel.getEdgeData();

            var group = this.group;
            group.removeAll();

            data.each(function (idx) {
                var layout = data.getItemLayout(idx);
                var sector = new graphic.Sector({
                    shape: {
                        cx: layout.cx,
                        cy: layout.cy,
                        clockwise: layout.clockwise,
                        r0: layout.r0,
                        r: layout.r,
                        startAngle: layout.startAngle,
                        endAngle: layout.endAngle
                    }
                });

                sector.setStyle({
                    fill: data.getItemVisual(idx, 'color')
                });

                data.setItemLayout(idx);
                group.add(sector);
            });

            var edgeRendered = {};
            edgeData.each(function (idx) {
                if (edgeRendered[idx]) {
                    return;
                }
                var layout = edgeData.getItemLayout(idx);
                var edge = graph.getEdgeByIndex(idx);
                var otherEdge = graph.getEdge(edge.node2, edge.node1);
                var otherEdgeLayout = otherEdge.getLayout();
                edgeRendered[idx] = edgeRendered[otherEdge.dataIndex] = true;
                var ribbon = new RibbonPath({
                    shape: {
                        cx: layout.cx,
                        cy: layout.cy,
                        r: layout.r,
                        s0: layout.startAngle,
                        s1: layout.endAngle,
                        t0: otherEdgeLayout.startAngle,
                        t1: otherEdgeLayout.endAngle,
                        clockwise: layout.clockwise
                    }
                });
                ribbon.setStyle({
                    // Use color of source
                    fill: edge.node1.getVisual('color'),
                    opacity: 0.5
                });
                group.add(ribbon);
            });
        }
    });
});