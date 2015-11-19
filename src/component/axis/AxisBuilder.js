define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var EPSILON = 1e-4;
    var PI2 = Math.PI * 2;
    var PI = Math.PI;

    /**
     * @param {module:zrender/container/Group} group
     * @param {Object} axisModel
     * @param {Object} opt Standard axis parameters.
     * @param {Array.<number>} opt.position [x, y]
     * @param {number} opt.rotation by radian
     * @param {number} opt.tickDirection 1 or -1
     * @param {number} opt.labelDirection 1 or -1
     * @param {string} [opt.axisName] default get from axisModel.
     * @param {number} [opt.lableRotation] by degree, default get from axisModel.
     * @param {number} [opt.lableInterval] Default label interval when label
     *                                     interval from model is null or 'auto'.
     * @param {number} [opt.isCartesian=false]
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
        },

        /**
         * @inner
         */
        _getExtent: function () {
            var opt = this.opt;
            var extent = this.axisModel.axis.getExtent();

            opt.offset = 0;

            // FIXME
            // 修正axisExtent不统一
            if (opt.isCartesian) {
                var min = Math.min(extent[0], extent[1]);
                var max = Math.max(extent[0], extent[1]);
                opt.offset = min;
                extent = [0, max - opt.offset];
            }

            return extent;
        }

    };

    var builders = {

        /**
         * @private
         */
        axisLine: function () {
            var axisModel = this.axisModel;
            var extent = this._getExtent();

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
                silent: true,
                z2: 1
            }));
        },

        /**
         * @private
         */
        axisTick: function () {
            var axisModel = this.axisModel;
            var axis = axisModel.axis;
            var tickModel = axisModel.getModel('axisTick');
            var opt = this.opt;

            var lineStyleModel = tickModel.getModel('lineStyle');
            var tickLen = tickModel.get('length');
            var tickInterval = getInterval(tickModel, opt);
            var ticksCoords = axis.getTicksCoords();
            var tickLines = [];

            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (ifIgnoreOnTick(axis, i, tickInterval)) {
                // ??? 检查 计算正确？（因为offset）
                     continue;
                }

                var tickCoord = ticksCoords[i] - opt.offset;

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
                silent: true
            }));
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @private
         */
        axisLabel: function () {
            var opt = this.opt;
            var axisModel = this.axisModel;
            var axis = axisModel.axis;
            var labelModel = axisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');
            var labelMargin = labelModel.get('margin');
            var ticks = axis.scale.getTicks();
            var labels = axisModel.formatLabels(axis.scale.getTicksLabels());

            // Special label rotate.
            var labelRotation = opt.labelRotation;
            if (labelRotation == null) {
                labelRotation = labelModel.get('rotate') || 0;
            }
            // To radian.
            labelRotation = labelRotation * PI / 180;

            var labelLayout = innerTextLayout(opt, labelRotation);

            for (var i = 0; i < ticks.length; i++) {
                if (ifIgnoreOnTick(axis, i, opt.labelInterval)) {
                     continue;
                }

                var tickCoord = axis.dataToCoord(ticks[i]) - opt.offset;
                var pos = [tickCoord, opt.labelDirection * labelMargin];

                this.group.add(new graphic.Text({
                    style: {
                        x: pos[0],
                        y: pos[1],
                        text: labels[i],
                        textAlign: labelLayout.textAlign,
                        textBaseline: labelLayout.textBaseline,
                        textFont: textStyleModel.getFont(),
                        fill: textStyleModel.get('color')
                    },
                    rotation: labelLayout.rotation,
                    origin: pos,
                    silent: true
                }));
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
            var textStyleModel = axisModel.getModel('nameTextStyle');
            var gap = axisModel.get('nameGap') || 0;

            var position = opt.position;
            var extent = this._getExtent();
            var textX = nameLocation == 'start'
                ? position[0] - gap
                : position[0] + extent[1] + gap;
            var textY = position[1];

            var labelLayout;

            if (nameLocation === 'middle') {
                labelLayout = innerTextLayout(opt, opt.rotation);
            }
            else {
                labelLayout = endTextLayout(opt, nameLocation);
            }

            this.group.add(new graphic.Text({
                style: {
                    text: name,
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.get('color')
                        || axisModel.get('axisLine.lineStyle.color'),
                    textAlign: labelLayout.textAlign,
                    textBaseline: labelLayout.textBaseline
                },
                position: [textX, textY],
                silent: true,
                z2: 1
            }));
        }

    };

    /**
     * @inner
     */
    function innerTextLayout(opt, textRotation) {
        var labelDirection = opt.labelDirection;
        var rotationDiff = remRadian(textRotation - opt.rotation);
        var textAlign;
        var textBaseline;

        if (isAroundZero(rotationDiff)) { // Label is parallel with axis line.
            textBaseline = labelDirection > 0 ? 'top' : 'bottom';
            textAlign = 'center';
        }
        else if (isAroundZero(rotationDiff - PI)) { // Label is inverse parallel with axis line.
            textBaseline = labelDirection > 0 ? 'bottom' : 'top';
            textAlign = 'center';
        }
        else {
            textBaseline = 'middle';

            if (rotationDiff > 0 && rotationDiff < PI) {
                textAlign = labelDirection > 0 ? 'right' : 'left';
            }
            else {
                textAlign = labelDirection > 0 ? 'left' : 'right';
            }
        }

        return {
            rotation: rotationDiff,
            textAlign: textAlign,
            textBaseline: textBaseline
        };
    }

    /**
     * @inner
     */
    function endTextLayout(opt, textPosition) {
        var rotationDiff = remRadian(-opt.rotation);
        var textAlign;
        var textBaseline;

        if (isAroundZero(rotationDiff - PI / 2)) {
            textBaseline = textPosition === 'start' ? 'top' : 'bottom';
            textAlign = 'center';
        }
        else if (isAroundZero(rotationDiff - PI * 1.5)) {
            textBaseline = textPosition === 'start' ? 'bottom' : 'top';
            textAlign = 'center';
        }
        else {
            textBaseline = 'middle';

            if (rotationDiff < PI * 1.5 && rotationDiff > PI / 2) {
                textAlign = textPosition === 'start' ? 'left' : 'right';
            }
            else {
                textAlign = textPosition === 'start' ? 'right' : 'left';
            }
        }

        return {
            rotation: rotationDiff,
            textAlign: textAlign,
            textBaseline: textBaseline
        };
    }

    /**
     * @inner
     */
    function ifIgnoreOnTick(axis, i, interval) {
        return axis.scale.type === 'ordinal'
            && (typeof interval === 'function')
                && !interval(i, axis.scale.getItem(i))
                || i % (interval + 1);
    }

    /**
     * @inner
     */
    function getInterval(model, opt) {
        var interval = model.get('interval');
        if (interval == null || interval == 'auto') {
            interval = opt.labelInterval;
        }
        return interval;
    }

    /**
     * @inner
     */
    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }

    /**
     * @inner
     */
    function remRadian(radian) {
        // To 0 - 2 * PI, considering negative radian.
        return (radian % PI2 + PI2) % PI2;
    }

    return AxisBuilder;

});