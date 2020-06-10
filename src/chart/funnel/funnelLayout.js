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

import {__DEV__} from '../../config';
import * as layout from '../../util/layout';
import {parsePercent, linearMap} from '../../util/number';

function getViewRect(seriesModel, api) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

function getSortedIndices(data, sort) {
    var valueDim = data.mapDimension('value');
    var valueArr = data.mapArray(valueDim, function (val) {
        return val;
    });
    var indices = [];
    var isAscending = sort === 'ascending';
    for (var i = 0, len = data.count(); i < len; i++) {
        indices[i] = i;
    }

    // Add custom sortable function & none sortable opetion by "options.sort"
    if (typeof sort === 'function') {
        indices.sort(sort);
    }
    else if (sort !== 'none') {
        indices.sort(function (a, b) {
            return isAscending ? valueArr[a] - valueArr[b] : valueArr[b] - valueArr[a];
        });
    }
    return indices;
}

function labelLayout(data) {
    data.each(function (idx) {
        var itemModel = data.getItemModel(idx);
        var labelModel = itemModel.getModel('label');
        var labelPosition = labelModel.get('position');
        var orient = itemModel.get('orient');

        var labelLineModel = itemModel.getModel('labelLine');

        var layout = data.getItemLayout(idx);
        var points = layout.points;

        var isLabelInside = labelPosition === 'inner'
            || labelPosition === 'inside' || labelPosition === 'center'
            || labelPosition === 'insideLeft' || labelPosition === 'insideRight';

        var textAlign;
        var textX;
        var textY;
        var linePoints;

        if (isLabelInside) {
            if (labelPosition === 'insideLeft') {
                textX = (points[0][0] + points[3][0]) / 2 + 5;
                textY = (points[0][1] + points[3][1]) / 2;
                textAlign = 'left';
            }
            else if (labelPosition === 'insideRight') {
                textX = (points[1][0] + points[2][0]) / 2 - 5;
                textY = (points[1][1] + points[2][1]) / 2;
                textAlign = 'right';
            }
            else {
                textX = (points[0][0] + points[1][0] + points[2][0] + points[3][0]) / 4;
                textY = (points[0][1] + points[1][1] + points[2][1] + points[3][1]) / 4;
                textAlign = 'center';
            }
            linePoints = [
                [textX, textY], [textX, textY]
            ];
        }
        else {
            var x1;
            var y1;
            var x2;
            var y2;
            var labelLineLen = labelLineModel.get('length');
            if (__DEV__) {
                if (orient === 'vertical' && ['top', 'bottom'].indexOf(labelPosition) > -1) {
                    labelPosition = 'left';
                    console.warn('Position error: Funnel chart on vertical orient dose not support top and bottom.');
                }
                if (orient === 'horizontal' && ['left', 'right'].indexOf(labelPosition) > -1) {
                    labelPosition = 'bottom';
                    console.warn('Position error: Funnel chart on horizontal orient dose not support left and right.');
                }
            }
            if (labelPosition === 'left') {
                // Left side
                x1 = (points[3][0] + points[0][0]) / 2;
                y1 = (points[3][1] + points[0][1]) / 2;
                x2 = x1 - labelLineLen;
                textX = x2 - 5;
                textAlign = 'right';
            }
            else if (labelPosition === 'right') {
                // Right side
                x1 = (points[1][0] + points[2][0]) / 2;
                y1 = (points[1][1] + points[2][1]) / 2;
                x2 = x1 + labelLineLen;
                textX = x2 + 5;
                textAlign = 'left';
            }
            else if (labelPosition === 'top') {
                // Top side
                x1 = (points[3][0] + points[0][0]) / 2;
                y1 = (points[3][1] + points[0][1]) / 2;
                y2 = y1 - labelLineLen;
                textY = y2 - 5;
                textAlign = 'center';
            }
            else if (labelPosition === 'bottom') {
                // Bottom side
                x1 = (points[1][0] + points[2][0]) / 2;
                y1 = (points[1][1] + points[2][1]) / 2;
                y2 = y1 + labelLineLen;
                textY = y2 + 5;
                textAlign = 'center';
            }
            else if (labelPosition === 'rightTop') {
                // RightTop side
                x1 = orient === 'horizontal' ? points[3][0] : points[1][0];
                y1 = orient === 'horizontal' ? points[3][1] : points[1][1];
                if (orient === 'horizontal') {
                    y2 = y1 - labelLineLen;
                    textY = y2 - 5;
                    textAlign = 'center';
                }
                else {
                    x2 = x1 + labelLineLen;
                    textX = x2 + 5;
                    textAlign = 'top';
                }
            }
            else if (labelPosition === 'rightBottom') {
                // RightBottom side
                x1 = points[2][0];
                y1 = points[2][1];
                if (orient === 'horizontal') {
                    y2 = y1 + labelLineLen;
                    textY = y2 + 5;
                    textAlign = 'center';
                }
                else {
                    x2 = x1 + labelLineLen;
                    textX = x2 + 5;
                    textAlign = 'bottom';
                }
            }
            else if (labelPosition === 'leftTop') {
                // LeftTop side
                x1 = points[0][0];
                y1 = orient === 'horizontal' ? points[0][1] : points[1][1];
                if (orient === 'horizontal') {
                    y2 = y1 - labelLineLen;
                    textY = y2 - 5;
                    textAlign = 'center';
                }
                else {
                    x2 = x1 - labelLineLen;
                    textX = x2 - 5;
                    textAlign = 'right';
                }
            }
            else if (labelPosition === 'leftBottom') {
                // LeftBottom side
                x1 = orient === 'horizontal' ? points[1][0] : points[3][0];
                y1 = orient === 'horizontal' ? points[1][1] : points[2][1];
                if (orient === 'horizontal') {
                    y2 = y1 + labelLineLen;
                    textY = y2 + 5;
                    textAlign = 'center';
                }
                else {
                    x2 = x1 - labelLineLen;
                    textX = x2 - 5;
                    textAlign = 'right';
                }
            }
            else {
                // Right side or Bottom side
                x1 = (points[1][0] + points[2][0]) / 2;
                y1 = (points[1][1] + points[2][1]) / 2;
                if (orient === 'horizontal') {
                    y2 = y1 + labelLineLen;
                    textY = y2 + 5;
                    textAlign = 'center';
                }
                else {
                    x2 = x1 + labelLineLen;
                    textX = x2 + 5;
                    textAlign = 'left';
                }
            }
            if (orient === 'horizontal') {
                x2 = x1;
                textX = x2;
            }
            else {
                y2 = y1;
                textY = y2;
            }
            linePoints = [[x1, y1], [x2, y2]];
        }

        layout.label = {
            linePoints: linePoints,
            x: textX,
            y: textY,
            verticalAlign: 'middle',
            textAlign: textAlign,
            inside: isLabelInside
        };
    });
}

export default function (ecModel, api, payload) {
    ecModel.eachSeriesByType('funnel', function (seriesModel) {
        var data = seriesModel.getData();
        var valueDim = data.mapDimension('value');
        var sort = seriesModel.get('sort');
        var viewRect = getViewRect(seriesModel, api);
        var indices = getSortedIndices(data, sort);
        var orient = seriesModel.get('orient');
        var viewWidth = viewRect.width;
        var viewHeight = viewRect.height;
        var x = viewRect.x;
        var y = viewRect.y;

        var sizeExtent = orient === 'horizontal' ? [
            parsePercent(seriesModel.get('minSize'), viewHeight),
            parsePercent(seriesModel.get('maxSize'), viewHeight)
        ] : [
                parsePercent(seriesModel.get('minSize'), viewWidth),
                parsePercent(seriesModel.get('maxSize'), viewWidth)
            ];
        var dataExtent = data.getDataExtent(valueDim);
        var min = seriesModel.get('min');
        var max = seriesModel.get('max');
        if (min == null) {
            min = Math.min(dataExtent[0], 0);
        }
        if (max == null) {
            max = dataExtent[1];
        }

        var funnelAlign = seriesModel.get('funnelAlign');
        var gap = seriesModel.get('gap');
        var viewSize = orient === 'horizontal' ? viewWidth : viewHeight;
        var itemSize = (viewSize - gap * (data.count() - 1)) / data.count();

        var getLinePoints = function (idx, offset) {
            // End point index is data.count() and we assign it 0
            if (orient === 'horizontal') {
                var val = data.get(valueDim, idx) || 0;
                var itemHeight = linearMap(val, [min, max], sizeExtent, true);
                var y0;
                switch (funnelAlign) {
                    case 'top':
                        y0 = y;
                        break;
                    case 'center':
                        y0 = y + (viewHeight - itemHeight) / 2;
                        break;
                    case 'bottom':
                        y0 = y + (viewHeight - itemHeight);
                        break;
                }

                return [
                    [offset, y0],
                    [offset, y0 + itemHeight]
                ];
            }
            var val = data.get(valueDim, idx) || 0;
            var itemWidth = linearMap(val, [min, max], sizeExtent, true);
            var x0;
            switch (funnelAlign) {
                case 'left':
                    x0 = x;
                    break;
                case 'center':
                    x0 = x + (viewWidth - itemWidth) / 2;
                    break;
                case 'right':
                    x0 = x + viewWidth - itemWidth;
                    break;
            }
            return [
                [x0, offset],
                [x0 + itemWidth, offset]
            ];
        };

        if (sort === 'ascending') {
            // From bottom to top
            itemSize = -itemSize;
            gap = -gap;
            if (orient === 'horizontal') {
                x += viewWidth;
            }
            else {
                y += viewHeight;
            }
            indices = indices.reverse();
        }

        for (var i = 0; i < indices.length; i++) {
            var idx = indices[i];
            var nextIdx = indices[i + 1];
            var itemModel = data.getItemModel(idx);

            if (orient === 'horizontal') {
                var width = itemModel.get('itemStyle.width');
                if (width == null) {
                    width = itemSize;
                }
                else {
                    width = parsePercent(width, viewWidth);
                    if (sort === 'ascending') {
                        width = -width;
                    }
                }

                var start = getLinePoints(idx, x);
                var end = getLinePoints(nextIdx, x + width);

                x += width + gap;

                data.setItemLayout(idx, {
                    points: start.concat(end.slice().reverse())
                });
            }
            else {
                var height = itemModel.get('itemStyle.height');
                if (height == null) {
                    height = itemSize;
                }
                else {
                    height = parsePercent(height, viewHeight);
                    if (sort === 'ascending') {
                        height = -height;
                    }
                }

                var start = orient === 'horizontal' ? getLinePoints(idx, x) : getLinePoints(idx, y);
                var end = orient === 'horizontal'
                    ? getLinePoints(nextIdx, x + width) : getLinePoints(nextIdx, y + height);

                y += height + gap;

                data.setItemLayout(idx, {
                    points: start.concat(end.slice().reverse())
                });
            }
        }

        labelLayout(data);
    });
}
