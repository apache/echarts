define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var textContain = require('zrender/contain/text');
    var formatUtil = require('../../util/format');

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
        elOption, value, labelPos, axisModel, axisPointerModel
    ) {
        var value = axisPointerModel.get('value');
        var labelModel = axisPointerModel.getModel('label');
        var text = getLabelText(value, axisModel, axisPointerModel, labelModel);
        var textStyleModel = labelModel.getModel('textStyle');
        var paddings = formatUtil.normalizeCssArray(labelModel.get('padding') || 0);

        var font = textStyleModel.getFont();
        var textRect = textContain.getBoundingRect(
            text, font, labelPos.textAlign, labelPos.textBaseline
        );

        var position = labelPos.position;
        var width = textRect.width + paddings[1] + paddings[3];
        var height = textRect.height + paddings[0] + paddings[2];

        var align = labelPos.align;
        align === 'right' && (position[0] -= width);
        align === 'center' && (position[0] -= width / 2);
        var verticalAlign = labelPos.verticalAlign;
        verticalAlign === 'bottom' && (position[1] -= height);
        verticalAlign === 'middle' && (position[1] -= height / 2);

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

    function getLabelText(value, axisModel, axisPointerModel, labelModel) {
        // Use 'pad' to debounce when when moving label.
        var text = axisModel.axis.scale.getLabel(value, {precision: labelModel.get('precision'), pad: true});
        var formatter = labelModel.get('formatter');

        if (formatter) {
            var params = {value: value, seriesData: []};
            zrUtil.each(axisPointerModel.get('seriesDataIndices'), function (idxItem) {
                var series = axisModel.ecModel.getSeriesByIndex(idxItem.seriesIndex);
                var dataIndex = idxItem.dataIndexInside;
                var dataParams = series && series.getDataParams(dataIndex);
                dataParams && params.seriesData.push(dataParams);
            });

            if (zrUtil.isString(formatter)) {
                text = formatter.replace('{value}', value);
                // The same as tooltip content formatter.
                text = formatUtil.formatTpl(text, params.seriesData);
            }
            else if (zrUtil.isFunction(formatter)) {
                text = formatter(params);
            }
        }

        return text;
    }

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