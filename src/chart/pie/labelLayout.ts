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
import {parsePercent} from '../../util/number';
import PieSeriesModel, { PieSeriesOption, PieDataItemOption } from './PieSeries';
import { VectorArray } from 'zrender/src/core/vector';
import { HorizontalAlign, VerticalAlign, ZRRectLike, ZRTextAlign } from '../../util/types';
import { Sector, Polyline } from '../../util/graphic';
import ZRText from 'zrender/src/graphic/Text';
import { RectLike } from 'zrender/src/core/BoundingRect';
import Displayable from 'zrender/src/graphic/Displayable';
import { each } from 'zrender/src/core/util';

const RADIAN = Math.PI / 180;

interface LabelLayout {
    x: number
    y: number
    label: ZRText,
    labelLine: Polyline,
    position: PieSeriesOption['label']['position'],
    len: number
    len2: number
    linePoints: VectorArray[]
    textAlign: HorizontalAlign
    verticalAlign: VerticalAlign,
    rotation: number,
    labelDistance: number,
    labelAlignTo: PieSeriesOption['label']['alignTo'],
    labelMargin: number,
    bleedMargin: PieSeriesOption['label']['bleedMargin'],
    textRect: ZRRectLike
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
                && list[j + 1].y > list[j].y + list[j].textRect.height
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
                && list[j].y > list[j - 1].y + list[j - 1].textRect.height
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

            const deltaY = Math.abs(list[i].y - cy);
            const length = list[i].len;
            const length2 = list[i].len2;
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
    const len = list.length;
    const upList = [];
    const downList = [];
    for (let i = 0; i < len; i++) {
        if (list[i].position === 'outer' && list[i].labelAlignTo === 'labelLine') {
            const dx = list[i].x - farthestX;
            list[i].linePoints[1][0] += dx;
            list[i].x = farthestX;
        }

        delta = list[i].y - lastY;
        if (delta < 0) {
            shiftDown(i, len, -delta, dir);
        }
        lastY = list[i].y + list[i].textRect.height;
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
    const leftList = [];
    const rightList = [];
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
        const layout = labelLayoutList[i];
        if (isPositionCenter(layout)) {
            continue;
        }

        const linePoints = layout.linePoints;
        if (linePoints) {
            const isAlignToEdge = layout.labelAlignTo === 'edge';

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
                // TODOTODO
                // layout.text = textContain.truncateText(layout.text, targetTextWidth, layout.font);
                layout.label.style.width = targetTextWidth;
                layout.label.style.overflow = 'truncate';
                if (layout.labelAlignTo === 'edge') {
                    realTextWidth = targetTextWidth;
                    // realTextWidth = textContain.getWidth(layout.text, layout.font);
                }
            }

            const dist = linePoints[1][0] - linePoints[2][0];
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

function isPositionCenter(sectorShape: LabelLayout) {
    // Not change x for center label
    return sectorShape.position === 'center';
}

export default function (
    seriesModel: PieSeriesModel
) {
    const data = seriesModel.getData();
    const labelLayoutList: LabelLayout[] = [];
    let cx;
    let cy;
    let hasLabelRotate = false;
    const minShowLabelRadian = (seriesModel.get('minShowLabelAngle') || 0) * RADIAN;

    const viewRect = data.getLayout('viewRect') as RectLike;
    const r = data.getLayout('r') as number;
    const viewWidth = viewRect.width;
    const viewLeft = viewRect.x;
    const viewTop = viewRect.y;
    const viewHeight = viewRect.height;

    data.each(function (idx) {
        const sector = data.getItemGraphicEl(idx) as Sector;
        const sectorShape = sector.shape;
        const label = sector.getTextContent();
        const labelLine = sector.getTextGuideLine();

        const itemModel = data.getItemModel<PieDataItemOption>(idx);
        const labelModel = itemModel.getModel('label');
        // Use position in normal or emphasis
        const labelPosition = labelModel.get('position') || itemModel.get(['emphasis', 'label', 'position']);
        const labelDistance = labelModel.get('distanceToLabelLine');
        const labelAlignTo = labelModel.get('alignTo');
        const labelMargin = parsePercent(labelModel.get('margin'), viewWidth);
        const bleedMargin = labelModel.get('bleedMargin');

        const labelLineModel = itemModel.getModel('labelLine');
        let labelLineLen = labelLineModel.get('length');
        labelLineLen = parsePercent(labelLineLen, viewWidth);
        let labelLineLen2 = labelLineModel.get('length2');
        labelLineLen2 = parsePercent(labelLineLen2, viewWidth);

        if (Math.abs(sectorShape.endAngle - sectorShape.startAngle) < minShowLabelRadian) {
            return;
        }

        const midAngle = (sectorShape.startAngle + sectorShape.endAngle) / 2;
        const dx = Math.cos(midAngle);
        const dy = Math.sin(midAngle);

        let textX;
        let textY;
        let linePoints;
        let textAlign: ZRTextAlign;

        cx = sectorShape.cx;
        cy = sectorShape.cy;

        const textRect = label.getBoundingRect().clone();
        // Text has a default 1px stroke. Exclude this.
        textRect.x -= 1;
        textRect.y -= 1;
        textRect.width += 2.1;
        textRect.height += 2.1;

        const isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
        if (labelPosition === 'center') {
            textX = sectorShape.cx;
            textY = sectorShape.cy;
            textAlign = 'center';
        }
        else {
            const x1 = (isLabelInside ? (sectorShape.r + sectorShape.r0) / 2 * dx : sectorShape.r * dx) + cx;
            const y1 = (isLabelInside ? (sectorShape.r + sectorShape.r0) / 2 * dy : sectorShape.r * dy) + cy;

            textX = x1 + dx * 3;
            textY = y1 + dy * 3;

            if (!isLabelInside) {
                // For roseType
                const x2 = x1 + dx * (labelLineLen + r - sectorShape.r);
                const y2 = y1 + dy * (labelLineLen + r - sectorShape.r);
                const x3 = x2 + ((dx < 0 ? -1 : 1) * labelLineLen2);
                const y3 = y2;

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
        const rotate = labelModel.get('rotate');
        if (typeof rotate === 'number') {
            labelRotate = rotate * (Math.PI / 180);
        }
        else {
            labelRotate = rotate
                ? (dx < 0 ? -midAngle + Math.PI : -midAngle)
                : 0;
        }

        hasLabelRotate = !!labelRotate;

        // Not sectorShape the inside label
        if (!isLabelInside) {
            labelLayoutList.push({
                label,
                labelLine,
                x: textX,
                y: textY,
                position: labelPosition,
                len: labelLineLen,
                len2: labelLineLen2,
                linePoints: linePoints,
                textAlign: textAlign,
                verticalAlign: 'middle',
                rotation: labelRotate,
                labelDistance: labelDistance,
                labelAlignTo: labelAlignTo,
                labelMargin: labelMargin,
                bleedMargin: bleedMargin,
                textRect: textRect
            });
        }
        sector.setTextConfig({
            inside: isLabelInside
        });
    });

    if (!hasLabelRotate && seriesModel.get('avoidLabelOverlap')) {
        avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, viewLeft, viewTop);
    }

    function setNotShow(el: {ignore: boolean}) {
        el.ignore = true;
    }

    for (let i = 0; i < labelLayoutList.length; i++) {
        const layout = labelLayoutList[i];
        const label = layout.label;
        const labelLine = layout.labelLine;
        const notShowLabel = isNaN(layout.x) || isNaN(layout.y);
        if (label) {
            label.x = layout.x;
            label.y = layout.y;
            label.setStyle({
                align: layout.textAlign,
                verticalAlign: layout.verticalAlign
            });
            if (notShowLabel) {
                each(label.states, setNotShow);
                label.ignore = true;
            }
            const selectState = label.states.select;
            if (selectState) {
                selectState.x += layout.x;
                selectState.y += layout.y;
            }
        }
        if (labelLine) {
            labelLine.setShape({ points: layout.linePoints });
            if (notShowLabel) {
                each(labelLine.states, setNotShow);
                labelLine.ignore = true;
            }
        }
    }
}