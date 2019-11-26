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

function adjustSingleSide(list, cx, cy, r, dir, viewWidth, viewHeight, left, top, labelLine) {
    list.sort(function (a, b) {
        return a.y - b.y;
    });

    function shiftDown(start, end, delta, dir) {
        for (var j = start; j < end; j++) {
            if (list[j].y + delta > top + viewHeight) {
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

    function shiftUp(end, delta) {
        for (var j = end; j >= 0; j--) {
            if (list[j].y - delta < top) {
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

    function changeX(list, isDownList, cx, cy, r, dir) {
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
                var padding = list[i].labelPadding;
                var margin = list[i].margin;
                var isAlignToEdge = list[i].labelAlignTo === 'edge';

                list[i].x = x3 + dir * list[i].labelPadding;

                var textWidth = isAlignToEdge
                    // Default text width is the real width when alignTo is 'edge'
                    ? left + list[i].width
                    // Default text width is the distance between boundary to x3 for 'labelLine'
                    : (dir > 0
                        ? left + viewWidth - x3 - padding - margin
                        : left + x3 - padding - margin
                    );


                var x3Updated = x3;

                if (len2 < labelLine.restrainMinLen2) {
                    // Move text or x3 to make len2 larger
                    x3Updated = x2 + labelLine.restrainMinLen2 * dir;
                }
                // Prevent text overflowing margin
                if (dir > 0) {
                    x3Updated = Math.min(x3Updated, left + viewWidth - margin - padding);
                }
                else if (dir <= 0) {
                    x3Updated = Math.max(x3Updated, left + margin + padding);
                }
                // Prevent x3 being inner than x2
                x3Updated = dir > 0
                    ? Math.max(x2, x3Updated)
                    : Math.min(x2, x3Updated);
                console.log(x3, x3Updated);

                var x3Delta = (x3 - x3Updated) * dir;
                // Set text width to be smaller to make len2 large
                textWidth += x3Delta;
                list[i].x -= x3Delta * dir;

                x3 = x3Updated;

                // Restrain margin
                var maxTextWidth = dir > 0
                    ? Math.max(0, left + viewWidth - margin - list[i].x - padding)
                    : Math.max(0, list[i].x - margin - left - padding);
                textWidth = Math.min(textWidth, maxTextWidth);

                if (textWidth < list[i].width) {
                    list[i].truncatedText = textContain.truncateText(
                        list[i].truncatedText,
                        textWidth,
                        list[i].font
                    );
                    var realTextWidth = textContain.getWidth(
                        list[i].truncatedText,
                        list[i].font
                    );
                    // Small adjustment when realTextWidth is not exactly the same
                    isAlignToEdge && (list[i].x += dir * (textWidth - realTextWidth));
                    list[i].width = realTextWidth;
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
    for (var i = 0; i < len; i++) {
        delta = list[i].y - lastY;
        if (delta < 0) {
            shiftDown(i, len, -delta, dir);
        }
        lastY = list[i].y + list[i].height;
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
    changeX(upList, false, cx, cy, r, dir);
    changeX(downList, true, cx, cy, r, dir);
}

function avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, left, top, labelLine) {
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

    adjustSingleSide(rightList, cx, cy, r, 1, viewWidth, viewHeight, left, top, labelLine);
    adjustSingleSide(leftList, cx, cy, r, -1, viewWidth, viewHeight, left, top, labelLine);

    for (var i = 0; i < labelLayoutList.length; i++) {
        if (isPositionCenter(labelLayoutList[i])) {
            continue;
        }
        var linePoints = labelLayoutList[i].linePoints;
        if (linePoints) {
            var dist = linePoints[1][0] - linePoints[2][0];
            if (labelLayoutList[i].x < cx) {
                linePoints[2][0] = labelLayoutList[i].x + labelLayoutList[i].labelPadding;
            }
            else {
                linePoints[2][0] = labelLayoutList[i].x - labelLayoutList[i].labelPadding;
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

export default function (seriesModel, r, viewWidth, viewHeight, left, top) {
    var data = seriesModel.getData();
    var labelLayoutList = [];
    var cx;
    var cy;
    var hasLabelRotate = false;
    var minShowLabelRadian = (seriesModel.get('minShowLabelAngle') || 0) * RADIAN;

    var maxLen2 = -Number.MAX_VALUE;
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

        var margin = labelModel.get('margin');
        margin = parsePercent(margin, viewWidth);

        if (layout.angle < minShowLabelRadian) {
            return;
        }

        var midAngle = (layout.startAngle + layout.endAngle) / 2;
        var dx = Math.cos(midAngle);
        var dy = Math.sin(midAngle);
        var dir = dx < 0 ? -1 : 1;

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

            if (!isLabelInside) {
                // For roseType
                var x2 = x1 + dx * (labelLineLen + r - layout.r);
                var y2 = y1 + dy * (labelLineLen + r - layout.r);

                var x3;
                if (labelAlignTo === 'labelLine') {
                    x3 = dx < 0
                        ? left + margin + labelPadding
                        : left + viewWidth - margin - labelPadding;
                }
                else if (labelAlignTo === 'edge') {
                    x3 = dx < 0
                        ? left + margin + labelPadding + textRect.width
                        : left + viewWidth - margin - labelPadding - textRect.width;
                }
                else {
                    x3 = x2 + dir * labelLineLen2;
                }

                // x3 Cannot be inner than x2
                dir > 0 && (x3 = Math.max(x3, x2));
                dir <= 0 && (x3 = Math.min(x3, x2));

                if (labelAlignTo === 'edge' || labelAlignTo === 'labelLine') {
                    var len2 = Math.max((x3 - x2) * dir, 0);
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
            margin: margin,
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
        if (maxLen2 > targetMaxLen2) {
            dx = targetMaxLen2 - maxLen2;
        }
        else if (minLen2 < targetMinLen2) {
            dx = targetMinLen2 - minLen2;
        }

        var labelLine = {
            restrainMinLen2: restrainMinLen2,
            restrainMaxLen2: restrainMaxLen2,
            dx: dx
        };

        avoidOverlap(labelLayoutList, cx, cy, r, viewWidth, viewHeight, left, top, labelLine);
    }
}