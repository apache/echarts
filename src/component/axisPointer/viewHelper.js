define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var textContain = require('zrender/contain/text');
    var formatUtil = require('../../util/format');
    var matrix = require('zrender/core/matrix');
    var axisHelper = require('../../coord/axisHelper');
    var AxisBuilder = require('../axis/AxisBuilder');

    var helper = {};

    /**
     * @param {module:echarts/model/Model} axisPointerModel
     */
    helper.buildElStyle = function (axisPointerModel) {
        var axisPointerType = axisPointerModel.get('type');
        var styleModel = axisPointerModel.getModel(axisPointerType + 'Style');
        var style;
        if (axisPointerType === 'line') {
            style = styleModel.getLineStyle();
            style.fill = null;
        }
        else if (axisPointerType === 'shadow') {
            style = styleModel.getAreaStyle();
            style.stroke = null;
        }
        return style;
    };

    /**
     * @param {Function} labelPos {align, verticalAlign, position}
     */
    helper.buildLabelElOption = function (
        elOption, axisModel, axisPointerModel, api, labelPos
    ) {
        var value = axisPointerModel.get('value');
        var text = helper.getValueLabel(
            value, axisModel.axis, axisModel.ecModel,
            axisPointerModel.get('seriesDataIndices'),
            {
                precision: axisPointerModel.get('label.precision'),
                formatter: axisPointerModel.get('label.formatter')
            }
        );
        var labelModel = axisPointerModel.getModel('label');
        var textStyleModel = labelModel.getModel('textStyle');
        var paddings = formatUtil.normalizeCssArray(labelModel.get('padding') || 0);

        var font = textStyleModel.getFont();
        var textRect = textContain.getBoundingRect(
            text, font, labelPos.textAlign, labelPos.textBaseline
        );

        var position = labelPos.position;
        var width = textRect.width + paddings[1] + paddings[3];
        var height = textRect.height + paddings[0] + paddings[2];

        // Adjust by align.
        var align = labelPos.align;
        align === 'right' && (position[0] -= width);
        align === 'center' && (position[0] -= width / 2);
        var verticalAlign = labelPos.verticalAlign;
        verticalAlign === 'bottom' && (position[1] -= height);
        verticalAlign === 'middle' && (position[1] -= height / 2);

        // Not overflow ec container
        confineInContainer(position, width, height, api);

        var bgColor = labelModel.get('backgroundColor');
        if (!bgColor || bgColor === 'auto') {
            bgColor = axisModel.get('axisLine.lineStyle.color');
        }

        elOption.label = {
            shape: {x: 0, y: 0, width: width, height: height, r: labelModel.get('borderRadius')},
            position: position.slice(),
            style: {
                text: text,
                textFont: font,
                textFill: textStyleModel.getTextColor(),
                textPosition: 'inside',
                fill: bgColor,
                stroke: labelModel.get('borderColor') || 'transparent',
                lineWidth: labelModel.get('borderWidth') || 0,
                shadowBlur: labelModel.get('shadowBlur'),
                shadowColor: labelModel.get('shadowColor'),
                shadowOffsetX: labelModel.get('shadowOffsetX'),
                shadowOffsetY: labelModel.get('shadowOffsetY')
            }
        };
    };

    // Do not overflow ec container
    function confineInContainer(position, width, height, api) {
        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();
        position[0] = Math.min(position[0] + width, viewWidth) - width;
        position[1] = Math.min(position[1] + height, viewHeight) - height;
        position[0] = Math.max(position[0], 0);
        position[1] = Math.max(position[1], 0);
    }

    /**
     * @param {number} value
     * @param {module:echarts/coord/Axis} axis
     * @param {module:echarts/model/Global} ecModel
     * @param {Object} opt
     * @param {Array.<Object>} seriesDataIndices
     * @param {number|string} opt.precision 'auto' or a number
     * @param {string|Function} opt.formatter label formatter
     */
    helper.getValueLabel = function (value, axis, ecModel, seriesDataIndices, opt) {
        var text = axis.scale.getLabel(
            // If `precision` is set, width can be fixed (like '12.00500'), which
            // helps to debounce when when moving label.
            value, {precision: opt.precision}
        );
        var formatter = opt.formatter;

        if (formatter) {
            var params = {
                value: axisHelper.getAxisRawValue(axis, value),
                seriesData: []
            };
            zrUtil.each(seriesDataIndices, function (idxItem) {
                var series = ecModel.getSeriesByIndex(idxItem.seriesIndex);
                var dataIndex = idxItem.dataIndexInside;
                var dataParams = series && series.getDataParams(dataIndex);
                dataParams && params.seriesData.push(dataParams);
            });

            if (zrUtil.isString(formatter)) {
                text = formatter.replace('{value}', text);
            }
            else if (zrUtil.isFunction(formatter)) {
                text = formatter(params);
            }
        }

        return text;
    };

    /**
     * @param {module:echarts/coord/Axis} axis
     * @param {number} value
     * @param {Object} layoutInfo {
     *  rotation, position, labelOffset, labelDirection, labelMargin
     * }
     */
    helper.getTransformedPosition = function (axis, value, layoutInfo) {
        var transform = matrix.create();
        matrix.rotate(transform, transform, layoutInfo.rotation);
        matrix.translate(transform, transform, layoutInfo.position);

        return graphic.applyTransform([
            axis.dataToCoord(value),
            (layoutInfo.labelOffset || 0)
                + (layoutInfo.labelDirection || 1) * (layoutInfo.labelMargin || 0)
        ], transform);
    };

    helper.buildCartesianSingleLabelElOption = function (
        value, elOption, layoutInfo, axisModel, axisPointerModel, api
    ) {
        var textLayout = AxisBuilder.innerTextLayout(
            layoutInfo.rotation, 0, layoutInfo.labelDirection
        );
        layoutInfo.labelMargin = axisPointerModel.get('label.margin');
        helper.buildLabelElOption(elOption, axisModel, axisPointerModel, api, {
            position: helper.getTransformedPosition(axisModel.axis, value, layoutInfo),
            align: textLayout.textAlign,
            verticalAlign: textLayout.textVerticalAlign
        });
    };

    /**
     * @param {Array.<number>} p1
     * @param {Array.<number>} p2
     * @param {number} [xDimIndex=0] or 1
     */
    helper.makeLineShape = function (p1, p2, xDimIndex) {
        xDimIndex = xDimIndex || 0;
        return {
            x1: p1[xDimIndex],
            y1: p1[1 - xDimIndex],
            x2: p2[xDimIndex],
            y2: p2[1 - xDimIndex]
        };
    };

    /**
     * @param {Array.<number>} xy
     * @param {Array.<number>} wh
     * @param {number} [xDimIndex=0] or 1
     */
    helper.makeRectShape = function (xy, wh, xDimIndex) {
        xDimIndex = xDimIndex || 0;
        return {
            x: xy[xDimIndex],
            y: xy[1 - xDimIndex],
            width: wh[xDimIndex],
            height: wh[1 - xDimIndex]
        };
    };

    helper.makeSectorShape = function (cx, cy, r0, r, startAngle, endAngle) {
        return {
            cx: cx,
            cy: cy,
            r0: r0,
            r: r,
            startAngle: startAngle,
            endAngle: endAngle,
            clockwise: true
        };
    };

    return helper;
});