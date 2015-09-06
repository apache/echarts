define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var vector = require('zrender/core/vector');

    var elementList = ['axisLabel', 'splitLine', 'splitArea', 'axisTick', 'axisLine'];

    function getPointOnAxisLine(cx, cy, r, radian) {
        var dx = r * Math.cos(radian);
        var dy = r * Math.sin(radian);

        return [cx + dx, cy + dy];
    }

    function getAxisLineShape(radiusAxisModel, cx, cy) {

        var radiusAxis = radiusAxisModel.axis;
        var radius = radiusAxis.getExtent();

        var axisAngle = radiusAxisModel.get('axisAngle');

        var radian = axisAngle / 180 * Math.PI;

        var start = getPointOnAxisLine(cx, cy, radius[0], radian);
        var end = getPointOnAxisLine(cx, cy, radius[1], radian);

        return {
            x1: start[0],
            y1: start[1],
            x2: end[0],
            y2: end[1]
        };
    }

    require('../coord/polar/polarCreator');

    require('../echarts').extendComponentView({

        type: 'radiusAxis',

        render: function (radiusAxisModel, ecModel, api) {
            this.group.clear();

            var polarModel = ecModel.getComponent('polar', radiusAxisModel.get('polarIndex'));
            var radiusAxis = radiusAxisModel.axis;
            var polar = polarModel.coordinateSystem;
            var cx = polar.cx;
            var cy = polar.cy;
            var angleExtent = polar.getAngleAxis().getExtent();
            var ticksPositions = radiusAxis.getTicksPositions();
            zrUtil.each(elementList, function (name) {
                if (radiusAxisModel.get(name +'.show')) {
                    this['_' + name](radiusAxisModel, ticksPositions, angleExtent, cx, cy, api);
                }
            }, this);
        },

        /**
         * @private
         */
        _axisLine: function (radiusAxisModel, ticksPositions, angleExtent, cx, cy, api) {
            var arc = new api.Line({
                shape: getAxisLineShape(radiusAxisModel, cx, cy),
                style: radiusAxisModel.getModel('axisLine.lineStyle').getLineStyle()
            });

            this.group.add(arc);
        },

        /**
         * @private
         */
        _axisTick: function (radiusAxisModel, ticksPositions, angleExtent, cx, cy, api) {
            var tickModel = radiusAxisModel.getModel('axisTick');

            var axisLineShape = getAxisLineShape(radiusAxisModel, cx, cy);
            var start = [axisLineShape.x1, axisLineShape.y1];
            var end = [axisLineShape.x2, axisLineShape.y2];

            var len = vector.dist(end, start);
            var direction = [
                end[1] - start[1],
                start[0] - end[0]
            ];
            vector.normalize(direction, direction);

            var p1 = [];
            var p2 = [];
            var tickLen = tickModel.get('length');
            var lines = zrUtil.map(ticksPositions, function (tickPosition) {
                vector.lerp(p1, start, end, tickPosition / len);
                vector.scaleAndAdd(p2, p1, direction, tickLen);
                return new api.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                });
            });
            this.group.add(api.mergePath(
                lines, {
                    style: tickModel.getModel('lineStyle').getLineStyle()
                }
            ));
        },

        /**
         * @private
         */
        _axisLabel: function (radiusAxisModel, ticksPositions, angleExtent, cx, cy, api) {

        },

        /**
         * @private
         */
        _splitLine: function (radiusAxisModel, ticksPositions, angleExtent, cx, cy, api) {
            var splitLineModel = radiusAxisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineColors = lineStyleModel.get('color');
            var lineWidth = lineStyleModel.get('width');
            var lineCount = 0;

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var splitLines = [];

            for (var i = 0; i < ticksPositions.length; i++) {
                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new api.Circle({
                    shape: {
                        cx: cx,
                        cy: cy,
                        r: ticksPositions[i]
                    }
                }))
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(api.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineType: lineStyleModel.getLineDash(),
                        lineWidth: lineWidth,
                        fill: null
                    },
                    silent: true,
                    z: radiusAxisModel.get('z')
                }));
            }
        },

        /**
         * @private
         */
        _splitArea: function (radiusAxisModel, ticksPositions, angleExtent, cx, cy, api) {

        }
    });
});