define(function (require) {

    var AxisBuilder = require('./AxisBuilder');
    var zrUtil =  require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var singleAxisHelper = require('./singleAxisHelper');
    var getInterval = AxisBuilder.getInterval;
    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick;

    var axisBuilderAttrs = [
        'axisLine', 'axisLabel', 'axisTick', 'axisName'
    ];

    var selfBuilderAttr = 'splitLine';

    var SingleAxisView = require('./AxisView').extend({

        type: 'singleAxis',

        axisPointerClass: 'SingleAxisPointer',

        render: function (axisModel, ecModel, api, payload) {

            var group = this.group;

            group.removeAll();

            var layout =  singleAxisHelper.layout(axisModel);

            var axisBuilder = new AxisBuilder(axisModel, layout);

            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

            group.add(axisBuilder.getGroup());

            if (axisModel.get(selfBuilderAttr + '.show')) {
                this['_' + selfBuilderAttr](axisModel, layout.labelInterval);
            }

            SingleAxisView.superCall(this, 'render', axisModel, ecModel, api, payload);
        },

        _splitLine: function(axisModel, labelInterval) {
            var axis = axisModel.axis;

            if (axis.scale.isBlank()) {
                return;
            }

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

    return SingleAxisView;

});