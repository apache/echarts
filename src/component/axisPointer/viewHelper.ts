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
import Axis from '../../coord/Axis';
import {
    ScaleDataValue, CallbackDataParams, ZRTextAlign, ZRTextVerticalAlign, ZRColor, CommonAxisPointerOption, ColorString
} from '../../util/types';
import { VectorArray } from 'zrender/src/core/vector';
import GlobalModel from '../../model/Global';
import IntervalScale from '../../scale/Interval';
import Axis2D from '../../coord/cartesian/Axis2D';
import { AxisPointerElementOptions } from './BaseAxisPointer';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import CartesianAxisModel from '../../coord/cartesian/AxisModel';
import Model from '../../model/Model';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { createTextStyle } from '../../label/labelStyle';

interface LayoutInfo {
    position: VectorArray
    rotation: number
    labelOffset?: number
    /**
     * 1 | -1
     */
    labelDirection?: number
    labelMargin?: number
}

// Not use top level axisPointer model
type AxisPointerModel = Model<CommonAxisPointerOption>;

export function buildElStyle(axisPointerModel: AxisPointerModel) {
    const axisPointerType = axisPointerModel.get('type');
    const styleModel = axisPointerModel.getModel(axisPointerType + 'Style' as 'lineStyle' | 'shadowStyle');
    let style: PathStyleProps;
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
    elOption: AxisPointerElementOptions,
    axisModel: AxisBaseModel,
    axisPointerModel: AxisPointerModel,
    api: ExtensionAPI,
    labelPos: {
        align?: ZRTextAlign
        verticalAlign?: ZRTextVerticalAlign
        position: number[]
    }
) {
    const value = axisPointerModel.get('value');
    const text = getValueLabel(
        value, axisModel.axis, axisModel.ecModel,
        axisPointerModel.get('seriesDataIndices'),
        {
            precision: axisPointerModel.get(['label', 'precision']),
            formatter: axisPointerModel.get(['label', 'formatter'])
        }
    );
    const labelModel = axisPointerModel.getModel('label');
    const paddings = formatUtil.normalizeCssArray(labelModel.get('padding') || 0);

    const font = labelModel.getFont();
    const textRect = textContain.getBoundingRect(text, font);

    const position = labelPos.position;
    const width = textRect.width + paddings[1] + paddings[3];
    const height = textRect.height + paddings[0] + paddings[2];

    // Adjust by align.
    const align = labelPos.align;
    align === 'right' && (position[0] -= width);
    align === 'center' && (position[0] -= width / 2);
    const verticalAlign = labelPos.verticalAlign;
    verticalAlign === 'bottom' && (position[1] -= height);
    verticalAlign === 'middle' && (position[1] -= height / 2);

    // Not overflow ec container
    confineInContainer(position, width, height, api);

    let bgColor = labelModel.get('backgroundColor') as ZRColor;
    if (!bgColor || bgColor === 'auto') {
        bgColor = axisModel.get(['axisLine', 'lineStyle', 'color']);
    }

    elOption.label = {
        // shape: {x: 0, y: 0, width: width, height: height, r: labelModel.get('borderRadius')},
        x: position[0],
        y: position[1],
        style: createTextStyle(labelModel, {
            text: text,
            font: font,
            fill: labelModel.getTextColor(),
            padding: paddings,
            backgroundColor: bgColor as ColorString
        }),
        // Lable should be over axisPointer.
        z2: 10
    };
}

// Do not overflow ec container
function confineInContainer(position: number[], width: number, height: number, api: ExtensionAPI) {
    const viewWidth = api.getWidth();
    const viewHeight = api.getHeight();
    position[0] = Math.min(position[0] + width, viewWidth) - width;
    position[1] = Math.min(position[1] + height, viewHeight) - height;
    position[0] = Math.max(position[0], 0);
    position[1] = Math.max(position[1], 0);
}

export function getValueLabel(
    value: ScaleDataValue,
    axis: Axis,
    ecModel: GlobalModel,
    seriesDataIndices: CommonAxisPointerOption['seriesDataIndices'],
    opt?: {
        precision?: number | 'auto'
        formatter?: CommonAxisPointerOption['label']['formatter']
    }
): string {
    value = axis.scale.parse(value);
    let text = (axis.scale as IntervalScale).getLabel(
        {
            value
        }, {
            // If `precision` is set, width can be fixed (like '12.00500'), which
            // helps to debounce when when moving label.
            precision: opt.precision
        }
    );
    const formatter = opt.formatter;

    if (formatter) {
        const params = {
            value: axisHelper.getAxisRawValue(axis, {value}),
            axisDimension: axis.dim,
            axisIndex: (axis as Axis2D).index,  // Only Carteian Axis has index
            seriesData: [] as CallbackDataParams[]
        };
        zrUtil.each(seriesDataIndices, function (idxItem) {
            const series = ecModel.getSeriesByIndex(idxItem.seriesIndex);
            const dataIndex = idxItem.dataIndexInside;
            const dataParams = series && series.getDataParams(dataIndex);
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

export function getTransformedPosition(
    axis: Axis,
    value: ScaleDataValue,
    layoutInfo: LayoutInfo
): number[] {
    const transform = matrix.create();
    matrix.rotate(transform, transform, layoutInfo.rotation);
    matrix.translate(transform, transform, layoutInfo.position);

    return graphic.applyTransform([
        axis.dataToCoord(value),
        (layoutInfo.labelOffset || 0)
            + (layoutInfo.labelDirection || 1) * (layoutInfo.labelMargin || 0)
    ], transform);
}

export function buildCartesianSingleLabelElOption(
    value: ScaleDataValue,
    elOption: AxisPointerElementOptions,
    layoutInfo: LayoutInfo,
    axisModel: CartesianAxisModel,
    axisPointerModel: AxisPointerModel,
    api: ExtensionAPI
) {
    // @ts-ignore
    const textLayout = AxisBuilder.innerTextLayout(
        layoutInfo.rotation, 0, layoutInfo.labelDirection
    );
    layoutInfo.labelMargin = axisPointerModel.get(['label', 'margin']);
    buildLabelElOption(elOption, axisModel, axisPointerModel, api, {
        position: getTransformedPosition(axisModel.axis, value, layoutInfo),
        align: textLayout.textAlign,
        verticalAlign: textLayout.textVerticalAlign
    });
}

export function makeLineShape(p1: number[], p2: number[], xDimIndex?: number) {
    xDimIndex = xDimIndex || 0;
    return {
        x1: p1[xDimIndex],
        y1: p1[1 - xDimIndex],
        x2: p2[xDimIndex],
        y2: p2[1 - xDimIndex]
    };
}

export function makeRectShape(xy: number[], wh: number[], xDimIndex?: number) {
    xDimIndex = xDimIndex || 0;
    return {
        x: xy[xDimIndex],
        y: xy[1 - xDimIndex],
        width: wh[xDimIndex],
        height: wh[1 - xDimIndex]
    };
}

export function makeSectorShape(
    cx: number,
    cy: number,
    r0: number,
    r: number,
    startAngle: number,
    endAngle: number
) {
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
