import {retrieve, defaults, extend, each} from 'zrender/src/core/util';
import * as formatUtil from '../../util/format';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';
import {isRadianAroundZero, remRadian} from '../../util/number';
import {createSymbol} from '../../util/symbol';
import * as matrixUtil from 'zrender/src/core/matrix';
import {applyTransform as v2ApplyTransform} from 'zrender/src/core/vector';


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
 * @param {number} [opt.nameDirection=1] 1 or -1 Used when nameLocation is 'middle' or 'center'.
 * @param {number} [opt.tickDirection=1] 1 or -1
 * @param {number} [opt.labelDirection=1] 1 or -1
 * @param {number} [opt.labelOffset=0] Usefull when onZero.
 * @param {string} [opt.axisLabelShow] default get from axisModel.
 * @param {string} [opt.axisName] default get from axisModel.
 * @param {number} [opt.axisNameAvailableWidth]
 * @param {number} [opt.labelRotate] by degree, default get from axisModel.
 * @param {number} [opt.labelInterval] Default label interval when label
 *                                     interval from model is null or 'auto'.
 * @param {number} [opt.strokeContainThreshold] Default label interval when label
 * @param {number} [opt.nameTruncateMaxWidth]
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
    defaults(
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

        var lineStyle = extend(
            {
                lineCap: 'round'
            },
            axisModel.getModel('axisLine.lineStyle').getLineStyle()
        );

        this.group.add(new graphic.Line(graphic.subPixelOptimizeLine({
            // Id for animation
            anid: 'line',

            shape: {
                x1: pt1[0],
                y1: pt1[1],
                x2: pt2[0],
                y2: pt2[1]
            },
            style: lineStyle,
            strokeContainThreshold: opt.strokeContainThreshold || 5,
            silent: true,
            z2: 1
        })));

        var arrows = axisModel.get('axisLine.symbol');
        var arrowSize = axisModel.get('axisLine.symbolSize');

        if (arrows != null) {
            if (typeof arrows === 'string') {
                // Use the same arrow for start and end point
                arrows = [arrows, arrows];
            }
            if (typeof arrowSize === 'string'
                || typeof arrowSize === 'number'
            ) {
                // Use the same size for width and height
                arrowSize = [arrowSize, arrowSize];
            }

            var symbolWidth = arrowSize[0];
            var symbolHeight = arrowSize[1];

            each([
                [opt.rotation + Math.PI / 2, pt1],
                [opt.rotation - Math.PI / 2, pt2]
            ], function (item, index) {
                if (arrows[index] !== 'none' && arrows[index] != null) {
                    var symbol = createSymbol(
                        arrows[index],
                        -symbolWidth / 2,
                        -symbolHeight / 2,
                        symbolWidth,
                        symbolHeight,
                        lineStyle.stroke,
                        true
                    );
                    symbol.attr({
                        rotation: item[0],
                        position: item[1],
                        silent: true
                    });
                    this.group.add(symbol);
                }
            }, this);
        }
    },

    /**
     * @private
     */
    axisTickLabel: function () {
        var axisModel = this.axisModel;
        var opt = this.opt;

        var tickEls = buildAxisTick(this, axisModel, opt);
        var labelEls = buildAxisLabel(this, axisModel, opt);

        fixMinMaxLabelShow(axisModel, labelEls, tickEls);
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
            isNameLocationCenter(nameLocation) ? opt.labelOffset + nameDirection * gap : 0
        ];

        var labelLayout;

        var nameRotation = axisModel.get('nameRotate');
        if (nameRotation != null) {
            nameRotation = nameRotation * PI / 180; // To radian.
        }

        var axisNameAvailableWidth;

        if (isNameLocationCenter(nameLocation)) {
            labelLayout = innerTextLayout(
                opt.rotation,
                nameRotation != null ? nameRotation : opt.rotation, // Adapt to axis.
                nameDirection
            );
        }
        else {
            labelLayout = endTextLayout(
                opt, nameLocation, nameRotation || 0, extent
            );

            axisNameAvailableWidth = opt.axisNameAvailableWidth;
            if (axisNameAvailableWidth != null) {
                axisNameAvailableWidth = Math.abs(
                    axisNameAvailableWidth / Math.sin(labelLayout.rotation)
                );
                !isFinite(axisNameAvailableWidth) && (axisNameAvailableWidth = null);
            }
        }

        var textFont = textStyleModel.getFont();

        var truncateOpt = axisModel.get('nameTruncate', true) || {};
        var ellipsis = truncateOpt.ellipsis;
        var maxWidth = retrieve(
            opt.nameTruncateMaxWidth, truncateOpt.maxWidth, axisNameAvailableWidth
        );
        // FIXME
        // truncate rich text? (consider performance)
        var truncatedText = (ellipsis != null && maxWidth != null)
            ? formatUtil.truncateText(
                name, maxWidth, textFont, ellipsis,
                {minChar: 2, placeholder: truncateOpt.placeholder}
            )
            : name;

        var tooltipOpt = axisModel.get('tooltip', true);

        var mainType = axisModel.mainType;
        var formatterParams = {
            componentType: mainType,
            name: name,
            $vars: ['name']
        };
        formatterParams[mainType + 'Index'] = axisModel.componentIndex;

        var textEl = new graphic.Text({
            // Id for animation
            anid: 'name',

            __fullText: name,
            __truncatedText: truncatedText,

            position: pos,
            rotation: labelLayout.rotation,
            silent: isSilent(axisModel),
            z2: 1,
            tooltip: (tooltipOpt && tooltipOpt.show)
                ? extend({
                    content: name,
                    formatter: function () {
                        return name;
                    },
                    formatterParams: formatterParams
                }, tooltipOpt)
                : null
        });

        graphic.setTextStyle(textEl.style, textStyleModel, {
            text: truncatedText,
            textFont: textFont,
            textFill: textStyleModel.getTextColor()
                || axisModel.get('axisLine.lineStyle.color'),
            textAlign: labelLayout.textAlign,
            textVerticalAlign: labelLayout.textVerticalAlign
        });

        if (axisModel.get('triggerEvent')) {
            textEl.eventData = makeAxisEventDataBase(axisModel);
            textEl.eventData.targetType = 'axisName';
            textEl.eventData.name = name;
        }

        // FIXME
        this._dumbGroup.add(textEl);
        textEl.updateTransform();

        this.group.add(textEl);

        textEl.decomposeTransform();
    }

};

/**
 * @public
 * @static
 * @param {Object} opt
 * @param {number} axisRotation in radian
 * @param {number} textRotation in radian
 * @param {number} direction
 * @return {Object} {
 *  rotation, // according to axis
 *  textAlign,
 *  textVerticalAlign
 * }
 */
var innerTextLayout = AxisBuilder.innerTextLayout = function (axisRotation, textRotation, direction) {
    var rotationDiff = remRadian(textRotation - axisRotation);
    var textAlign;
    var textVerticalAlign;

    if (isRadianAroundZero(rotationDiff)) { // Label is parallel with axis line.
        textVerticalAlign = direction > 0 ? 'top' : 'bottom';
        textAlign = 'center';
    }
    else if (isRadianAroundZero(rotationDiff - PI)) { // Label is inverse parallel with axis line.
        textVerticalAlign = direction > 0 ? 'bottom' : 'top';
        textAlign = 'center';
    }
    else {
        textVerticalAlign = 'middle';

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
        textVerticalAlign: textVerticalAlign
    };
};

function endTextLayout(opt, textPosition, textRotate, extent) {
    var rotationDiff = remRadian(textRotate - opt.rotation);
    var textAlign;
    var textVerticalAlign;
    var inverse = extent[0] > extent[1];
    var onLeft = (textPosition === 'start' && !inverse)
        || (textPosition !== 'start' && inverse);

    if (isRadianAroundZero(rotationDiff - PI / 2)) {
        textVerticalAlign = onLeft ? 'bottom' : 'top';
        textAlign = 'center';
    }
    else if (isRadianAroundZero(rotationDiff - PI * 1.5)) {
        textVerticalAlign = onLeft ? 'top' : 'bottom';
        textAlign = 'center';
    }
    else {
        textVerticalAlign = 'middle';
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
        textVerticalAlign: textVerticalAlign
    };
}

function isSilent(axisModel) {
    var tooltipOpt = axisModel.get('tooltip');
    return axisModel.get('silent')
        // Consider mouse cursor, add these restrictions.
        || !(
            axisModel.get('triggerEvent') || (tooltipOpt && tooltipOpt.show)
        );
}

function fixMinMaxLabelShow(axisModel, labelEls, tickEls) {
    // If min or max are user set, we need to check
    // If the tick on min(max) are overlap on their neighbour tick
    // If they are overlapped, we need to hide the min(max) tick label
    var showMinLabel = axisModel.get('axisLabel.showMinLabel');
    var showMaxLabel = axisModel.get('axisLabel.showMaxLabel');

    // FIXME
    // Have not consider onBand yet, where tick els is more than label els.

    labelEls = labelEls || [];
    tickEls = tickEls || [];

    var firstLabel = labelEls[0];
    var nextLabel = labelEls[1];
    var lastLabel = labelEls[labelEls.length - 1];
    var prevLabel = labelEls[labelEls.length - 2];

    var firstTick = tickEls[0];
    var nextTick = tickEls[1];
    var lastTick = tickEls[tickEls.length - 1];
    var prevTick = tickEls[tickEls.length - 2];

    if (showMinLabel === false) {
        ignoreEl(firstLabel);
        ignoreEl(firstTick);
    }
    else if (isTwoLabelOverlapped(firstLabel, nextLabel)) {
        if (showMinLabel) {
            ignoreEl(nextLabel);
            ignoreEl(nextTick);
        }
        else {
            ignoreEl(firstLabel);
            ignoreEl(firstTick);
        }
    }

    if (showMaxLabel === false) {
        ignoreEl(lastLabel);
        ignoreEl(lastTick);
    }
    else if (isTwoLabelOverlapped(prevLabel, lastLabel)) {
        if (showMaxLabel) {
            ignoreEl(prevLabel);
            ignoreEl(prevTick);
        }
        else {
            ignoreEl(lastLabel);
            ignoreEl(lastTick);
        }
    }
}

function ignoreEl(el) {
    el && (el.ignore = true);
}

function isTwoLabelOverlapped(current, next, labelLayout) {
    // current and next has the same rotation.
    var firstRect = current && current.getBoundingRect().clone();
    var nextRect = next && next.getBoundingRect().clone();

    if (!firstRect || !nextRect) {
        return;
    }

    // When checking intersect of two rotated labels, we use mRotationBack
    // to avoid that boundingRect is enlarge when using `boundingRect.applyTransform`.
    var mRotationBack = matrixUtil.identity([]);
    matrixUtil.rotate(mRotationBack, mRotationBack, -current.rotation);

    firstRect.applyTransform(matrixUtil.mul([], mRotationBack, current.getLocalTransform()));
    nextRect.applyTransform(matrixUtil.mul([], mRotationBack, next.getLocalTransform()));

    return firstRect.intersect(nextRect);
}

function isNameLocationCenter(nameLocation) {
    return nameLocation === 'middle' || nameLocation === 'center';
}

/**
 * @static
 */
var ifIgnoreOnTick = AxisBuilder.ifIgnoreOnTick = function (
    axis,
    i,
    interval,
    ticksCnt,
    showMinLabel,
    showMaxLabel
) {
    if (i === 0 && showMinLabel || i === ticksCnt - 1 && showMaxLabel) {
        return false;
    }

    // FIXME
    // Have not consider label overlap (if label is too long) yet.

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

function buildAxisTick(axisBuilder, axisModel, opt) {
    var axis = axisModel.axis;

    if (!axisModel.get('axisTick.show') || axis.scale.isBlank()) {
        return;
    }

    var tickModel = axisModel.getModel('axisTick');

    var lineStyleModel = tickModel.getModel('lineStyle');
    var tickLen = tickModel.get('length');

    var tickInterval = getInterval(tickModel, opt.labelInterval);
    var ticksCoords = axis.getTicksCoords(tickModel.get('alignWithLabel'));
    // FIXME
    // Corresponds to ticksCoords ?
    var ticks = axis.scale.getTicks();

    var showMinLabel = axisModel.get('axisLabel.showMinLabel');
    var showMaxLabel = axisModel.get('axisLabel.showMaxLabel');

    var pt1 = [];
    var pt2 = [];
    var matrix = axisBuilder._transform;

    var tickEls = [];

    var ticksCnt = ticksCoords.length;
    for (var i = 0; i < ticksCnt; i++) {
        // Only ordinal scale support tick interval
        if (ifIgnoreOnTick(
            axis, i, tickInterval, ticksCnt,
            showMinLabel, showMaxLabel
        )) {
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
        var tickEl = new graphic.Line(graphic.subPixelOptimizeLine({
            // Id for animation
            anid: 'tick_' + ticks[i],

            shape: {
                x1: pt1[0],
                y1: pt1[1],
                x2: pt2[0],
                y2: pt2[1]
            },
            style: defaults(
                lineStyleModel.getLineStyle(),
                {
                    stroke: axisModel.get('axisLine.lineStyle.color')
                }
            ),
            z2: 2,
            silent: true
        }));
        axisBuilder.group.add(tickEl);
        tickEls.push(tickEl);
    }

    return tickEls;
}

function buildAxisLabel(axisBuilder, axisModel, opt) {
    var axis = axisModel.axis;
    var show = retrieve(opt.axisLabelShow, axisModel.get('axisLabel.show'));

    if (!show || axis.scale.isBlank()) {
        return;
    }

    var labelModel = axisModel.getModel('axisLabel');
    var labelMargin = labelModel.get('margin');
    var ticks = axis.scale.getTicks();
    var labels = axisModel.getFormattedLabels();

    // Special label rotate.
    var labelRotation = (
        retrieve(opt.labelRotate, labelModel.get('rotate')) || 0
    ) * PI / 180;

    var labelLayout = innerTextLayout(opt.rotation, labelRotation, opt.labelDirection);
    var categoryData = axisModel.getCategories();

    var labelEls = [];
    var silent = isSilent(axisModel);
    var triggerEvent = axisModel.get('triggerEvent');

    var showMinLabel = axisModel.get('axisLabel.showMinLabel');
    var showMaxLabel = axisModel.get('axisLabel.showMaxLabel');

    each(ticks, function (tickVal, index) {
        if (ifIgnoreOnTick(
            axis, index, opt.labelInterval, ticks.length,
            showMinLabel, showMaxLabel
        )) {
                return;
        }

        var itemLabelModel = labelModel;
        if (categoryData && categoryData[tickVal] && categoryData[tickVal].textStyle) {
            itemLabelModel = new Model(
                categoryData[tickVal].textStyle, labelModel, axisModel.ecModel
            );
        }

        var textColor = itemLabelModel.getTextColor()
            || axisModel.get('axisLine.lineStyle.color');

        var tickCoord = axis.dataToCoord(tickVal);
        var pos = [
            tickCoord,
            opt.labelOffset + opt.labelDirection * labelMargin
        ];
        var labelStr = axis.scale.getLabel(tickVal);

        var textEl = new graphic.Text({
            // Id for animation
            anid: 'label_' + tickVal,
            position: pos,
            rotation: labelLayout.rotation,
            silent: silent,
            z2: 10
        });

        graphic.setTextStyle(textEl.style, itemLabelModel, {
            text: labels[index],
            textAlign: itemLabelModel.getShallow('align', true)
                || labelLayout.textAlign,
            textVerticalAlign: itemLabelModel.getShallow('verticalAlign', true)
                || itemLabelModel.getShallow('baseline', true)
                || labelLayout.textVerticalAlign,
            textFill: typeof textColor === 'function'
                ? textColor(
                    // (1) In category axis with data zoom, tick is not the original
                    // index of axis.data. So tick should not be exposed to user
                    // in category axis.
                    // (2) Compatible with previous version, which always returns labelStr.
                    // But in interval scale labelStr is like '223,445', which maked
                    // user repalce ','. So we modify it to return original val but remain
                    // it as 'string' to avoid error in replacing.
                    axis.type === 'category' ? labelStr : axis.type === 'value' ? tickVal + '' : tickVal,
                    index
                )
                : textColor
        });

        // Pack data for mouse event
        if (triggerEvent) {
            textEl.eventData = makeAxisEventDataBase(axisModel);
            textEl.eventData.targetType = 'axisLabel';
            textEl.eventData.value = labelStr;
        }

        // FIXME
        axisBuilder._dumbGroup.add(textEl);
        textEl.updateTransform();

        labelEls.push(textEl);
        axisBuilder.group.add(textEl);

        textEl.decomposeTransform();

    });

    return labelEls;
}


export default AxisBuilder;