define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var Model = require('../../model/Model');
    var numberUtil = require('../../util/number');
    var remRadian = numberUtil.remRadian;
    var isRadianAroundZero = numberUtil.isRadianAroundZero;

    var PI = Math.PI;

    /**
     * A final axis is translated and rotated from a "standard axis".
     * So opt.position and opt.rotation is required.
     *
     * A standard axis is and axis from [0, 0] to [0, axisExtent[1]],
     * for example: (0, 0) ------------> (0, 50)
     *
     * nameDirection or tickDirection or labelDirection is 1 means tick
     * or label is below the standard axis, whereas is -1 means above
     * the standard axis. labelOffset means offset between label and axis,
     * which is useful when 'onZero', where axisLabel is in the grid and
     * label in outside grid.
     *
     * Tips: like always,
     * positive rotation represents anticlockwise, and negative rotation
     * represents clockwise.
     * The direction of position coordinate is the same as the direction
     * of screen coordinate.
     *
     * Do not need to consider axis 'inverse', which is auto processed by
     * axis extent.
     *
     * @param {module:zrender/container/Group} group
     * @param {Object} axisModel
     * @param {Object} opt Standard axis parameters.
     * @param {Array.<number>} opt.position [x, y]
     * @param {number} opt.rotation by radian
     * @param {number} [opt.nameDirection=1] 1 or -1 Used when nameLocation is 'middle'.
     * @param {number} [opt.tickDirection=1] 1 or -1
     * @param {number} [opt.labelDirection=1] 1 or -1
     * @param {number} [opt.labelOffset=0] Usefull when onZero.
     * @param {string} [opt.axisName] default get from axisModel.
     * @param {number} [opt.labelRotation] by degree, default get from axisModel.
     * @param {number} [opt.labelInterval] Default label interval when label
     *                                     interval from model is null or 'auto'.
     * @param {number} [opt.strokeContainThreshold] Default label interval when label
     * @param {number} [opt.silent=true]
     */
    var AxisBuilder = function (axisModel, opt) {

        /**
         * @readOnly
         */
        this.opt = opt;

        /**
         * @readOnly
         */
        this.axisModel = axisModel;

        // Default value
        zrUtil.defaults(
            opt,
            {
                labelOffset: 0,
                nameDirection: 1,
                tickDirection: 1,
                labelDirection: 1,
                silent: true
            }
        );

        /**
         * @readOnly
         */
        this.group = new graphic.Group({
            position: opt.position.slice(),
            rotation: opt.rotation
        });
    };

    AxisBuilder.prototype = {

        constructor: AxisBuilder,

        hasBuilder: function (name) {
            return !!builders[name];
        },

        add: function (name) {
            builders[name].call(this);
        },

        getGroup: function () {
            return this.group;
        }

    };

    var builders = {

        /**
         * @private
         */
        axisLine: function () {
            var opt = this.opt;
            var axisModel = this.axisModel;

            if (!axisModel.get('axisLine.show')) {
                return;
            }

            var extent = this.axisModel.axis.getExtent();

            this.group.add(new graphic.Line({
                shape: {
                    x1: extent[0],
                    y1: 0,
                    x2: extent[1],
                    y2: 0
                },
                style: zrUtil.extend(
                    {lineCap: 'round'},
                    axisModel.getModel('axisLine.lineStyle').getLineStyle()
                ),
                strokeContainThreshold: opt.strokeContainThreshold,
                silent: !!opt.silent,
                z2: 1
            }));
        },

        /**
         * @private
         */
        axisTick: function () {
            var axisModel = this.axisModel;

            if (!axisModel.get('axisTick.show')) {
                return;
            }

            var axis = axisModel.axis;
            var tickModel = axisModel.getModel('axisTick');
            var opt = this.opt;

            var lineStyleModel = tickModel.getModel('lineStyle');
            var tickLen = tickModel.get('length');
            var tickInterval = getInterval(tickModel, opt.labelInterval);
            var ticksCoords = axis.getTicksCoords();
            var tickLines = [];

            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (ifIgnoreOnTick(axis, i, tickInterval)) {
                     continue;
                }

                var tickCoord = ticksCoords[i];

                // Tick line
                tickLines.push(new graphic.Line(graphic.subPixelOptimizeLine({
                    shape: {
                        x1: tickCoord,
                        y1: 0,
                        x2: tickCoord,
                        y2: opt.tickDirection * tickLen
                    },
                    style: {
                        lineWidth: lineStyleModel.get('width')
                    },
                    silent: true
                })));
            }

            this.group.add(graphic.mergePath(tickLines, {
                style: lineStyleModel.getLineStyle(),
                z2: 2,
                silent: true
            }));
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @private
         */
        axisLabel: function () {
            var axisModel = this.axisModel;

            if (!axisModel.get('axisLabel.show')) {
                return;
            }

            var opt = this.opt;
            var axis = axisModel.axis;
            var labelModel = axisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');
            var labelMargin = labelModel.get('margin');
            var ticks = axis.scale.getTicks();
            var labels = axisModel.getFormattedLabels();

            // Special label rotate.
            var labelRotation = opt.labelRotation;
            if (labelRotation == null) {
                labelRotation = labelModel.get('rotate') || 0;
            }
            // To radian.
            labelRotation = labelRotation * PI / 180;

            var labelLayout = innerTextLayout(opt, labelRotation, opt.labelDirection);
            var categoryData = axisModel.get('data');

            var textEls = [];
            for (var i = 0; i < ticks.length; i++) {
                if (ifIgnoreOnTick(axis, i, opt.labelInterval)) {
                     continue;
                }

                var itemTextStyleModel = textStyleModel;
                if (categoryData && categoryData[i] && categoryData[i].textStyle) {
                    itemTextStyleModel = new Model(
                        categoryData[i].textStyle, textStyleModel, axisModel.ecModel
                    );
                }

                var tickCoord = axis.dataToCoord(ticks[i]);
                var pos = [
                    tickCoord,
                    opt.labelOffset + opt.labelDirection * labelMargin
                ];

                var textEl = new graphic.Text({
                    style: {
                        text: labels[i],
                        textAlign: itemTextStyleModel.get('align', true) || labelLayout.textAlign,
                        textVerticalAlign: itemTextStyleModel.get('baseline', true) || labelLayout.verticalAlign,
                        textFont: itemTextStyleModel.getFont(),
                        fill: itemTextStyleModel.getTextColor()
                    },
                    position: pos,
                    rotation: labelLayout.rotation,
                    silent: true,
                    z2: 10
                });
                textEls.push(textEl);
                this.group.add(textEl);
            }

            function isTwoLabelOverlapped(current, next) {
                var firstRect = current && current.getBoundingRect().clone();
                var nextRect = next && next.getBoundingRect().clone();
                if (firstRect && nextRect) {
                    firstRect.applyTransform(current.getLocalTransform());
                    nextRect.applyTransform(next.getLocalTransform());
                    return firstRect.intersect(nextRect);
                }
            }
            if (axis.type !== 'category') {
                // If min or max are user set, we need to check
                // If the tick on min(max) are overlap on their neighbour tick
                // If they are overlapped, we need to hide the min(max) tick label
                if (axisModel.getMin ? axisModel.getMin() : axisModel.get('min')) {
                    var firstLabel = textEls[0];
                    var nextLabel = textEls[1];
                    if (isTwoLabelOverlapped(firstLabel, nextLabel)) {
                        firstLabel.ignore = true;
                    }
                }
                if (axisModel.getMax ? axisModel.getMax() : axisModel.get('max')) {
                    var lastLabel = textEls[textEls.length - 1];
                    var prevLabel = textEls[textEls.length - 2];
                    if (isTwoLabelOverlapped(prevLabel, lastLabel)) {
                        lastLabel.ignore = true;
                    }
                }
            }
        },

        /**
         * @private
         */
        axisName: function () {
            var opt = this.opt;
            var axisModel = this.axisModel;

            var name = this.opt.axisName;
            // If name is '', do not get name from axisMode.
            if (name == null) {
                name = axisModel.get('name');
            }

            if (!name) {
                return;
            }

            var nameLocation = axisModel.get('nameLocation');
            var nameDirection = opt.nameDirection;
            var textStyleModel = axisModel.getModel('nameTextStyle');
            var gap = axisModel.get('nameGap') || 0;

            var extent = this.axisModel.axis.getExtent();
            var gapSignal = extent[0] > extent[1] ? -1 : 1;
            var pos = [
                nameLocation === 'start'
                    ? extent[0] - gapSignal * gap
                    : nameLocation === 'end'
                    ? extent[1] + gapSignal * gap
                    : (extent[0] + extent[1]) / 2, // 'middle'
                // Reuse labelOffset.
                nameLocation === 'middle' ? opt.labelOffset + nameDirection * gap : 0
            ];

            var labelLayout;

            if (nameLocation === 'middle') {
                labelLayout = innerTextLayout(opt, opt.rotation, nameDirection);
            }
            else {
                labelLayout = endTextLayout(opt, nameLocation, extent);
            }

            this.group.add(new graphic.Text({
                style: {
                    text: name,
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                        || axisModel.get('axisLine.lineStyle.color'),
                    textAlign: labelLayout.textAlign,
                    textVerticalAlign: labelLayout.verticalAlign
                },
                position: pos,
                rotation: labelLayout.rotation,
                silent: true,
                z2: 1
            }));
        }

    };

    /**
     * @inner
     */
    function innerTextLayout(opt, textRotation, direction) {
        var rotationDiff = remRadian(textRotation - opt.rotation);
        var textAlign;
        var verticalAlign;

        if (isRadianAroundZero(rotationDiff)) { // Label is parallel with axis line.
            verticalAlign = direction > 0 ? 'top' : 'bottom';
            textAlign = 'center';
        }
        else if (isRadianAroundZero(rotationDiff - PI)) { // Label is inverse parallel with axis line.
            verticalAlign = direction > 0 ? 'bottom' : 'top';
            textAlign = 'center';
        }
        else {
            verticalAlign = 'middle';

            if (rotationDiff > 0 && rotationDiff < PI) {
                textAlign = direction > 0 ? 'right' : 'left';
            }
            else {
                textAlign = direction > 0 ? 'left' : 'right';
            }
        }

        return {
            rotation: rotationDiff,
            textAlign: textAlign,
            verticalAlign: verticalAlign
        };
    }

    /**
     * @inner
     */
    function endTextLayout(opt, textPosition, extent) {
        var rotationDiff = remRadian(-opt.rotation);
        var textAlign;
        var verticalAlign;
        var inverse = extent[0] > extent[1];
        var onLeft = (textPosition === 'start' && !inverse)
            || (textPosition !== 'start' && inverse);

        if (isRadianAroundZero(rotationDiff - PI / 2)) {
            verticalAlign = onLeft ? 'bottom' : 'top';
            textAlign = 'center';
        }
        else if (isRadianAroundZero(rotationDiff - PI * 1.5)) {
            verticalAlign = onLeft ? 'top' : 'bottom';
            textAlign = 'center';
        }
        else {
            verticalAlign = 'middle';
            if (rotationDiff < PI * 1.5 && rotationDiff > PI / 2) {
                textAlign = onLeft ? 'left' : 'right';
            }
            else {
                textAlign = onLeft ? 'right' : 'left';
            }
        }

        return {
            rotation: rotationDiff,
            textAlign: textAlign,
            verticalAlign: verticalAlign
        };
    }

    /**
     * @static
     */
    var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick = function (axis, i, interval) {
        var rawTick;
        var scale = axis.scale;
        return scale.type === 'ordinal'
            && (
                typeof interval === 'function'
                    ? (
                        rawTick = scale.getTicks()[i],
                        !interval(rawTick, scale.getLabel(rawTick))
                    )
                    : i % (interval + 1)
            );
    };

    /**
     * @static
     */
    var getInterval = AxisBuilder.getInterval = function (model, labelInterval) {
        var interval = model.get('interval');
        if (interval == null || interval == 'auto') {
            interval = labelInterval;
        }
        return interval;
    };

    return AxisBuilder;

});