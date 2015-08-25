define(function(require) {
    'use strict';

    require('../coord/cartesian/AxisModel');

    var AxisView = require('../echarts').extendComponentView({

        type: 'axis',

        render: function (axisModel, ecModel, api) {
            if (axisModel.get('axisLine.show')) {
                this._renderAxisLine(axisModel, ecModel, api);
            }
            if (axisModel.get('axisTick.show')) {
                this._renderAxisTick(axisModel, ecModel, api);
            }
        },

        _renderAxisLine: function (axisModel, ecModel, api) {
            var axis = axisModel.axis;

            var p1 = [];
            var p2 = [];

            var lineStyleModel = axisModel.getModel('axisLine.lineStyle');
            var lineWidth = lineStyleModel.get('width');
            var lineColor = lineStyleModel.get('color');
            var lineType = lineStyleModel.get('type');

            var gridModel = ecModel.getComponent(
                'grid', axisModel.get('gridIndex')
            );
            var rect = gridModel.coordinateSystem.getRect();

            var otherCoord = axis.otherCoord;
            if (axis.isHorizontal()) {
                p1[0] = rect.x;
                p2[0] = rect.x + rect.width;
                p1[1] = p2[1] = otherCoord;
            }
            else {
                p1[1] = rect.y;
                p2[1] = rect.y + rect.height;
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
                    lineWidth: lineWidth,
                    lineCap: 'round',
                    lineType: lineType
                },
                z: axisModel.get('z')
            }));
        },

        _renderAxisTick: function (axisModel, ecModel, api) {
            var axis = axisModel.axis;
            var tickModel = axisModel.getModel('axisTick');

            var lineStyleModel = tickModel.getModel('lineStyle');
            var tickLen = tickModel.get('length');
            var tickColor = lineStyleModel.get('color');
            var tickLineWidth = lineStyleModel.get('width');
            var tickInterval = tickModel.get('interval') || 0;
            var isTickIntervalFunction = typeof tickInterval === 'function';
            // PENDING Axis tick don't have the situation that don't have enough space to place
            if (tickInterval === 'auto') {
                tickInterval = 0;
            }

            var isOrdinalAxis = axis.scale.type === 'ordinal';

            var axisPosition = axis.position;
            var ticksCoords = isOrdinalAxis && axis.boundaryGap
                ? axis.getBandsCoords(true) : axis.getTicksCoords();

            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (isOrdinalAxis) {
                    if (isTickIntervalFunction) {
                        if (! tickInterval(i, axis.scale.getItem(i))) {
                            continue;
                        }
                    }
                    else {
                        if (i % (tickInterval + 1)) {
                            continue;
                        }
                    }
                }

                var tickCoord = ticksCoords[i];

                var x;
                var y;
                var offX = 0;
                var offY = 0;

                if (axis.isHorizontal()) {
                    x = tickCoord;
                    y = axis.otherCoord;
                    offY = axisPosition === 'top' ? -tickLen : tickLen;
                }
                else {
                    x = axis.otherCoord;
                    y = tickCoord;
                    offX = axisPosition === 'left' ? -tickLen : tickLen;
                }
                if (tickModel.get('inside')) {
                    offX = -offX;
                    offY = -offY;
                }
                var p1 = [x, y];
                var p2 = [x + offX, y + offY];
                api.subPixelOptimizeLine(p1, p2, tickLineWidth);
                // Tick line
                var tickLine = new api.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    },
                    style: {
                        stroke: tickColor,
                        lineWidth: tickLineWidth
                    }
                });
                this.group.add(tickLine);
            }
        }
    });

    AxisView.extend({
        type: 'xAxis'
    });
    AxisView.extend({
        type: 'yAxis'
    });
});