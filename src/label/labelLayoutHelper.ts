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

import ZRText from 'zrender/src/graphic/Text';
import { LabelLayoutOption } from '../util/types';
import { BoundingRect, OrientedBoundingRect, Polyline } from '../util/graphic';

interface LabelLayoutListPrepareInput {
    label: ZRText
    labelLine: Polyline
    computedLayoutOption: LabelLayoutOption
    priority: number
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore: boolean
    }
}

export interface LabelLayoutInfo {
    label: ZRText
    labelLine: Polyline
    priority: number
    rect: BoundingRect // Global rect
    localRect: BoundingRect
    obb?: OrientedBoundingRect  // Only available when axisAligned is true
    axisAligned: boolean
    layoutOption: LabelLayoutOption
    defaultAttr: {
        ignore: boolean
        labelGuideIgnore: boolean
    }
    transform: number[]
}

export function prepareLayoutList(input: LabelLayoutListPrepareInput[]): LabelLayoutInfo[] {
    const list: LabelLayoutInfo[] = [];

    for (let i = 0; i < input.length; i++) {
        const rawItem = input[i];
        if (rawItem.defaultAttr.ignore) {
            continue;
        }

        const layoutOption = rawItem.computedLayoutOption;
        const label = rawItem.label;
        const transform = label.getComputedTransform();
        // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
        const localRect = label.getBoundingRect();
        const isAxisAligned = !transform || (transform[1] < 1e-5 && transform[2] < 1e-5);

        // Text has a default 1px stroke. Exclude this.
        const minMargin = (layoutOption.minMargin || 0) + 2.2;
        const globalRect = localRect.clone();
        globalRect.applyTransform(transform);
        globalRect.x -= minMargin / 2;
        globalRect.y -= minMargin / 2;
        globalRect.width += minMargin;
        globalRect.height += minMargin;

        const obb = isAxisAligned ? new OrientedBoundingRect(localRect, transform) : null;

        list.push({
            label,
            labelLine: rawItem.labelLine,
            rect: globalRect,
            localRect,
            obb,
            priority: rawItem.priority,
            defaultAttr: rawItem.defaultAttr,
            layoutOption: rawItem.computedLayoutOption,
            axisAligned: isAxisAligned,
            transform
        });
    }
    return list;
}

function shiftLayout(
    list: LabelLayoutInfo[],
    xyDim: 'x' | 'y',
    sizeDim: 'width' | 'height',
    minBound: number,
    maxBound: number
) {
    if (!list.length) {
        return;
    }

    list.sort(function (a, b) {
        return a.label[xyDim] - b.label[xyDim];
    });

    function shiftForward(start: number, end: number, delta: number) {
        for (let j = start; j < end; j++) {
            list[j].label[xyDim] += delta;

            const rect = list[j].rect;
            rect[xyDim] += delta;

            if (j > start && j + 1 < end
                && list[j + 1].rect[xyDim] > rect[xyDim] + rect[sizeDim]
            ) {
                // Shift up so it can be more equaly distributed.
                shiftBackward(j, delta / 2);
                return;
            }
        }

        shiftBackward(end - 1, delta / 2);
    }

    function shiftBackward(end: number, delta: number) {
        for (let j = end; j >= 0; j--) {
            list[j].label[xyDim] -= delta;

            const rect = list[j].rect;
            rect[xyDim] -= delta;

            // const textSize = rect[sizeDim];
            const diffToMinBound = rect[xyDim] - minBound;
            if (diffToMinBound < 0) {
                rect[xyDim] -= diffToMinBound;
                list[j].label[xyDim] -= diffToMinBound;
            }

            if (j > 0
                && rect[xyDim] > list[j - 1].rect[xyDim] + list[j - 1].rect[sizeDim]
            ) {
                break;
            }
        }
    }
    let lastPos = 0;
    let delta;
    const len = list.length;
    for (let i = 0; i < len; i++) {
        delta = list[i].label[xyDim] - lastPos;
        if (delta < 0) {
            shiftForward(i, len, -delta);
        }
        lastPos = list[i].label[xyDim] + list[i].rect[sizeDim];
    }
    if (maxBound - lastPos < 0) {
        shiftBackward(len - 1, lastPos - maxBound);
    }
}

/**
 * Adjust labels on x direction to avoid overlap.
 */
export function shiftLayoutOnX(
    list: LabelLayoutInfo[],
    leftBound: number,
    rightBound: number
) {
    shiftLayout(list, 'x', 'width', leftBound, rightBound);
}

/**
 * Adjust labels on y direction to avoid overlap.
 */
export function shiftLayoutOnY(
    list: LabelLayoutInfo[],
    topBound: number,
    bottomBound: number
) {
    shiftLayout(list, 'y', 'height', topBound, bottomBound);
}

export function hideOverlap(labelList: LabelLayoutInfo[]) {
    const displayedLabels: LabelLayoutInfo[] = [];

    // TODO, render overflow visible first, put in the displayedLabels.
    labelList.sort(function (a, b) {
        return b.priority - a.priority;
    });

    for (let i = 0; i < labelList.length; i++) {
        const labelItem = labelList[i];
        const globalRect = labelItem.rect;
        const isAxisAligned = labelItem.axisAligned;
        const localRect = labelItem.localRect;
        const transform = labelItem.transform;
        const label = labelItem.label;
        const labelLine = labelItem.labelLine;

        let obb = labelItem.obb;
        let overlapped = false;
        for (let j = 0; j < displayedLabels.length; j++) {
            const existsTextCfg = displayedLabels[j];
            // Fast rejection.
            if (!globalRect.intersect(existsTextCfg.rect)) {
                continue;
            }

            if (isAxisAligned && existsTextCfg.axisAligned) {   // Is overlapped
                overlapped = true;
                break;
            }

            if (!existsTextCfg.obb) { // If self is not axis aligned. But other is.
                existsTextCfg.obb = new OrientedBoundingRect(existsTextCfg.localRect, existsTextCfg.transform);
            }

            if (!obb) { // If self is axis aligned. But other is not.
                obb = new OrientedBoundingRect(localRect, transform);
            }

            if (obb.intersect(existsTextCfg.obb)) {
                overlapped = true;
                break;
            }
        }

        // TODO Callback to determine if this overlap should be handled?
        if (overlapped) {
            label.hide();
            labelLine && labelLine.hide();
        }
        else {
            label.attr('ignore', labelItem.defaultAttr.ignore);
            labelLine && labelLine.attr('ignore', labelItem.defaultAttr.labelGuideIgnore);

            displayedLabels.push(labelItem);
        }
    }
}