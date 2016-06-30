define(function (require) {

    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var graphic = require('../../util/graphic');
    var Model = require('../../model/Model');
    var List = require('../../data/List');
    var numberUtil = require('../../util/number');
    var remRadian = numberUtil.remRadian;
    var isRadianAroundZero = numberUtil.isRadianAroundZero;
    var vec2 = require('zrender/core/vector');
    var v2ApplyTransform = vec2.applyTransform;
    var retrieve = zrUtil.retrieve;

    var PI = Math.PI;

    function makeAxisEventDataBase(axisModel) {
        var eventData = {
            componentType: axisModel.mainType
        };
        eventData[axisModel.mainType + 'Index'] = axisModel.componentIndex;
        return eventData;
    }

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
     * @param {string} [opt.axisLabelShow] default get from axisModel.
     * @param {string} [opt.axisName] default get from axisModel.
     * @param {string} [opt.axisNameTruncateLength] default get from axisModel.
     * @param {string} [opt.axisNameTruncateEllipsis] default get from axisModel.
     * @param {number} [opt.labelRotation] by degree, default get from axisModel.
     * @param {number} [opt.labelInterval] Default label interval when label
     *                                     interval from model is null or 'auto'.
     * @param {number} [opt.strokeContainThreshold] Default label interval when label
     * @param {number} [opt.axisLineSilent=true] If axis line is silent
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
        this.group = new graphic.Group();

        // FIXME Not use a seperate text group?
        var dumbGroup = new graphic.Group({
            position: opt.position.slice(),
            rotation: opt.rotation
        });

        // this.group.add(dumbGroup);
        // this._dumbGroup = dumbGroup;

        dumbGroup.updateTransform();
        this._transform = dumbGroup.transform;

        this._dumbGroup = dumbGroup;
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

            var matrix = this._transform;
            var pt1 = [extent[0], 0];
            var pt2 = [extent[1], 0];
            if (matrix) {
                v2ApplyTransform(pt1, pt1, matrix);
                v2ApplyTransform(pt2, pt2, matrix);
            }

            this.group.add(new graphic.Line(graphic.subPixelOptimizeLine({

                // Id for animation
                anid: 'line',

                shape: {
                    x1: pt1[0],
                    y1: pt1[1],
                    x2: pt2[0],
                    y2: pt2[1]
                },
                style: zrUtil.extend(
                    {lineCap: 'round'},
                    axisModel.getModel('axisLine.lineStyle').getLineStyle()
                ),
                strokeContainThreshold: opt.strokeContainThreshold,
                silent: !!opt.axisLineSilent,
                z2: 1
            })));
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
            var ticks = axis.scale.getTicks();

            var pt1 = [];
            var pt2 = [];
            var matrix = this._transform;
            for (var i = 0; i < ticksCoords.length; i++) {
                // Only ordinal scale support tick interval
                if (ifIgnoreOnTick(axis, i, tickInterval)) {
                     continue;
                }

                var tickCoord = ticksCoords[i];

                pt1[0] = tickCoord;
                pt1[1] = 0;
                pt2[0] = tickCoord;
                pt2[1] = opt.tickDirection * tickLen;

                if (matrix) {
                    v2ApplyTransform(pt1, pt1, matrix);
                    v2ApplyTransform(pt2, pt2, matrix);
                }
                // Tick line, Not use group transform to have better line draw
                this.group.add(new graphic.Line(graphic.subPixelOptimizeLine({

                    // Id for animation
                    anid: 'tick_' + ticks[i],

                    shape: {
                        x1: pt1[0],
                        y1: pt1[1],
                        x2: pt2[0],
                        y2: pt2[1]
                    },
                    style: zrUtil.defaults(
                        lineStyleModel.getLineStyle(),
                        {
                            stroke: axisModel.get('axisLine.lineStyle.color')
                        }
                    ),
                    z2: 2,
                    silent: true
                })));
            }
        },

        /**
         * @param {module:echarts/coord/cartesian/AxisModel} axisModel
         * @param {module:echarts/coord/cartesian/GridModel} gridModel
         * @private
         */
        axisLabel: function () {
            var opt = this.opt;
            var axisModel = this.axisModel;
            var show = retrieve(opt.axisLabelShow, axisModel.get('axisLabel.show'));

            if (!show) {
                return;
            }

            var axis = axisModel.axis;
            var labelModel = axisModel.getModel('axisLabel');
            var textStyleModel = labelModel.getModel('textStyle');
            var labelMargin = labelModel.get('margin');
            var ticks = axis.scale.getTicks();
            var labels = axisModel.getFormattedLabels();

            // Special label rotate.
            var labelRotation = retrieve(opt.labelRotation, labelModel.get('rotate')) || 0;
            // To radian.
            labelRotation = labelRotation * PI / 180;

            var labelLayout = innerTextLayout(opt, labelRotation, opt.labelDirection);
            var categoryData = axisModel.get('data');

            var textEls = [];
            var isSilent = axisModel.get('silent');
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
                var textColor = itemTextStyleModel.getTextColor()
                    || axisModel.get('axisLine.lineStyle.color');

                var tickCoord = axis.dataToCoord(ticks[i]);
                var pos = [
                    tickCoord,
                    opt.labelOffset + opt.labelDirection * labelMargin
                ];
                var labelBeforeFormat = axis.scale.getLabel(ticks[i]);

                var textEl = new graphic.Text({

                    // Id for animation
                    anid: 'label_' + ticks[i],

                    style: {
                        text: labels[i],
                        textAlign: itemTextStyleModel.get('align', true) || labelLayout.textAlign,
                        textVerticalAlign: itemTextStyleModel.get('baseline', true) || labelLayout.verticalAlign,
                        textFont: itemTextStyleModel.getFont(),
                        fill: typeof textColor === 'function' ? textColor(labelBeforeFormat) : textColor
                    },
                    position: pos,
                    rotation: labelLayout.rotation,
                    silent: isSilent,
                    z2: 10
                });
                // Pack data for mouse event
                textEl.eventData = makeAxisEventDataBase(axisModel);
                textEl.eventData.targetType = 'axisLabel';
                textEl.eventData.value = labelBeforeFormat;


                // FIXME
                this._dumbGroup.add(textEl);
                textEl.updateTransform();

                textEls.push(textEl);
                this.group.add(textEl);

                textEl.decomposeTransform();
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
            var name = retrieve(opt.axisName, axisModel.get('name'));

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

            var nameRotation = axisModel.get('nameRotate');
            if (nameRotation != null) {
                nameRotation = nameRotation * PI / 180; // To radian.
            }

            if (nameLocation === 'middle') {
                labelLayout = innerTextLayout(
                    opt,
                    nameRotation != null ? nameRotation : opt.rotation, // Adapt to axis.
                    nameDirection
                );
            }
            else {
                labelLayout = endTextLayout(
                    opt, nameLocation, nameRotation || 0, extent
                );
            }

            var truncatedText = name;
            var truncateLength = retrieve(
                opt.axisNameTruncateLength, axisModel.get('nameTruncateLength')
            );
            var truncateEllipsis = retrieve(
                opt.axisNameTruncateEllipsis, axisModel.get('nameTruncateEllipsis')
            );

            if (truncateLength != null) {
                truncatedText = modelUtil.truncate(name, truncateLength, truncateEllipsis);
            }

            var textEl = new graphic.Text({

                // Id for animation
                anid: 'name',

                __fullText: name,
                __truncatedText: truncatedText,

                style: {
                    text: truncatedText,
                    textFont: textStyleModel.getFont(),
                    fill: textStyleModel.getTextColor()
                        || axisModel.get('axisLine.lineStyle.color'),
                    textAlign: labelLayout.textAlign,
                    textVerticalAlign: labelLayout.verticalAlign
                },
                position: pos,
                rotation: labelLayout.rotation,
                silent: axisModel.get('silent'),
                z2: 1
            });

            // Make truncate tooltip show.
            if (truncateLength != null) {
                textEl.dataIndex = 0;
                var data = new List(['value'], axisModel);
                data.initData([{value: name, tooltip: {formatter: tooltipFormatter}}]);
                textEl.dataModel = modelUtil.createDataFormatModel(data, {mainType: 'axis'});
            }

            textEl.eventData = makeAxisEventDataBase(axisModel);
            textEl.eventData.targetType = 'axisName';
            textEl.eventData.name = name;

            // FIXME
            this._dumbGroup.add(textEl);
            textEl.updateTransform();

            this.group.add(textEl);

            textEl.decomposeTransform();
        }

    };

    function tooltipFormatter(params) {
        return params.value;
    }

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
    function endTextLayout(opt, textPosition, textRotate, extent) {
        var rotationDiff = remRadian(textRotate - opt.rotation);
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