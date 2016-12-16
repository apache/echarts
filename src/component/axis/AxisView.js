define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var AxisBuilder = require('./AxisBuilder');
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

    var AxisView = require('../../echarts').extendComponentView({

        type: 'axis',

        render: function (axisModel, ecModel) {

            this.group.removeAll();

            var oldAxisGroup = this._axisGroup;
            this._axisGroup = new graphic.Group();

            this.group.add(this._axisGroup);

            if (!axisModel.get('show')) {
                return;
            }

            var gridModel = axisModel.getCoordSysModel();

            var layout = layoutAxis(gridModel, axisModel);

            var axisBuilder = new AxisBuilder(axisModel, layout);

            zrUtil.each(axisBuilderAttrs, axisBuilder.add, axisBuilder);

            this._axisGroup.add(axisBuilder.getGroup());

            zrUtil.each(selfBuilderAttrs, function (name) {
                if (axisModel.get(name + '.show')) {
                    this['_' + name](axisModel, gridModel, layout.labelInterval);
                }
            }, this);

            graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @param {number|Function} labelInterval
         * @private
         */
        _splitLine: function (axisModel, gridModel, labelInterval) {
            var axis = axisModel.axis;

            if (axis.isBlank()) {
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

            if (axis.isBlank()) {
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

    AxisView.extend({
        type: 'xAxis'
    });
    AxisView.extend({
        type: 'yAxis'
    });

    /**
     * @inner
     */
    function layoutAxis(gridModel, axisModel) {
        var grid = gridModel.coordinateSystem;
        var axis = axisModel.axis;
        var layout = {};

        var rawAxisPosition = axis.position;
        var axisPosition = axis.onZero ? 'onZero' : rawAxisPosition;
        var axisDim = axis.dim;

        // [left, right, top, bottom]
        var rect = grid.getRect();
        var rectBound = [rect.x, rect.x + rect.width, rect.y, rect.y + rect.height];

        var axisOffset = axisModel.get('offset') || 0;

        var posMap = {
            x: { top: rectBound[2] - axisOffset, bottom: rectBound[3] + axisOffset },
            y: { left: rectBound[0] - axisOffset, right: rectBound[1] + axisOffset }
        };

        posMap.x.onZero = Math.max(Math.min(getZero('y'), posMap.x.bottom), posMap.x.top);
        posMap.y.onZero = Math.max(Math.min(getZero('x'), posMap.y.right), posMap.y.left);

        function getZero(dim, val) {
            var theAxis = grid.getAxis(dim);
            return theAxis.toGlobalCoord(theAxis.dataToCoord(0));
        }

        // Axis position
        layout.position = [
            axisDim === 'y' ? posMap.y[axisPosition] : rectBound[0],
            axisDim === 'x' ? posMap.x[axisPosition] : rectBound[3]
        ];

        // Axis rotation
        layout.rotation = Math.PI / 2 * (axisDim === 'x' ? 0 : 1);

        // Tick and label direction, x y is axisDim
        var dirMap = {top: -1, bottom: 1, left: -1, right: 1};

        layout.labelDirection = layout.tickDirection = layout.nameDirection = dirMap[rawAxisPosition];
        if (axis.onZero) {
            layout.labelOffset = posMap[axisDim][rawAxisPosition] - posMap[axisDim].onZero;
        }

        if (axisModel.getModel('axisTick').get('inside')) {
            layout.tickDirection = -layout.tickDirection;
        }
        if (axisModel.getModel('axisLabel').get('inside')) {
            layout.labelDirection = -layout.labelDirection;
        }

        // Special label rotation
        var labelRotation = axisModel.getModel('axisLabel').get('rotate');
        layout.labelRotation = axisPosition === 'top' ? -labelRotation : labelRotation;

        // label interval when auto mode.
        layout.labelInterval = axis.getLabelInterval();

        // Over splitLine and splitArea
        layout.z2 = 1;

        return layout;
    }
});