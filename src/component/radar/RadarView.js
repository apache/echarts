define(function (require) {

    var AxisBuilder = require('../axis/AxisBuilder');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var axisBuilderAttrs = [
        'axisLine', 'axisLabel', 'axisTick', 'axisName'
    ];

    return require('../../echarts').extendComponentView({

        type: 'radar',

        render: function (radarModel, ecModel, api) {
            var group = this.group;
            group.removeAll();

            this._buildAxes(radarModel);
            this._buildSplitLineAndArea(radarModel);
        },

        _buildAxes: function (radarModel) {
            var radar = radarModel.coordinateSystem;
            var indicatorAxes = radar.getIndicatorAxes();
            var axisBuilders = zrUtil.map(indicatorAxes, function (indicatorAxis) {
                var axisBuilder = new AxisBuilder(indicatorAxis.model, {
                    position: [radar.cx, radar.cy],
                    rotation: indicatorAxis.angle,
                    labelDirection: -1,
                    tickDirection: -1,
                    nameDirection: 1
                });
                return axisBuilder;
            });

            zrUtil.each(axisBuilders, function (axisBuilder) {
                zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);
                this.group.add(axisBuilder.getGroup());
            }, this);
        },

        _buildSplitLineAndArea: function (radarModel) {
            var radar = radarModel.coordinateSystem;
            var splitNumber = radarModel.get('splitNumber');
            var indicatorAxes = radar.getIndicatorAxes();
            if (!indicatorAxes.length) {
                return;
            }
            var shape = radarModel.get('shape');
            var splitLineModel = radarModel.getModel('splitLine');
            var splitAreaModel = radarModel.getModel('splitArea');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var areaStyleModel = splitAreaModel.getModel('areaStyle');

            var showSplitLine = splitLineModel.get('show');
            var showSplitArea = splitAreaModel.get('show');
            var splitLineColors = lineStyleModel.get('color');
            var splitAreaColors = areaStyleModel.get('color');

            splitLineColors = zrUtil.isArray(splitLineColors) ? splitLineColors : [splitLineColors];
            splitAreaColors = zrUtil.isArray(splitAreaColors) ? splitAreaColors : [splitAreaColors];

            var splitLines = [];
            var splitAreas = [];

            function getColorIndex(areaOrLine, areaOrLineColorList, idx) {
                var colorIndex = idx % areaOrLineColorList.length;
                areaOrLine[colorIndex] = areaOrLine[colorIndex] || [];
                return colorIndex;
            }

            if (shape === 'circle') {
                var ticksRadius = indicatorAxes[0].getTicksCoords();
                var cx = radar.cx;
                var cy = radar.cy;
                for (var i = 0; i < ticksRadius.length; i++) {
                    if (showSplitLine) {
                        var colorIndex = getColorIndex(splitLines, splitLineColors, i);
                        splitLines[colorIndex].push(new graphic.Circle({
                            shape: {
                                cx: cx,
                                cy: cy,
                                r: ticksRadius[i]
                            }
                        }));
                    }
                    if (showSplitArea && i < ticksRadius.length - 1) {
                        var colorIndex = getColorIndex(splitAreas, splitAreaColors, i);
                        splitAreas[colorIndex].push(new graphic.Ring({
                            shape: {
                                cx: cx,
                                cy: cy,
                                r0: ticksRadius[i],
                                r: ticksRadius[i + 1]
                            }
                        }));
                    }
                }
            }
            // Polyyon
            else {
                var axesTicksPoints = zrUtil.map(indicatorAxes, function (indicatorAxis, idx) {
                    var ticksCoords = indicatorAxis.getTicksCoords();
                    return zrUtil.map(ticksCoords, function (tickCoord) {
                        return radar.coordToPoint(tickCoord, idx);
                    });
                });

                var prevPoints = [];
                for (var i = 0; i <= splitNumber; i++) {
                    var points = [];
                    for (var j = 0; j < indicatorAxes.length; j++) {
                        points.push(axesTicksPoints[j][i]);
                    }
                    // Close
                    if (points[0]) {
                        points.push(points[0].slice());
                    }
                    else {
                        if (__DEV__) {
                            console.error('Can\'t draw value axis ' + i);
                            continue;
                        }
                    }
                    if (showSplitLine) {
                        var colorIndex = getColorIndex(splitLines, splitLineColors, i);
                        splitLines[colorIndex].push(new graphic.Polyline({
                            shape: {
                                points: points
                            }
                        }));
                    }
                    if (showSplitArea && prevPoints) {
                        var colorIndex = getColorIndex(splitAreas, splitAreaColors, i - 1);
                        splitAreas[colorIndex].push(new graphic.Polygon({
                            shape: {
                                points: points.concat(prevPoints)
                            }
                        }));
                    }
                    prevPoints = points.slice().reverse();
                }
            }

            var lineStyle = lineStyleModel.getLineStyle();
            var areaStyle = areaStyleModel.getAreaStyle();
            // Add splitArea before splitLine
            zrUtil.each(splitAreas, function (splitAreas, idx) {
                this.group.add(graphic.mergePath(
                    splitAreas, {
                        style: zrUtil.defaults({
                            stroke: 'none',
                            fill: splitAreaColors[idx % splitAreaColors.length]
                        }, areaStyle),
                        silent: true
                    }
                ));
            }, this);

            zrUtil.each(splitLines, function (splitLines, idx) {
                this.group.add(graphic.mergePath(
                    splitLines, {
                        style: zrUtil.defaults({
                            fill: 'none',
                            stroke: splitLineColors[idx % splitLineColors.length]
                        }, lineStyle),
                        silent: true
                    }
                ));
            }, this);

        }
    });
});