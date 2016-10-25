define(function (require) {

    var AxisBuilder = require('./AxisBuilder');
    var zrUtil =  require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var getInterval = AxisBuilder.getInterval;
    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick;

    var axisBuilderAttrs = [
        'axisLine', 'axisLabel', 'axisTick', 'axisName'
    ];

    var selfBuilderAttr = 'splitLine';

    var AxisView = require('../../echarts').extendComponentView({

        type: 'singleAxis',

        render: function (axisModel, ecModel) {

            var group = this.group;

            group.removeAll();

            var layout =  axisLayout(axisModel);

            var axisBuilder = new AxisBuilder(axisModel, layout);

            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

            group.add(axisBuilder.getGroup());

            if (axisModel.get(selfBuilderAttr + '.show')) {
                this['_' + selfBuilderAttr](axisModel, layout.labelInterval);
            }
        },

        _splitLine: function(axisModel, labelInterval) {
            var axis = axisModel.axis;
            var splitLineModel = axisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineWidth = lineStyleModel.get('width');
            var lineColors = lineStyleModel.get('color');
            var lineInterval = getInterval(splitLineModel, labelInterval);

            lineColors = lineColors instanceof Array ? lineColors : [lineColors];

            var gridRect = axisModel.coordinateSystem.getRect();
            var isHorizontal = axis.isHorizontal();

            var splitLines = [];
            var lineCount = 0;

            var ticksCoords = axis.getTicksCoords();

            var p1 = [];
            var p2 = [];

            for (var i = 0; i < ticksCoords.length; ++i) {
                if (ifIgnoreOnTick(axis, i, lineInterval)) {
                    continue;
                }
                var tickCoord = axis.toGlobalCoord(ticksCoords[i]);
                if (isHorizontal) {
                    p1[0] = tickCoord;
                    p1[1] = gridRect.y;
                    p2[0] = tickCoord;
                    p2[1] = gridRect.y + gridRect.height;
                }
                else {
                    p1[0] = gridRect.x;
                    p1[1] = tickCoord;
                    p2[0] = gridRect.x + gridRect.width;
                    p2[1] = tickCoord;
                }
                var colorIndex = (lineCount++) % lineColors.length;
                splitLines[colorIndex] = splitLines[colorIndex] || [];
                splitLines[colorIndex].push(new graphic.Line(
                    graphic.subPixelOptimizeLine({
                        shape: {
                            x1: p1[0],
                            y1: p1[1],
                            x2: p2[0],
                            y2: p2[1]
                        },
                        style: {
                            lineWidth: lineWidth
                        },
                        silent: true
                    })));
            }

            for (var i = 0; i < splitLines.length; ++i) {
                this.group.add(graphic.mergePath(splitLines[i], {
                    style: {
                        stroke: lineColors[i % lineColors.length],
                        lineDash: lineStyleModel.getLineDash(lineWidth),
                        lineWidth: lineWidth
                    },
                    silent: true
                }));
            }
        }
    });

    function axisLayout(axisModel) {

        var single = axisModel.coordinateSystem;
        var axis = axisModel.axis;
        var layout = {};

        var axisPosition = axis.position;
        var orient = axis.orient;

        var rect = single.getRect();
        var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

        var positionMap = {
            horizontal: {top: rectBound[2], bottom: rectBound[3]},
            vertical: {left: rectBound[0], right: rectBound[1]}
        };

        layout.position = [
            orient === 'vertical'
                ? positionMap.vertical[axisPosition]
                : rectBound[0],
            orient === 'horizontal'
                ? positionMap.horizontal[axisPosition]
                : rectBound[3]
        ];

        var r = {horizontal: 0, vertical: 1};
        layout.rotation = Math.PI / 2 * r[orient];

        var directionMap = {top: -1, bottom: 1, right: 1, left: -1};

        layout.labelDirection = layout.tickDirection
            = layout.nameDirection
            = directionMap[axisPosition];

        if (axisModel.getModel('axisTick').get('inside')) {
            layout.tickDirection = -layout.tickDirection;
        }

        if (axisModel.getModel('axisLabel').get('inside')) {
            layout.labelDirection = -layout.labelDirection;
        }

        var labelRotation = axisModel.getModel('axisLabel').get('rotate');
        layout.labelRotation = axisPosition === 'top' ? -labelRotation : labelRotation;

        layout.labelInterval = axis.getLabelInterval();

        layout.z2 = 1;

        return layout;
    }

    return AxisView;

});