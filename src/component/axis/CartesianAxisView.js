define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var AxisBuilder = require('./AxisBuilder');
    var AxisView = require('./AxisView');
    var cartesianAxisHelper = require('./cartesianAxisHelper');
    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick;
    var getInterval = AxisBuilder.getInterval;

    var axisBuilderAttrs = [
        'axisLine', 'axisLabel', 'axisTick', 'axisName'
    ];
    var selfBuilderAttrs = [
        'splitArea', 'splitLine'
    ];

    // function getAlignWithLabel(model, axisModel) {
    //     var alignWithLabel = model.get('alignWithLabel');
    //     if (alignWithLabel === 'auto') {
    //         alignWithLabel = axisModel.get('axisTick.alignWithLabel');
    //     }
    //     return alignWithLabel;
    // }

    var CartesianAxisView = AxisView.extend({

        type: 'cartesianAxis',

        axisPointerClass: 'CartesianAxisPointer',

        /**
         * @override
         */
        render: function (axisModel, ecModel, api, payload) {

            this.group.removeAll();

            var oldAxisGroup = this._axisGroup;
            this._axisGroup = new graphic.Group();

            this.group.add(this._axisGroup);

            if (!axisModel.get('show')) {
                return;
            }

            var gridModel = axisModel.getCoordSysModel();

            var layout = cartesianAxisHelper.layout(gridModel, axisModel);

            var axisBuilder = new AxisBuilder(axisModel, layout);

            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

            this._axisGroup.add(axisBuilder.getGroup());

            zrUtil.each(selfBuilderAttrs, function (name) {
                if (axisModel.get(name + '.show')) {
                    this['_' + name](axisModel, gridModel, layout.labelInterval);
                }
            }, this);

            graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);

            CartesianAxisView.superCall(this, 'render', axisModel, ecModel, api, payload);
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _splitLine: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            if (axis.scale.isBlank()) {
                return;
            }

            var splitLineModel = axisModel.getModel('splitLine');
            var lineStyleModel = splitLineModel.getModel('lineStyle');
            var lineColors = lineStyleModel.get('color');

            var lineInterval = getInterval(splitLineModel, labelInterval);

            lineColors = zrUtil.isArray(lineColors) ? lineColors : [lineColors];

            var gridRect = gridModel.coordinateSystem.getRect();
            var isHorizontal = axis.isHorizontal();

            var lineCount = 0;

            var ticksCoords = axis.getTicksCoords(
                // splitLineModel.get('alignWithLabel')
            );
            var ticks = axis.scale.getTicks();

            var p1 = [];
            var p2 = [];
            // Simple optimization
            // Batching the lines if color are the same
            var lineStyle = lineStyleModel.getLineStyle();
            for (var i = 0; i < ticksCoords.length; i++) {
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
                this._axisGroup.add(new graphic.Line(graphic.subPixelOptimizeLine({
                    anid: 'line_' + ticks[i],

                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    },
                    style: zrUtil.defaults({
                        stroke: lineColors[colorIndex]
                    }, lineStyle),
                    silent: true
                })));
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _splitArea: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            if (axis.scale.isBlank()) {
                return;
            }

            var splitAreaModel = axisModel.getModel('splitArea');
            var areaStyleModel = splitAreaModel.getModel('areaStyle');
            var areaColors = areaStyleModel.get('color');

            var gridRect = gridModel.coordinateSystem.getRect();

            var ticksCoords = axis.getTicksCoords(
                // splitAreaModel.get('alignWithLabel')
            );
            var ticks = axis.scale.getTicks();

            var prevX = axis.toGlobalCoord(ticksCoords[0]);
            var prevY = axis.toGlobalCoord(ticksCoords[0]);

            var count = 0;

            var areaInterval = getInterval(splitAreaModel, labelInterval);

            var areaStyle = areaStyleModel.getAreaStyle();
            areaColors = zrUtil.isArray(areaColors) ? areaColors : [areaColors];

            for (var i = 1; i < ticksCoords.length; i++) {
                if (ifIgnoreOnTick(axis, i, areaInterval)) {
                    continue;
                }

                var tickCoord = axis.toGlobalCoord(ticksCoords[i]);

                var x;
                var y;
                var width;
                var height;
                if (axis.isHorizontal()) {
                    x = prevX;
                    y = gridRect.y;
                    width = tickCoord - x;
                    height = gridRect.height;
                }
                else {
                    x = gridRect.x;
                    y = prevY;
                    width = gridRect.width;
                    height = tickCoord - y;
                }

                var colorIndex = (count++) % areaColors.length;
                this._axisGroup.add(new graphic.Rect({
                    anid: 'area_' + ticks[i],

                    shape: {
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    },
                    style: zrUtil.defaults({
                        fill: areaColors[colorIndex]
                    }, areaStyle),
                    silent: true
                }));

                prevX = x + width;
                prevY = y + height;
            }
        }
    });

    CartesianAxisView.extend({
        type: 'xAxis'
    });
    CartesianAxisView.extend({
        type: 'yAxis'
    });

});