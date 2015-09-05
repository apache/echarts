define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var vector = require('zrender/core/vector');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'splitLine', 'splitArea'];

    var lineStart = [];
    var lineEnd = [];
    var lineDirection = [];
    var center = [];
    function getLineShape(cx, cy, r0, r, radian) {
        center[0] = cx;
        center[1] = cy;

        lineDirection[0] = Math.cos(radian);
        lineDirection[1] = Math.sin(radian);

        vector.scaleAndAdd(lineStart, center, lineDirection, r0);
        vector.scaleAndAdd(lineEnd, center, lineDirection, r);

        return {
            x1: lineStart[0],
            y1: lineStart[1],
            x2: lineEnd[0],
            y2: lineEnd[1]
        };
    }


    require('../coord/polar/polarCreator');

    require('../echarts').extendComponentView({

        type: 'angleAxis',

        render: function (angleAxisModel, ecModel, api) {
            this.group.clear();

            var polarModel = ecModel.getComponent('polar', angleAxisModel.get('polarIndex'));
            var angleAxis = angleAxisModel.axis;
            var polar = polarModel.coordinateSystem;
            var cx = polar.cx;
            var cy = polar.cy;
            var radiusExtent = polar.getRadiusAxis().getExtent();
            var ticksAngles = angleAxis.getTicksPositions();
            zrUtil.each(elementList, function (name) {
                if (angleAxisModel.get(name +'.show')) {
                    this['_' + name](angleAxisModel, ticksAngles, radiusExtent, cx, cy, api);
                }
            }, this);
        },

        /**
         * @private
         */
        _axisLine: function (angleAxisModel, ticksAngles, radiusExtent, cx, cy, api) {
            var lineStyleModel = angleAxisModel.getModel('axisLine.lineStyle');

            var arc = new api.Arc({
                shape: {
                    x: cx,
                    y: cy,
                    r0: radiusExtent[0],
                    r: radiusExtent[1]
                },
                style: lineStyleModel.getLineStyle()
            });

            this.group.add(arc);
        },

        /**
         * @private
         */
        _axisTick: function (angleAxisModel, ticksAngles, radiusExtent, cx, cy, api) {
            var tickModel = angleAxisModel.getModel('axisTick');

            var tickLen = (tickModel.get('inside') ? -1 : 1) * tickModel.get('length');

            var lines = zrUtil.map(ticksAngles, function (tickAngle) {
                return new api.Line({
                    shape: getLineShape(cx, cy, radiusExtent[1], radiusExtent[1] + tickLen, tickAngle)
                });
            });
            this.group.add(api.mergePath(
                lines, tickModel.getModel('lineStyle').getLineStyle())
            );
        },

        /**
         * @private
         */
        _axisLabel: function (angleAxisModel, ticksAngles, radiusExtent, cx, cy, api) {

        },

        /**
         * @private
         */
        _splitLine: function (angleAxisModel, ticksAngles, radiusExtent, cx, cy, api) {
            var splitLineModel = angleAxisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineColors = lineStyleModel.get('color');
            var lineWidth = lineStyleModel.get('width');
            var lineCount = 0;

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var splitLines = [];

            for (var i = 0; i < ticksAngles.length; i++) {
                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new api.Line({
                    shape: getLineShape(cx, cy, radiusExtent[0], radiusExtent[1], tickAngle)
                }))
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(api.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineType: lineStyleModel.getLineDash(),
                        lineWidth: lineWidth
                    },
                    silent: true,
                    z: angleAxisModel.get('z')
                }));
            }
        },

        /**
         * @private
         */
        _splitArea: function (angleAxisModel, ticksAngles, radiusExtent, cx, cy, api) {

        }
    });
});