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
                gridRect[dim] -= labelUnionRect[dim] + margin;
                if (axis.position === 'top') {
                    gridRect.y += labelUnionRect.height + margin;
                }
                else if (axis.position === 'left') {
                    gridRect.x += labelUnionRect.width + margin;
                }
            }
        }
    });
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
