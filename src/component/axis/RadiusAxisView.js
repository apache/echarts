define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var AxisBuilder = require('./AxisBuilder');

    var axisBuilderAttrs = [
        'axisLine', 'axisLabel', 'axisTick', 'axisName'
    ];
    var selfBuilderAttrs = [
        'splitLine', 'splitArea'
    ];

    require('../../echarts').extendComponentView({

        type: 'radiusAxis',

        render: function (radiusAxisModel, ecModel) {
            this.group.removeAll();
            if (!radiusAxisModel.get('show')) {
                return;
            }
            var polarModel = ecModel.getComponent('polar', radiusAxisModel.get('polarIndex'));
            var angleAxis = polarModel.coordinateSystem.getAngleAxis();
            var radiusAxis = radiusAxisModel.axis;
            var polar = polarModel.coordinateSystem;
            var ticksCoords = radiusAxis.getTicksCoords();
            var axisAngle = angleAxis.getExtent()[0];
            var radiusExtent = radiusAxis.getExtent();

            var layout = layoutAxis(polar, radiusAxisModel, axisAngle);
            var axisBuilder = new AxisBuilder(radiusAxisModel, layout);
            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);
            this.group.add(axisBuilder.getGroup());

            zrUtil.each(selfBuilderAttrs, function (name) {
                if (radiusAxisModel.get(name +'.show')) {
                    this['_' + name](radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords);
                }
            }, this);
        },

        /**
         * @private
         */
        _splitLine: function (radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {
            var splitLineModel = radiusAxisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineColors = lineStyleModel.get('color');
            var lineCount = 0;

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var splitLines = [];

            for (var i = 0; i < ticksCoords.length; i++) {
                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new graphic.Circle({
                    shape: {
                        cx: polar.cx,
                        cy: polar.cy,
                        r: ticksCoords[i]
                    },
                    silent: true
                }));
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitLines.length; i++) {
                this.group.add(graphic.mergePath(splitLines[i], {
                    style: zrUtil.defaults({
                        stroke: lineColors[i % lineColors.length],
                        fill: null
                    }, lineStyleModel.getLineStyle()),
                    silent: true
                }));
            }
        },

        /**
         * @private
         */
        _splitArea: function (radiusAxisModel, polar, axisAngle, radiusExtent, ticksCoords) {

            var splitAreaModel = radiusAxisModel.getModel('splitArea');
            var areaStyleModel = splitAreaModel.getModel('areaStyle');
            var areaColors = areaStyleModel.get('color');
            var lineCount = 0;

            areaColors = areaColors instanceof Array ? areaColors : [areaColors];

            var splitAreas = [];

            var prevRadius = ticksCoords[0];
            for (var i = 1; i < ticksCoords.length; i++) {
                var colorIndex = (lineCount++) % areaColors.length;
                splitAreas[colorIndex] = splitAreas[colorIndex] || [];
                splitAreas[colorIndex].push(new graphic.Sector({
                    shape: {
                        cx: polar.cx,
                        cy: polar.cy,
                        r0: prevRadius,
                        r: ticksCoords[i],
                        startAngle: 0,
                        endAngle: Math.PI * 2
                    },
                    silent: true
                }));
                prevRadius = ticksCoords[i];
            }

            // Simple optimization
            // Batching the lines if color are the same
            for (var i = 0; i < splitAreas.length; i++) {
                this.group.add(graphic.mergePath(splitAreas[i], {
                    style: zrUtil.defaults({
                        fill: areaColors[i % areaColors.length]
                    }, areaStyleModel.getAreaStyle()),
                    silent: true
                }));
            }
        }
    });

    /**
     * @inner
     */
    function layoutAxis(polar, radiusAxisModel, axisAngle) {
        return {
            position: [polar.cx, polar.cy],
            rotation: axisAngle / 180 * Math.PI,
            labelDirection: -1,
            tickDirection: -1,
            nameDirection: 1,
            labelRotation: radiusAxisModel.getModel('axisLabel').get('rotate'),
            // Over splitLine and splitArea
            z2: 1
        };
    }
});