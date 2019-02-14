/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import * as textContain from 'zrender/src/contain/text';
import * as formatUtil from '../../util/format';
import * as matrix from 'zrender/src/core/matrix';
import * as axisHelper from '../../coord/axisHelper';
import AxisBuilder from '../axis/AxisBuilder';

/**
 * @param {module:echarts/model/Model} axisPointerModel
 */
export function buildElStyle(axisPointerModel) {
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
}

/**
 * @param {Function} labelPos {align, verticalAlign, position}
 */
export function buildLabelElOption(
    elOption, axisModel, axisPointerModel, api, labelPos
) {
    var value = axisPointerModel.get('value');
    var text = getValueLabel(
        value, axisModel.axis, axisModel.ecModel,
        axisPointerModel.get('seriesDataIndices'),
        {
            precision: axisPointerModel.get('label.precision'),
            formatter: axisPointerModel.get('label.formatter')
        }
    );
    var labelModel = axisPointerModel.getModel('label');
    var paddings = formatUtil.normalizeCssArray(labelModel.get('padding') || 0);

    var font = labelModel.getFont();
    var textRect = textContain.getBoundingRect(text, font);

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
        // TODO: rich
        style: {
            text: text,
            textFont: font,
            textFill: labelModel.getTextColor(),
            textPosition: 'inside',
            fill: bgColor,
            stroke: labelModel.get('borderColor') || 'transparent',
            lineWidth: labelModel.get('borderWidth') || 0,
            shadowBlur: labelModel.get('shadowBlur'),
            shadowColor: labelModel.get('shadowColor'),
            shadowOffsetX: labelModel.get('shadowOffsetX'),
            shadowOffsetY: labelModel.get('shadowOffsetY')
        },
        // Lable should be over axisPointer.
        z2: 10
    };
}

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
export function getValueLabel(value, axis, ecModel, seriesDataIndices, opt) {
    value = axis.scale.parse(value);
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
}

/**
 * @param {module:echarts/coord/Axis} axis
 * @param {number} value
 * @param {Object} layoutInfo {
 *  rotation, position, labelOffset, labelDirection, labelMargin
 * }
 */
export function getTransformedPosition(axis, value, layoutInfo) {
    var transform = matrix.create();
    matrix.rotate(transform, transform, layoutInfo.rotation);
    matrix.translate(transform, transform, layoutInfo.position);

    return graphic.applyTransform([
        axis.dataToCoord(value),
        (layoutInfo.labelOffset || 0)
            + (layoutInfo.labelDirection || 1) * (layoutInfo.labelMargin || 0)
    ], transform);
}

export function buildCartesianSingleLabelElOption(
    value, elOption, layoutInfo, axisModel, axisPointerModel, api
) {
    var textLayout = AxisBuilder.innerTextLayout(
        layoutInfo.rotation, 0, layoutInfo.labelDirection
    );
    layoutInfo.labelMargin = axisPointerModel.get('label.margin');
    buildLabelElOption(elOption, axisModel, axisPointerModel, api, {
        position: getTransformedPosition(axisModel.axis, value, layoutInfo),
        align: textLayout.textAlign,
        verticalAlign: textLayout.textVerticalAlign
    });
}

/**
 * @param {Array.<number>} p1
 * @param {Array.<number>} p2
 * @param {number} [xDimIndex=0] or 1
 */
export function makeLineShape(p1, p2, xDimIndex) {
    xDimIndex = xDimIndex || 0;
    return {
        x1: p1[xDimIndex],
        y1: p1[1 - xDimIndex],
        x2: p2[xDimIndex],
        y2: p2[1 - xDimIndex]
    };
}

/**
 * @param {Array.<number>} xy
 * @param {Array.<number>} wh
 * @param {number} [xDimIndex=0] or 1
 */
export function makeRectShape(xy, wh, xDimIndex) {
    xDimIndex = xDimIndex || 0;
    return {
        x: xy[xDimIndex],
        y: xy[1 - xDimIndex],
        width: wh[xDimIndex],
        height: wh[1 - xDimIndex]
    };
}

export function makeSectorShape(cx, cy, r0, r, startAngle, endAngle) {
    return {
        cx: cx,
        cy: cy,
        r0: r0,
        r: r,
        startAngle: startAngle,
        endAngle: endAngle,
        clockwise: true
    };
}
