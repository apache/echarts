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
* Unless required by applicable ko+/ or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as layout from '../../util/layout';
import { parsePercent, linearMap } from '../../util/number';
import FunnelSeriesModel, { FunnelSeriesOption, FunnelDataItemOption } from './FunnelSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import GlobalModel from '../../model/Global';
import { isFunction } from 'zrender/src/core/util';

function getViewRect(seriesModel: FunnelSeriesModel, api: ExtensionAPI) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

function getSortedIndices(data: SeriesData, sort: FunnelSeriesOption['sort']) {
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
    if (isFunction(sort)) {
        indices.sort(sort as any);
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

function labelLayout(data: SeriesData) {
    const seriesModel = data.hostModel;
    const orient = seriesModel.get('orient');
    data.each(function (idx) {
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const labelModel = itemModel.getModel('label');
        let labelPosition = labelModel.get('position');

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
            let y2;
            const labelLineLen = labelLineModel.get('length');
            if (__DEV__) {
                if (orient === 'vertical' && ['top', 'bottom'].indexOf(labelPosition as string) > -1) {
                    labelPosition = 'left';
                    console.warn('Position error: Funnel chart on vertical orient dose not support top and bottom.');
                }
                if (orient === 'horizontal' && ['left', 'right'].indexOf(labelPosition as string) > -1) {
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

function rateLabelLayout(data: SeriesData) {
    data.each(function (idx) {
        const layout = data.getItemLayout(idx);
        const points = layout.ratePoints;

        const isLabelInside = true;

        const textX = (points[0][0] + points[1][0] + points[2][0] + points[3][0]) / 4;
        const textY = (points[0][1] + points[1][1] + points[2][1] + points[3][1]) / 4;
        const textAlign = 'center';

        layout.rateLabel = {
            x: textX,
            y: textY,
            verticalAlign: 'middle',
            textAlign: textAlign,
            inside: isLabelInside
        };
    });
}

export default function funnelLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('funnel', function (seriesModel: FunnelSeriesModel) {
        const data = seriesModel.getData();
        const valueDim = data.mapDimension('value');
        const sort = seriesModel.get('sort');
        const viewRect = getViewRect(seriesModel, api);
        const orient = seriesModel.get('orient');
        const viewWidth = viewRect.width;
        const viewHeight = viewRect.height;
        let indices = getSortedIndices(data, sort);
        let x = viewRect.x;
        let y = viewRect.y;

        const isHorizontal = orient === 'horizontal';

        let size = isHorizontal ? viewHeight : viewWidth;
        const sizeExtent = [
            parsePercent(seriesModel.get('minSize'), size),
            parsePercent(seriesModel.get('maxSize'), size)
        ];

        const dataExtent = data.getDataExtent(valueDim);
        const min = seriesModel.get('min') ?? Math.min(dataExtent[0], 0);
        const max = seriesModel.get('max') ?? dataExtent[1];

        const funnelAlign = seriesModel.get('funnelAlign');
        let gap = seriesModel.get('gap');
        let viewSize = isHorizontal ? viewWidth : viewHeight;
        const gapSum = gap * (data.count() - 1);
        let itemSize = (viewSize - gapSum) / data.count();

        const valueSum = data.mapArray(valueDim, (val: number) => val).reduce((pre, cur) => pre + cur);

        const dynamicHeight = seriesModel.get('dynamicHeight');
        const showRate = seriesModel.get('showRate') && sort !== 'none';
        const exitWidth = parsePercent(seriesModel.get('exitWidth'), 100);

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

        const getLinePoints = function (offset: number, itemSize: number) {
            // do not caculate line width in this func
            if (orient === 'horizontal') {
                const itemHeight = itemSize;
                let y0;
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
            const itemWidth = itemSize;
            let x0;
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

        const getItemSize = function (idx: number) {
            const itemVal = data.get(valueDim, idx) as number || 0;
            return linearMap(itemVal, [min, max], sizeExtent, true);
        };

        // dynamicHeight
        let setDyHeightPiecePoints:
            (
                index: number,
                idx: number,
                pos: number,
                pieceHeight: number
            ) => void | null = null;
        if (dynamicHeight) {
            // judge size
            size = isHorizontal ? viewWidth - gapSum : viewHeight - gapSum;
            sizeExtent.splice(0, 2, parsePercent(seriesModel.get('minSize'), size), size);
            viewSize = !isHorizontal ? viewWidth : viewHeight;
            viewSize = parsePercent(seriesModel.get('maxSize'), viewSize);
            // function to set dy piece
            const dyminPercent = parsePercent(seriesModel.get('minSize'), 100);
            const dymaxSize = dyminPercent < 100 ? sizeExtent[1] * 100 / (100 - dyminPercent) : sizeExtent[1];
            let resSize = dymaxSize;
            setDyHeightPiecePoints = function (
                index: number,
                idx: number,
                pieceHeight: number,
                pos: number
            ) {
                const start = getLinePoints(pos, resSize / dymaxSize * viewSize);
                if (index !== indices.length - 1 || exitWidth !== 100) {
                    resSize += sort === 'ascending' ? pieceHeight : -pieceHeight;
                }
                const end = getLinePoints(pos + pieceHeight, resSize / dymaxSize * viewSize);
                data.setItemLayout(idx, {
                    points: start.concat(end.slice().reverse())
                });
            };
        }

        //  rate funnel
        let setRatePiecePoint: (
            index: number,
            idx: number,
            nextIdx: number,
            pieceHeight: number,
            pos: number
        ) => void | null = null;

        if (showRate) {
            let firstVal: number;
            let firstName: string;
            let firstDataIndex: number;
            // get rate fixed decimal places
            const ratePrecision = seriesModel.get(['rateLabel', 'precision']);
            const overallRatePrecision = seriesModel.get(['overallRateLabel', 'precision']);
            const getConverRate = function (index: number, idx: number, nextIdx: number) {
                const val = data.get(valueDim, idx) as number || 0;
                const nextVal = data.get(valueDim, nextIdx) as number || 0;
                let preName = data.getName(idx);
                let nextName = data.getName(nextIdx);
                let preDataIndex = idx;
                let nextDataIndex = nextIdx;
                let rate: number | string = nextVal / val;
                rate = (rate * 100).toFixed(ratePrecision) + '%';
                if (index === 0) {
                    firstVal = val;
                    firstName = data.getName(idx);
                    firstDataIndex = idx;
                }
                else if (index === indices.length - 1) {
                    const lastVal = val;
                    rate = lastVal / firstVal;
                    rate = (rate * 100).toFixed(overallRatePrecision) + '%';
                    nextName = preName;
                    preName = firstName;
                    preDataIndex = firstDataIndex;
                    nextDataIndex = idx;
                }
                preDataIndex = preDataIndex + 1;
                nextDataIndex = nextDataIndex + 1;
                return { rate, nextName, preName, preDataIndex, nextDataIndex };
            };
            setRatePiecePoint = function (
                index: number,
                idx: number,
                nextIdx: number,
                pieceHeight: number,
                pos: number
            ) {

                const itemSize = getItemSize(idx);
                let exitSize = itemSize;
                if (exitWidth != null && index === indices.length - 1) {
                    exitSize = itemSize * (exitWidth > 100 ? 100 : exitWidth) / 100;
                }

                const dataStart = getLinePoints(pos, itemSize);
                const dataEnd = getLinePoints(pos + pieceHeight / 2, exitSize);

                const nextSize = getItemSize(index === indices.length - 1 && exitWidth === 100 ? idx : nextIdx);

                const rateStart = getLinePoints(pos + pieceHeight / 2, itemSize);
                const rateEnd = getLinePoints(pos + pieceHeight, nextSize);

                // rate string about
                const { rate, nextName, preName, preDataIndex, nextDataIndex } = getConverRate(index, idx, nextIdx);
                data.setItemLayout(idx, {
                    points: dataStart.concat(dataEnd.slice().reverse()),
                    ratePoints: rateStart.concat(rateEnd.slice().reverse()),
                    isLastPiece: index === indices.length - 1,
                    rate,
                    nextName,
                    preName,
                    preDataIndex,
                    nextDataIndex
                });
            };
        }

        const getPieceHeight = function (pieceHeight: number | string, idx?: number): number {
            // get funnel piece height pass to getLinePoints func based on data value
            const val = data.get(valueDim, idx) as number || 0;

            if (dynamicHeight) {
                // in dy height, user can't set itemHeight or itemWidth
                pieceHeight = linearMap(val, [0, valueSum], [0, size], true);
                pieceHeight = sort === 'ascending' ? -pieceHeight : pieceHeight;
                return pieceHeight;
            }

            // default mapping or show rate pieceHeight
            if (pieceHeight == null) {
                pieceHeight = itemSize;
            }
            else {
                pieceHeight = parsePercent(pieceHeight, orient === 'horizontal' ? viewWidth : viewHeight);
                pieceHeight = sort === 'ascending' ? -pieceHeight : pieceHeight;
            }
            return pieceHeight;
        };

        // set the line piont of the funnel piece
        const setItemLayout = function (
            index: number,
            idx: number,
            nextIdx: number,
            pieceHeight: number,
            pos: number
        ): void {
            // The subsequent funnel shape modification will be done in this func.
            // We don’t need to concern anput direction when we use this function to set points.
            if (dynamicHeight) {
                return setDyHeightPiecePoints(index, idx, pieceHeight, pos);
            }
            else if (showRate) {
                return setRatePiecePoint(index, idx, nextIdx, pieceHeight, pos);
            }
            const start = getLinePoints(pos, getItemSize(idx));
            const nIdx = index === indices.length - 1 && exitWidth === 100 ? idx : nextIdx;
            const end = getLinePoints(pos + pieceHeight, getItemSize(nIdx));

            data.setItemLayout(idx, {
                points: start.concat(end.slice().reverse())
            });
        };

        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const nextIdx = indices[i + 1];
            const itemModel = data.getItemModel<FunnelDataItemOption>(idx);

            if (isHorizontal) {
                const width = getPieceHeight(itemModel.get(['itemStyle', 'width']), idx);
                setItemLayout(i, idx, nextIdx, width, x);
                x += width + gap;
            }
            else {
                const height = getPieceHeight(itemModel.get(['itemStyle', 'height']), idx);
                setItemLayout(i, idx, nextIdx, height, y);
                y += height + gap;
            }
        }

        labelLayout(data);
        if (showRate && !dynamicHeight) {
            rateLabelLayout(data);
        }
    });
}
