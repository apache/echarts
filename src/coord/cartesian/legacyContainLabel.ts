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

import BoundingRect from 'zrender/src/core/BoundingRect';
import Axis from '../Axis';
import { LayoutRect } from '../../util/layout';
import { each } from 'zrender/src/core/util';
import Axis2D from './Axis2D';
import { registerLegacyGridContainLabelImpl } from './Grid';
import { ScaleTick } from '../../util/types';
import OrdinalScale from '../../scale/Ordinal';
import { makeLabelFormatter } from '../axisHelper';

/**
 * [CAUTION] Never export methods other than `installLegacyGridContainLabel`.
 */

export function installLegacyGridContainLabel() {
    registerLegacyGridContainLabelImpl(legacyLayOutGridByContained);
}

/**
 * The input gridRect and axes will be modified.
 */
function legacyLayOutGridByContained(axesList: Axis2D[], gridRect: LayoutRect): void {
    each(axesList, function (axis) {
        if (!axis.model.get(['axisLabel', 'inside'])) {
            const labelUnionRect = estimateLabelUnionRect(axis);
            if (labelUnionRect) {
                const dim: 'height' | 'width' = axis.isHorizontal() ? 'height' : 'width';
                const margin = axis.model.get(['axisLabel', 'margin']);
                const outerLabelSize = estimateOuterLabelSize(axis, labelUnionRect[dim]);
                gridRect[dim] -= outerLabelSize + margin;
                if (axis.position === 'top') {
                    gridRect.y += outerLabelSize + margin;
                }
                else if (axis.position === 'left') {
                    gridRect.x += outerLabelSize + margin;
                }
            }
        }
    });
}

/**
 * Estimate how much of the axis labels actually lies outside the axis
 * line, i.e. on the far side of the label anchor point, which is placed
 * `axisLabel.margin` away from the axis line. `axisLabel.align` (for a
 * vertical axis) and `axisLabel.verticalAlign` (for a horizontal axis)
 * decide that: e.g. `align: 'left'` on a left y-axis makes the labels
 * extend from the anchor towards the plot area, so only the margin
 * itself has to be reserved outside the axis line, not the whole label
 * width; the default alignment extends the labels fully outwards.
 * When `axisLabel.rotate` is set, the alignment direction no longer
 * coincides with the direction perpendicular to the axis, so the full
 * label size is returned, as before.
 */
function estimateOuterLabelSize(axis: Axis2D, labelSize: number): number {
    const axisLabelModel = axis.getLabelModel();
    if (axisLabelModel.get('rotate')) {
        return labelSize;
    }
    if (axis.isHorizontal()) {
        const verticalAlign = axisLabelModel.get('verticalAlign')
            || axisLabelModel.get('baseline')
            || (axis.position === 'top' ? 'bottom' : 'top');
        return verticalAlign === 'middle'
            ? labelSize / 2
            : verticalAlign === (axis.position === 'top' ? 'bottom' : 'top')
            ? labelSize
            : 0;
    }
    const align = axisLabelModel.get('align')
        || (axis.position === 'right' ? 'left' : 'right');
    return align === 'center'
        ? labelSize / 2
        : align === (axis.position === 'right' ? 'left' : 'right')
        ? labelSize
        : 0;
}

/**
 * @return Be null/undefined if no labels.
 */
function estimateLabelUnionRect(axis: Axis) {
    const axisModel = axis.model;
    const scale = axis.scale;

    if (!axisModel.get(['axisLabel', 'show']) || scale.isBlank()) {
        return;
    }

    let realNumberScaleTicks: ScaleTick[];
    let tickCount;
    const categoryScaleExtent = scale.getExtent();

    // Optimize for large category data, avoid call `getTicks()`.
    if (scale instanceof OrdinalScale) {
        tickCount = scale.count();
    }
    else {
        realNumberScaleTicks = scale.getTicks();
        tickCount = realNumberScaleTicks.length;
    }

    const axisLabelModel = axis.getLabelModel();
    const labelFormatter = makeLabelFormatter(axis);

    let rect;
    let step = 1;
    // Simple optimization for large amount of category labels
    if (tickCount > 40) {
        step = Math.ceil(tickCount / 40);
    }
    for (let i = 0; i < tickCount; i += step) {
        const tick = realNumberScaleTicks
            ? realNumberScaleTicks[i]
            : {
                value: categoryScaleExtent[0] + i
            };
        const label = labelFormatter(tick, i);
        const unrotatedSingleRect = axisLabelModel.getTextRect(label);
        const singleRect = rotateTextRect(unrotatedSingleRect, axisLabelModel.get('rotate') || 0);

        rect ? rect.union(singleRect) : (rect = singleRect);
    }

    return rect;

    function rotateTextRect(textRect: BoundingRect, rotate: number) {
        const rotateRadians = rotate * Math.PI / 180;
        const beforeWidth = textRect.width;
        const beforeHeight = textRect.height;
        const afterWidth = beforeWidth * Math.abs(Math.cos(rotateRadians))
            + Math.abs(beforeHeight * Math.sin(rotateRadians));
        const afterHeight = beforeWidth * Math.abs(Math.sin(rotateRadians))
            + Math.abs(beforeHeight * Math.cos(rotateRadians));
        const rotatedRect = new BoundingRect(textRect.x, textRect.y, afterWidth, afterHeight);

        return rotatedRect;
    }
}
