define(function(require) {
    'use strict';

    require('../coord/cartesian/AxisModel');

    var AxisView = require('../echarts').extendComponentView({

        type: 'axis',

        render: function (axisModel, ecModel, api) {
            if (axisModel.get('axisLine.show')) {
                this._renderAxisLine(axisModel, api);
            }
        },

        _renderAxisLine: function (axisModel, api) {
            var axis = axisModel.axis;

            var p1 = [];
            var p2 = [];

            var lineWidth = axisModel.get('axisLine.lineStyle.width');
            var lineColor = axisModel.get('axisLine.lineStyle.color');

            var otherCoord = axis.otherCoord;
            var coordExtent = axis.getCoordExtent();
            if (axis.isHorizontal()) {
                p1[0] = coordExtent[0];
                p2[0] = coordExtent[1];
                p1[1] = p2[1] = otherCoord;
            }
            else {
                p1[1] = coordExtent[0];
                p2[1] = coordExtent[1];
                p1[0] = p2[0] = otherCoord;
            }

            api.subPixelOptimizeLine(p1, p2, lineWidth);

            this.group.add(new api.Line({
                shape: {
                    x1: p1[0],
                    y1: p1[1],
                    x2: p2[0],
                    y2: p2[1]
                },
                style: {
                    stroke: lineColor,
                    lineWidth: lineWidth
                },
                z: axisModel.get('z')
            }));
        }
    });

    AxisView.extend({
        type: 'xAxis'
    });
    AxisView.extend({
        type: 'yAxis'
    });
});