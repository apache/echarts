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

// FIXME emphasis label position is not same with normal label position

import * as textContain from 'zrender/src/contain/text';
import {parsePercent} from '../../util/number';
import PieSeriesModel, { PieSeriesOption, PieDataItemOption } from './PieSeries';
import { VectorArray } from 'zrender/src/core/vector';
import { HorizontalAlign, VerticalAlign, ZRRectLike } from '../../util/types';

const RADIAN = Math.PI / 180;

interface LabelLayout {
    x: number
    y: number
    position: PieSeriesOption['label']['position'],
    height: number
    len: number
    len2: number
    linePoints: VectorArray[]
    textAlign: HorizontalAlign
    verticalAlign: VerticalAlign,
    rotation: number,
    inside: boolean,
    labelDistance: number,
    labelAlignTo: PieSeriesOption['label']['alignTo'],
    labelMargin: number,
    bleedMargin: PieSeriesOption['label']['bleedMargin'],
    textRect: ZRRectLike,
    text: string,
    font: string
}

function adjustSingleSide(
    list: LabelLayout[],
    cx: number,
    cy: number,
    r: number,
    dir: -1 | 1,
    viewWidth: number,
    viewHeight: number,
    viewLeft: number,
    viewTop: number,
    farthestX: number
) {
    list.sort(function (a, b) {
        return a.y - b.y;
    });

    function shiftDown(start: number, end: number, delta: number, dir: number) {
        for (let j = start; j < end; j++) {
            if (list[j].y + delta > viewTop + viewHeight) {
                break;
            }

            list[j].y += delta;
            if (j > start
                && j + 1 < end
                && list[j + 1].y > list[j].y + list[j].height
            ) {
                shiftUp(j, delta / 2);
                return;
            }
        }

        shiftUp(end - 1, delta / 2);
    }

    function shiftUp(end: number, delta: number) {
        for (let j = end; j >= 0; j--) {
            if (list[j].y - delta < viewTop) {
                break;
            }

            list[j].y -= delta;
            if (j > 0
                && list[j].y > list[j - 1].y + list[j - 1].height
            ) {
                break;
            }
        }
    }

    function changeX(
        list: LabelLayout[], isDownList: boolean,
        cx: number, cy: number, r: number,
        dir: 1 | -1
    ) {
        let lastDeltaX = dir > 0
            ? isDownList                // right-side
                ? Number.MAX_VALUE      // down
                : 0                     // up
            : isDownList                // left-side
                ? Number.MAX_VALUE      // down
                : 0;                    // up

        for (let i = 0, l = list.length; i < l; i++) {
            if (list[i].labelAlignTo !== 'none') {
                continue;
            }

            let deltaY = Math.abs(list[i].y - cy);
            let length = list[i].len;
            let length2 = list[i].len2;
            let deltaX = (deltaY < r + length)
                ? Math.sqrt(
                        (r + length + length2) * (r + length + length2)
                        - deltaY * deltaY
                    )
                : Math.abs(list[i].x - cx);
            if (isDownList && deltaX >= lastDeltaX) {
                // right-down, left-down
                deltaX = lastDeltaX - 10;
            }
            if (!isDownList && deltaX <= lastDeltaX) {
                // right-up, left-up
                deltaX = lastDeltaX + 10;
            }

            list[i].x = cx + deltaX * dir;
            lastDeltaX = deltaX;
        }
    }

    let lastY = 0;
    let delta;
    let len = list.length;
    let upList = [];
    let downList = [];
    for (let i = 0; i < len; i++) {
        if (list[i].position === 'outer' && list[i].labelAlignTo === 'labelLine') {
            let dx = list[i].x - farthestX;
            list[i].linePoints[1][0] += dx;
            list[i].x = farthestX;
        }

        delta = list[i].y - lastY;
        if (delta < 0) {
            shiftDown(i, len, -delta, dir);
        }
        lastY = list[i].y + list[i].height;
    }
    if (viewHeight - lastY < 0) {
        shiftUp(len - 1, lastY - viewHeight);
    }
    for (let i = 0; i < len; i++) {
        if (list[i].y >= cy) {
            downList.push(list[i]);
        }
        else {
            upList.push(list[i]);
        }
    }
    changeX(upList, false, cx, cy, r, dir);
    changeX(downList, true, cx, cy, r, dir);
}

function avoidOverlap(
    labelLayoutList: LabelLayout[],
    cx: number,
    cy: number,
    r: number,
    viewWidth: number,
    viewHeight: number,
    viewLeft: number,
    viewTop: number
) {
    let leftList = [];
    let rightList = [];
    let leftmostX = Number.MAX_VALUE;
    let rightmostX = -Number.MAX_VALUE;
    for (let i = 0; i < labelLayoutList.length; i++) {
        if (isPositionCenter(labelLayoutList[i])) {
            continue;
        }
        if (labelLayoutList[i].x < cx) {
            leftmostX = Math.min(leftmostX, labelLayoutList[i].x);
            leftList.push(labelLayoutList[i]);
        }
        else {
            rightmostX = Math.max(rightmostX, labelLayoutList[i].x);
            rightList.push(labelLayoutList[i]);
        }
    }

    adjustSingleSide(rightList, cx, cy, r, 1, viewWidth, viewHeight, viewLeft, viewTop, rightmostX);
    adjustSingleSide(leftList, cx, cy, r, -1, viewWidth, viewHeight, viewLeft, viewTop, leftmostX);

    for (let i = 0; i < labelLayoutList.length; i++) {
        let layout = labelLayoutList[i];
        if (isPositionCenter(layout)) {
            continue;
        }

        let linePoints = layout.linePoints;
        if (linePoints) {
            let isAlignToEdge = layout.labelAlignTo === 'edge';

            let realTextWidth = layout.textRect.width;
            let targetTextWidth;
            if (isAlignToEdge) {
                if (layout.x < cx) {
                    targetTextWidth = linePoints[2][0] - layout.labelDistance
                            - viewLeft - layout.labelMargin;
                }
                else {
                    targetTextWidth = viewLeft + viewWidth - layout.labelMargin
                            - linePoints[2][0] - layout.labelDistance;
                }
            }
            else {
                if (layout.x < cx) {
                    targetTextWidth = layout.x - viewLeft - layout.bleedMargin;
                }
                else {
                    targetTextWidth = viewLeft + viewWidth - layout.x - layout.bleedMargin;
                }
            }
            if (targetTextWidth < layout.textRect.width) {
                layout.text = textContain.truncateText(layout.text, targetTextWidth, layout.font);
                if (layout.labelAlignTo === 'edge') {
                    realTextWidth = textContain.getWidth(layout.text, layout.font);
                }
            }

            let dist = linePoints[1][0] - linePoints[2][0];
            if (isAlignToEdge) {
                if (layout.x < cx) {
                    linePoints[2][0] = viewLeft + layout.labelMargin + realTextWidth + layout.labelDistance;
                }
                else {
                    linePoints[2][0] = viewLeft + viewWidth - layout.labelMargin
                            - realTextWidth - layout.labelDistance;
                }
            }
            else {
                if (layout.x < cx) {
                    linePoints[2][0] = layout.x + layout.labelDistance;
                }
                else {
                    linePoints[2][0] = layout.x - layout.labelDistance;
                }
                linePoints[1][0] = linePoints[2][0] + dist;
            }
            linePoints[1][1] = linePoints[2][1] = layout.y;
        }
    }
}

function isPositionCenter(layout: LabelLayout) {
    // Not change x for center label
    return layout.position === 'center';
}

export default function (
    seriesModel: PieSeriesModel,
    r: number,
    viewWidth: number,
    viewHeight: number,
    viewLeft: number,
    viewTop: number
) {
    let data = seriesModel.getData();
    let labelLayoutList: LabelLayout[] = [];
    let cx;
    let cy;
    let hasLabelRotate = false;
    let minShowLabelRadian = (seriesModel.get('minShowLabelAngle') || 0) * RADIAN;

    data.each(function (idx) {
        let layout = data.getItemLayout(idx);

        let itemModel = data.getItemModel<PieDataItemOption>(idx);
        let labelModel = itemModel.getModel('label');
        // Use position in normal or emphasis
        let labelPosition = labelModel.get('position') || itemModel.get(['emphasis', 'label', 'position']);
        let labelDistance = labelModel.get('distanceToLabelLine');
        let labelAlignTo = labelModel.get('alignTo');
        let labelMargin = parsePercent(labelModel.get('margin'), viewWidth);
        let bleedMargin = labelModel.get('bleedMargin');
        let font = labelModel.getFont();

        let labelLineModel = itemModel.getModel('labelLine');
        let labelLineLen = labelLineModel.get('length');
        labelLineLen = parsePercent(labelLineLen, viewWidth);
        let labelLineLen2 = labelLineModel.get('length2');
        labelLineLen2 = parsePercent(labelLineLen2, viewWidth);

        if (layout.angle < minShowLabelRadian) {
            return;
        }

        let midAngle = (layout.startAngle + layout.endAngle) / 2;
        let dx = Math.cos(midAngle);
        let dy = Math.sin(midAngle);

        let textX;
        let textY;
        let linePoints;
        let textAlign;

        cx = layout.cx;
        cy = layout.cy;

        let text = seriesModel.getFormattedLabel(idx, 'normal')
                || data.getName(idx);
        let textRect = textContain.getBoundingRect(text, font, textAlign, 'top');

        let isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
        if (labelPosition === 'center') {
            textX = layout.cx;
            textY = layout.cy;
            textAlign = 'center';
        }
        else {
            let x1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dx : layout.r * dx) + cx;
            let y1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dy : layout.r * dy) + cy;

            textX = x1 + dx * 3;
            textY = y1 + dy * 3;

            if (!isLabelInside) {
                // For roseType
                let x2 = x1 + dx * (labelLineLen + r - layout.r);
                let y2 = y1 + dy * (labelLineLen + r - layout.r);
                let x3 = x2 + ((dx < 0 ? -1 : 1) * labelLineLen2);
                let y3 = y2;

                if (labelAlignTo === 'edge') {
                    // Adjust textX because text align of edge is opposite
                    textX = dx < 0
                        ? viewLeft + labelMargin
                        : viewLeft + viewWidth - labelMargin;
                }
                else {
                    textX = x3 + (dx < 0 ? -labelDistance : labelDistance);
                }
                textY = y3;
                linePoints = [[x1, y1], [x2, y2], [x3, y3]];
            }

            textAlign = isLabelInside
                ? 'center'
                : (labelAlignTo === 'edge'
                    ? (dx > 0 ? 'right' : 'left')
                    : (dx > 0 ? 'left' : 'right'));
        }

        let labelRotate;
        let rotate = labelModel.get('rotate');
        if (typeof rotate === 'number') {
            labelRotate = rotate * (Math.PI / 180);
        }
        else {
            labelRotate = rotate
                ? (dx < 0 ? -midAngle + Math.PI : -midAngle)
                : 0;
        }

        hasLabelRotate = !!labelRotate;
        layout.label = {
            x: textX,
            y: textY,
            position: labelPosition,
            height: textRect.height,
            len: labelLineLen,
            len2: labelLineLen2,
            linePoints: linePoints,
            textAlign: textAlign,
            verticalAlign: 'middle',
            rotation: labelRotate,
            inside: isLabelInside,
            labelDistance: labelDistance,
            labelAlignTo: labelAlignTo,
            labelMargin: labelMargin,
            bleedMargin: bleedMargin,
            textRect: textRect,
            text: text,
            font: font
        };

        // Not layout the inside label
        if (!isLabelInside) {
            labelLayoutList.push(layout.label);
        }
    });
    if (!hasLabelRotate && seriesModel.get('avoidLabelOverlap')) {
        avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, viewLeft, viewTop);
    }
}