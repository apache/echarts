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

import * as layout from '../../util/layout';
import {parsePercent, linearMap} from '../../util/number';
import FunnelSeriesModel, { FunnelSeriesOption } from './FunnelSeries';
import ExtensionAPI from '../../ExtensionAPI';
import List from '../../data/List';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';

type FunnelDataItem = FunnelSeriesOption['data'][number] & object;

function getViewRect(seriesModel: FunnelSeriesModel, api: ExtensionAPI) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

function getSortedIndices(data: List, sort: FunnelSeriesOption['sort']) {
    const valueDim = data.mapDimension('value');
    const valueArr = data.mapArray(valueDim, function (val: number) {
        return val;
    });
    const indices: number[] = [];
    const isAscending = sort === 'ascending';
    for (let i = 0, len = data.count(); i < len; i++) {
        indices[i] = i;
    }

    // Add custom sortable function & none sortable opetion by "options.sort"
    if (typeof sort === 'function') {
        indices.sort(sort);
    }
    else if (sort !== 'none') {
        indices.sort(function (a, b) {
            return isAscending
                ? valueArr[a] - valueArr[b]
                : valueArr[b] - valueArr[a];
        });
    }
    return indices;
}

function labelLayout(data: List) {
    data.each(function (idx) {
        const itemModel = data.getItemModel(idx) as Model<FunnelDataItem>;
        const labelModel = itemModel.getModel('label');
        const labelPosition = labelModel.get('position');

        const labelLineModel = itemModel.getModel('labelLine');

        const layout = data.getItemLayout(idx);
        const points = layout.points;

        const isLabelInside = labelPosition === 'inner'
            || labelPosition === 'inside' || labelPosition === 'center'
            || labelPosition === 'insideLeft' || labelPosition === 'insideRight';

        let textAlign;
        let textX;
        let textY;
        let linePoints;

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
            let x1;
            let y1;
            let x2;
            const labelLineLen = labelLineModel.get('length');
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
            else if (labelPosition === 'rightTop') {
                // RightTop side
                x1 = points[1][0];
                y1 = points[1][1];
                x2 = x1 + labelLineLen;
                textX = x2 + 5;
                textAlign = 'top';
            }
            else if (labelPosition === 'rightBottom') {
                // RightBottom side
                x1 = points[2][0];
                y1 = points[2][1];
                x2 = x1 + labelLineLen;
                textX = x2 + 5;
                textAlign = 'bottom';
            }
            else if (labelPosition === 'leftTop') {
                // LeftTop side
                x1 = points[0][0];
                y1 = points[1][1];
                x2 = x1 - labelLineLen;
                textX = x2 - 5;
                textAlign = 'right';
            }
            else if (labelPosition === 'leftBottom') {
                // LeftBottom side
                x1 = points[3][0];
                y1 = points[2][1];
                x2 = x1 - labelLineLen;
                textX = x2 - 5;
                textAlign = 'right';
            }
            else {
                // Right side
                x1 = (points[1][0] + points[2][0]) / 2;
                y1 = (points[1][1] + points[2][1]) / 2;
                x2 = x1 + labelLineLen;
                textX = x2 + 5;
                textAlign = 'left';
            }
            const y2 = y1;

            linePoints = [[x1, y1], [x2, y2]];
            textY = y2;
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

export default function (ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('funnel', function (seriesModel: FunnelSeriesModel) {
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');
        const sort = seriesModel.get('sort');
        const viewRect = getViewRect(seriesModel, api);
        let indices = getSortedIndices(data, sort);

        const sizeExtent = [
            parsePercent(seriesModel.get('minSize'), viewRect.width),
            parsePercent(seriesModel.get('maxSize'), viewRect.width)
        ];
        const dataExtent = data.getDataExtent(valueDim);
        let min = seriesModel.get('min');
        let max = seriesModel.get('max');
        if (min == null) {
            min = Math.min(dataExtent[0], 0);
        }
        if (max == null) {
            max = dataExtent[1];
        }

        const funnelAlign = seriesModel.get('funnelAlign');
        let gap = seriesModel.get('gap');
        let itemHeight = (viewRect.height - gap * (data.count() - 1)) / data.count();

        let y = viewRect.y;

        const getLinePoints = function (idx: number, offY: number) {
            // End point index is data.count() and we assign it 0
            const val = data.get(valueDim, idx) as number || 0;
            const itemWidth = linearMap(val, [min, max], sizeExtent, true);
            let x0;
            switch (funnelAlign) {
                case 'left':
                    x0 = viewRect.x;
                    break;
                case 'center':
                    x0 = viewRect.x + (viewRect.width - itemWidth) / 2;
                    break;
                case 'right':
                    x0 = viewRect.x + viewRect.width - itemWidth;
                    break;
            }
            return [
                [x0, offY],
                [x0 + itemWidth, offY]
            ];
        };

        if (sort === 'ascending') {
            // From bottom to top
            itemHeight = -itemHeight;
            gap = -gap;
            y += viewRect.height;
            indices = indices.reverse();
        }

        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const nextIdx = indices[i + 1];

            const itemModel = data.getItemModel<FunnelDataItem>(idx);
            let height = itemModel.get(['itemStyle', 'height']);
            if (height == null) {
                height = itemHeight;
            }
            else {
                height = parsePercent(height, viewRect.height);
                if (sort === 'ascending') {
                    height = -height;
                }
            }

            const start = getLinePoints(idx, y);
            const end = getLinePoints(nextIdx, y + height);

            y += height + gap;

            data.setItemLayout(idx, {
                points: start.concat(end.slice().reverse())
            });
        }

        labelLayout(data);
    });
}
