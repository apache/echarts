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

var RADIAN = Math.PI / 180;

function adjustSingleSide(list, cx, cy, r, dir, viewWidth, viewHeight, labelLine) {
    list.sort(function (a, b) {
        return a.y - b.y;
    });

    function shiftDown(start, end, delta, dir) {
        for (var j = start; j < end; j++) {
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

    function shiftUp(end, delta) {
        for (var j = end; j >= 0; j--) {
            list[j].y -= delta;
            if (j > 0
                && list[j].y > list[j - 1].y + list[j - 1].height
            ) {
                break;
            }
        }
    }

    function changeX(list, isDownList, cx, cy, r, dir, maxTextWidth) {
        var lastDeltaX = dir > 0
            ? isDownList                // right-side
                ? Number.MAX_VALUE      // down
                : 0                     // up
            : isDownList                // left-side
                ? Number.MAX_VALUE      // down
                : 0;                    // up

        for (var i = 0, l = list.length; i < l; i++) {
            if (list[i].labelAlignTo !== 'none') {
                var dx = labelLine.dx * dir;
                var x2 = list[i].linePoints[1][0];
                var x3 = list[i].linePoints[2][0] + dx;
                var len2 = (x3 - x2) * dir;

                list[i].x = x3 + dir * list[i].labelPadding;
                if (len2 < labelLine.restrainMinLen2) {
                    var x3Updated = x2 + labelLine.restrainMinLen2 * dir;
                    var padding = list[i].labelPadding;

                    var textWidth = list[i].width + (x3 - x3Updated + padding) * dir;
                    list[i].truncatedText = textContain.truncateText(
                        list[i].truncatedText,
                        textWidth,
                        list[i].font
                    );
                    var realTextWidth = textContain.getWidth(
                        list[i].truncatedText,
                        list[i].font
                    );
                    list[i].x += dir * (list[i].width - realTextWidth);

                    x3 = x3Updated;
                }
                list[i].linePoints[2][0] = x3;
                continue;
            }

            var deltaY = Math.abs(list[i].y - cy);
            var length = list[i].len;
            var length2 = list[i].len2;
            var deltaX = (deltaY < r + length)
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

    var lastY = 0;
    var delta;
    var len = list.length;
    var upList = [];
    var downList = [];
    var maxTextWidth = -1;
    for (var i = 0; i < len; i++) {
        delta = list[i].y - lastY;
        if (delta < 0) {
            shiftDown(i, len, -delta, dir);
        }
        lastY = list[i].y + list[i].height;
        maxTextWidth = Math.max(maxTextWidth, list[i].width);
    }
    if (viewHeight - lastY < 0) {
        shiftUp(len - 1, lastY - viewHeight);
    }
    for (var i = 0; i < len; i++) {
        if (list[i].y >= cy) {
            downList.push(list[i]);
        }
        else {
            upList.push(list[i]);
        }
    }
    changeX(upList, false, cx, cy, r, dir, maxTextWidth);
    changeX(downList, true, cx, cy, r, dir, maxTextWidth);
}

function avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, labelLine) {
    var leftList = [];
    var rightList = [];
    for (var i = 0; i < labelLayoutList.length; i++) {
        if (isPositionCenter(labelLayoutList[i])) {
            continue;
        }
        if (labelLayoutList[i].x < cx) {
            leftList.push(labelLayoutList[i]);
        }
        else {
            rightList.push(labelLayoutList[i]);
        }
    }

    adjustSingleSide(rightList, cx, cy, r, 1, viewWidth, viewHeight, labelLine);
    adjustSingleSide(leftList, cx, cy, r, -1, viewWidth, viewHeight, labelLine);

    for (var i = 0; i < labelLayoutList.length; i++) {
        if (isPositionCenter(labelLayoutList[i])
            || labelLayoutList[i].labelAlignTo !== 'none'
        ) {
            continue;
        }
        var linePoints = labelLayoutList[i].linePoints;
        if (linePoints) {
            var dist = linePoints[1][0] - linePoints[2][0];
            if (labelLayoutList[i].x < cx) {
                linePoints[2][0] = labelLayoutList[i].x + 3;
            }
            else {
                linePoints[2][0] = labelLayoutList[i].x - 3;
            }
            linePoints[1][1] = linePoints[2][1] = labelLayoutList[i].y;
            linePoints[1][0] = linePoints[2][0] + dist;
        }
    }
}

function isPositionCenter(layout) {
    // Not change x for center label
    return layout.position === 'center';
}

export default function (seriesModel, r, viewWidth, viewHeight, sum) {
    var data = seriesModel.getData();
    var labelLayoutList = [];
    var cx;
    var cy;
    var hasLabelRotate = false;
    var minShowLabelRadian = (seriesModel.get('minShowLabelAngle') || 0) * RADIAN;

    var seriesLabelModel = seriesModel.getModel('label');
    var edgeMargin = seriesLabelModel.get('edgeMargin');
    edgeMargin = parsePercent(edgeMargin, viewWidth);
    var maxLen2 = -1;
    var minLen2 = Number.MAX_VALUE;

    data.each(function (idx) {
        var layout = data.getItemLayout(idx);

        var itemModel = data.getItemModel(idx);
        var labelModel = itemModel.getModel('label');
        // Use position in normal or emphasis
        var labelPosition = labelModel.get('position') || itemModel.get('emphasis.label.position');
        var labelAlignTo = labelModel.get('alignTo');
        var labelPadding = labelModel.get('padding');
        var font = labelModel.getFont();

        var labelLineModel = itemModel.getModel('labelLine');
        var labelLineLen = labelLineModel.get('length');
        var labelLineLen2 = labelLineModel.get('length2');

        var edgeMargin = labelModel.get('edgeMargin');
        edgeMargin = parsePercent(edgeMargin, viewWidth);

        if (layout.angle < minShowLabelRadian) {
            return;
        }

        var midAngle = (layout.startAngle + layout.endAngle) / 2;
        var dx = Math.cos(midAngle);
        var dy = Math.sin(midAngle);

        var textX;
        var textY;
        var linePoints;
        var textAlign;

        cx = layout.cx;
        cy = layout.cy;

        var text = seriesModel.getFormattedLabel(idx, 'normal')
                || data.getName(idx);
        var textRect = textContain.getBoundingRect(
            text, font, textAlign, 'top'
        );

        var isLabelInside = labelPosition === 'inside' || labelPosition === 'inner';
        if (labelPosition === 'center') {
            textX = layout.cx;
            textY = layout.cy;
            textAlign = 'center';
        }
        else {
            var x1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dx : layout.r * dx) + cx;
            var y1 = (isLabelInside ? (layout.r + layout.r0) / 2 * dy : layout.r * dy) + cy;

            textX = x1 + dx * 3;
            textY = y1 + dy * 3;

            var dir = dx < 0 ? -1 : 1;

            if (!isLabelInside) {
                // For roseType
                var x2 = x1 + dx * (labelLineLen + r - layout.r);
                var y2 = y1 + dy * (labelLineLen + r - layout.r);

                var x3;
                if (labelAlignTo === 'labelLine') {
                    x3 = dx < 0
                        ? edgeMargin + labelPadding
                        : viewWidth - edgeMargin - labelPadding;
                }
                else if (labelAlignTo === 'edge') {
                    x3 = dx < 0
                        ? edgeMargin + labelPadding + textRect.width
                        : viewWidth - edgeMargin - labelPadding - textRect.width;
                }
                else {
                    x3 = x2 + dir * labelLineLen2;
                }

                if (labelAlignTo === 'edge' || labelAlignTo === 'labelLine') {
                    var len2 = (x3 - x2) * dir;
                    minLen2 = Math.min(minLen2, len2);
                    maxLen2 = Math.max(maxLen2, len2);
                }

                var y3 = y2;

                textX = x3 + dir * labelPadding;
                textY = y3;
                linePoints = [[x1, y1], [x2, y2], [x3, y3]];
            }

            textAlign = isLabelInside ? 'center' : (dx > 0 ? 'left' : 'right');
        }

        var labelRotate;
        var rotate = labelModel.get('rotate');
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
            labelAlignTo: labelAlignTo,
            edgeMargin: edgeMargin,
            width: textRect.width,
            height: textRect.height,
            len: labelLineLen,
            len2: labelLineLen2,
            linePoints: linePoints,
            textAlign: textAlign,
            verticalAlign: 'middle',
            rotation: labelRotate,
            inside: isLabelInside,
            truncatedText: text,
            font: font,
            labelPadding: labelPadding
        };

        // Not layout the inside label
        if (!isLabelInside) {
            labelLayoutList.push(layout.label);
        }
    });

    if (!hasLabelRotate && seriesModel.get('avoidLabelOverlap')) {
        var seriesLabelLineModel = seriesModel.getModel('labelLine');
        var restrainMinLen2 = parsePercent(seriesLabelLineModel.get('minLength2'), viewWidth);
        var restrainMaxLen2 = parsePercent(seriesLabelLineModel.get('maxLength2'), viewWidth);
        if (restrainMaxLen2 < restrainMinLen2) {
            restrainMaxLen2 = restrainMinLen2;
        }

        var targetMinLen2 = Math.min(Math.max(minLen2, restrainMinLen2), restrainMaxLen2);
        var targetMaxLen2 = Math.max(Math.min(maxLen2, restrainMaxLen2), restrainMinLen2);

        var dx = 0;
        if (minLen2 < targetMinLen2) {
            dx = targetMinLen2 - minLen2;
        }
        else if (maxLen2 > targetMaxLen2) {
            dx = targetMaxLen2 - maxLen2;
        }

        var labelLine = {
            restrainMinLen2: restrainMinLen2,
            restrainMaxLen2: restrainMaxLen2,
            dx: dx
        };

        // console.log(labelLine);
        avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, labelLine);
    }
}