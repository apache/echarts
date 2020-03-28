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

import * as zrUtil from 'zrender/src/core/util';
import * as vector from 'zrender/src/core/vector';
import * as symbolUtil from '../../util/symbol';
import ECLinePath from './LinePath';
import * as graphic from '../../util/graphic';
import {round} from '../../util/number';
import List from '../../data/List';
import { ZRTextAlign, ZRTextVerticalAlign, LineLabelOption } from '../../util/types';
import SeriesModel from '../../model/Series';
import type { LineDrawSeriesScope, LineDrawModelOption } from './LineDraw';
import { RichTextStyleProps } from 'zrender/src/graphic/RichText';

const SYMBOL_CATEGORIES = ['fromSymbol', 'toSymbol'] as const;

type ECSymbol = ReturnType<typeof createSymbol>;

export interface LineLabel extends graphic.Text {
    lineLabelOriginalOpacity: number
}

interface InnerLineLabel extends LineLabel {
    __align: RichTextStyleProps['align']
    __verticalAlign: RichTextStyleProps['verticalAlign']
    __position: LineLabelOption['position']
    __labelDistance: number[]
}

function makeSymbolTypeKey(symbolCategory: string) {
    return '_' + symbolCategory + 'Type' as '_fromSymbolType' | '_toSymbolType';
}

/**
 * @inner
 */
function createSymbol(name: string, lineData: List, idx: number) {
    const color = lineData.getItemVisual(idx, 'color');
    const symbolType = lineData.getItemVisual(idx, name);
    let symbolSize = lineData.getItemVisual(idx, name + 'Size');

    if (!symbolType || symbolType === 'none') {
        return;
    }

    if (!zrUtil.isArray(symbolSize)) {
        symbolSize = [symbolSize, symbolSize];
    }
    const symbolPath = symbolUtil.createSymbol(
        symbolType, -symbolSize[0] / 2, -symbolSize[1] / 2,
        symbolSize[0], symbolSize[1], color
    );

    symbolPath.name = name;

    return symbolPath;
}

function createLine(points: number[][]) {
    const line = new ECLinePath({
        name: 'line',
        subPixelOptimize: true
    });
    setLinePoints(line.shape, points);
    return line;
}

function setLinePoints(targetShape: ECLinePath['shape'], points: number[][]) {
    type CurveShape = ECLinePath['shape'] & {
        cpx1: number
        cpy1: number
    };

    targetShape.x1 = points[0][0];
    targetShape.y1 = points[0][1];
    targetShape.x2 = points[1][0];
    targetShape.y2 = points[1][1];
    targetShape.percent = 1;

    const cp1 = points[2];
    if (cp1) {
        (targetShape as CurveShape).cpx1 = cp1[0];
        (targetShape as CurveShape).cpy1 = cp1[1];
    }
    else {
        (targetShape as CurveShape).cpx1 = NaN;
        (targetShape as CurveShape).cpy1 = NaN;
    }
}


class Line extends graphic.Group {

    private _fromSymbolType: string;
    private _toSymbolType: string;

    constructor(lineData: List, idx: number, seriesScope?: LineDrawSeriesScope) {
        super();
        this._createLine(lineData, idx, seriesScope);
    }

    _createLine(lineData: List, idx: number, seriesScope?: LineDrawSeriesScope) {
        const seriesModel = lineData.hostModel;
        const linePoints = lineData.getItemLayout(idx);
        const line = createLine(linePoints);
        line.shape.percent = 0;
        graphic.initProps(line, {
            shape: {
                percent: 1
            }
        }, seriesModel, idx);

        this.add(line);

        const label = new graphic.Text({
            name: 'label'
        }) as InnerLineLabel;
        // FIXME
        // Temporary solution for `focusNodeAdjacency`.
        // line label do not use the opacity of lineStyle.
        label.lineLabelOriginalOpacity = 1;
        this.add(label);

        zrUtil.each(SYMBOL_CATEGORIES, function (symbolCategory) {
            const symbol = createSymbol(symbolCategory, lineData, idx);
            // symbols must added after line to make sure
            // it will be updated after line#update.
            // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
            this.add(symbol);
            this[makeSymbolTypeKey(symbolCategory)] = lineData.getItemVisual(idx, symbolCategory);
        }, this);

        this._updateCommonStl(lineData, idx, seriesScope);
    }

    updateData(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        const seriesModel = lineData.hostModel;

        const line = this.childOfName('line') as ECLinePath;
        const linePoints = lineData.getItemLayout(idx);
        const target = {
            shape: {} as ECLinePath['shape']
        };

        setLinePoints(target.shape, linePoints);
        graphic.updateProps(line, target, seriesModel, idx);

        zrUtil.each(SYMBOL_CATEGORIES, function (symbolCategory) {
            const symbolType = lineData.getItemVisual(idx, symbolCategory);
            const key = makeSymbolTypeKey(symbolCategory);
            // Symbol changed
            if (this[key] !== symbolType) {
                this.remove(this.childOfName(symbolCategory));
                const symbol = createSymbol(symbolCategory, lineData, idx);
                this.add(symbol);
            }
            this[key] = symbolType;
        }, this);

        this._updateCommonStl(lineData, idx, seriesScope);
    };

    _updateCommonStl(lineData: List, idx: number, seriesScope?: LineDrawSeriesScope) {
        const seriesModel = lineData.hostModel as SeriesModel;

        const line = this.childOfName('line') as ECLinePath;

        let lineStyle = seriesScope && seriesScope.lineStyle;
        let hoverLineStyle = seriesScope && seriesScope.hoverLineStyle;
        let labelModel = seriesScope && seriesScope.labelModel;
        let hoverLabelModel = seriesScope && seriesScope.hoverLabelModel;

        // Optimization for large dataset
        if (!seriesScope || lineData.hasItemOption) {
            const itemModel = lineData.getItemModel<LineDrawModelOption>(idx);

            lineStyle = itemModel.getModel('lineStyle').getLineStyle();
            hoverLineStyle = itemModel.getModel(['emphasis', 'lineStyle']).getLineStyle();

            labelModel = itemModel.getModel('label');
            hoverLabelModel = itemModel.getModel(['emphasis', 'label']);
        }

        const visualColor = lineData.getItemVisual(idx, 'color');
        const visualOpacity = zrUtil.retrieve3(
            lineData.getItemVisual(idx, 'opacity'),
            lineStyle.opacity,
            1
        );

        line.useStyle(zrUtil.defaults(
            {
                strokeNoScale: true,
                fill: 'none',
                stroke: visualColor,
                opacity: visualOpacity
            },
            lineStyle
        ));
        const lineEmphasisState = line.ensureState('emphasis');
        lineEmphasisState.style = hoverLineStyle;

        // Update symbol
        zrUtil.each(SYMBOL_CATEGORIES, function (symbolCategory) {
            const symbol = this.childOfName(symbolCategory) as ECSymbol;
            if (symbol) {
                symbol.setColor(visualColor);
                symbol.setStyle({
                    opacity: visualOpacity
                });
            }
        }, this);

        const showLabel = labelModel.getShallow('show');
        const hoverShowLabel = hoverLabelModel.getShallow('show');

        const label = this.childOfName('label') as InnerLineLabel;
        let defaultLabelColor;
        let baseText;

        // FIXME: the logic below probably should be merged to `graphic.setLabelStyle`.
        if (showLabel || hoverShowLabel) {
            defaultLabelColor = visualColor || '#000';

            baseText = seriesModel.getFormattedLabel(idx, 'normal', lineData.dataType);
            if (baseText == null) {
                const rawVal = seriesModel.getRawValue(idx) as number;
                baseText = rawVal == null
                    ? lineData.getName(idx)
                    : isFinite(rawVal)
                    ? round(rawVal)
                    : rawVal;
            }
        }
        const normalText = showLabel ? baseText : null;
        const emphasisText = hoverShowLabel
            ? zrUtil.retrieve2(
                seriesModel.getFormattedLabel(idx, 'emphasis', lineData.dataType),
                baseText
            )
            : null;

        // Always set `textStyle` even if `normalStyle.text` is null, because default
        // values have to be set on `normalStyle`.
        if (normalText != null || emphasisText != null) {
            label.useStyle(graphic.createTextStyle(labelModel, {
                text: normalText as string
            }, {
                autoColor: defaultLabelColor
            }));

            label.__align = label.style.align;
            label.__verticalAlign = label.style.verticalAlign;
            // 'start', 'middle', 'end'
            label.__position = labelModel.get('position') || 'middle';

            let distance = labelModel.get('distance');
            if (!zrUtil.isArray(distance)) {
                distance = [distance, distance];
            }
            label.__labelDistance = distance;
        }

        const emphasisState = label.ensureState('emphasis');
        if (emphasisText != null) {
            emphasisState.ignore = false;
            // Only these properties supported in this emphasis style here.
            emphasisState.style = {
                text: emphasisText as string,
                textFill: hoverLabelModel.getTextColor(true),
                // For merging hover style to normal style, do not use
                // `hoverLabelModel.getFont()` here.
                fontStyle: hoverLabelModel.getShallow('fontStyle'),
                fontWeight: hoverLabelModel.getShallow('fontWeight'),
                fontSize: hoverLabelModel.getShallow('fontSize'),
                fontFamily: hoverLabelModel.getShallow('fontFamily')
            };
        }
        else {
            emphasisState.ignore = true;
        }

        label.ignore = !showLabel && !hoverShowLabel;

        graphic.enableHoverEmphasis(this);
    }

    highlight() {
        this.trigger('emphasis');
    }

    downplay() {
        this.trigger('normal');
    }

    updateLayout(lineData: List, idx: number) {
        this.setLinePoints(lineData.getItemLayout(idx));
    }

    setLinePoints(points: number[][]) {
        const linePath = this.childOfName('line') as ECLinePath;
        setLinePoints(linePath.shape, points);
        linePath.dirty();
    }

    beforeUpdate() {
        const lineGroup = this;
        const symbolFrom = lineGroup.childOfName('fromSymbol') as ECSymbol;
        const symbolTo = lineGroup.childOfName('toSymbol') as ECSymbol;
        const label = lineGroup.childOfName('label') as InnerLineLabel;
        // Quick reject
        if (!symbolFrom && !symbolTo && label.ignore) {
            return;
        }

        let invScale = 1;
        let parentNode = this.parent;
        while (parentNode) {
            if (parentNode.scaleX) {
                invScale /= parentNode.scaleX;
            }
            parentNode = parentNode.parent;
        }

        const line = lineGroup.childOfName('line') as ECLinePath;
        // If line not changed
        // FIXME Parent scale changed
        if (!this.__dirty && !line.__dirty) {
            return;
        }

        const percent = line.shape.percent;
        const fromPos = line.pointAt(0);
        const toPos = line.pointAt(percent);

        const d = vector.sub([], toPos, fromPos);
        vector.normalize(d, d);

        if (symbolFrom) {
            symbolFrom.setPosition(fromPos);
            const tangent = line.tangentAt(0);
            symbolFrom.rotation = Math.PI / 2 - Math.atan2(
                tangent[1], tangent[0]
            );
            symbolFrom.scaleX = symbolFrom.scaleY = invScale * percent;
            symbolFrom.markRedraw();
        }
        if (symbolTo) {
            symbolTo.setPosition(toPos);
            const tangent = line.tangentAt(1);
            symbolTo.rotation = -Math.PI / 2 - Math.atan2(
                tangent[1], tangent[0]
            );
            symbolTo.scaleX = symbolTo.scaleY = invScale * percent;
            symbolTo.markRedraw();
        }

        if (!label.ignore) {
            label.x = label.y = 0;
            label.originX = label.originY = 0;

            let textAlign: ZRTextAlign;
            let textVerticalAlign: ZRTextVerticalAlign;

            const distance = label.__labelDistance;
            const distanceX = distance[0] * invScale;
            const distanceY = distance[1] * invScale;
            const halfPercent = percent / 2;
            const tangent = line.tangentAt(halfPercent);
            const n = [tangent[1], -tangent[0]];
            const cp = line.pointAt(halfPercent);
            if (n[1] > 0) {
                n[0] = -n[0];
                n[1] = -n[1];
            }
            const dir = tangent[0] < 0 ? -1 : 1;

            if (label.__position !== 'start' && label.__position !== 'end') {
                let rotation = -Math.atan2(tangent[1], tangent[0]);
                if (toPos[0] < fromPos[0]) {
                    rotation = Math.PI + rotation;
                }
                label.rotation = rotation;
            }

            let dy;
            switch (label.__position) {
                case 'insideStartTop':
                case 'insideMiddleTop':
                case 'insideEndTop':
                case 'middle':
                    dy = -distanceY;
                    textVerticalAlign = 'bottom';
                    break;

                case 'insideStartBottom':
                case 'insideMiddleBottom':
                case 'insideEndBottom':
                    dy = distanceY;
                    textVerticalAlign = 'top';
                    break;

                default:
                    dy = 0;
                    textVerticalAlign = 'middle';
            }

            switch (label.__position) {
                case 'end':
                    label.x = d[0] * distanceX + toPos[0];
                    label.y = d[1] * distanceY + toPos[1];
                    textAlign = d[0] > 0.8 ? 'left' : (d[0] < -0.8 ? 'right' : 'center');
                    textVerticalAlign = d[1] > 0.8 ? 'top' : (d[1] < -0.8 ? 'bottom' : 'middle');
                    break;

                case 'start':
                    label.x = -d[0] * distanceX + fromPos[0];
                    label.y = -d[1] * distanceY + fromPos[1];
                    textAlign = d[0] > 0.8 ? 'right' : (d[0] < -0.8 ? 'left' : 'center');
                    textVerticalAlign = d[1] > 0.8 ? 'bottom' : (d[1] < -0.8 ? 'top' : 'middle');
                    break;

                case 'insideStartTop':
                case 'insideStart':
                case 'insideStartBottom':
                    label.x = distanceX * dir + fromPos[0];
                    label.y = fromPos[1] + dy;
                    textAlign = tangent[0] < 0 ? 'right' : 'left';
                    label.originX = -distanceX * dir;
                    label.originY = -dy;
                    break;

                case 'insideMiddleTop':
                case 'insideMiddle':
                case 'insideMiddleBottom':
                case 'middle':
                    label.x = cp[0];
                    label.y = cp[1] + dy;
                    textAlign = 'center';
                    label.originY = -dy;
                    break;

                case 'insideEndTop':
                case 'insideEnd':
                case 'insideEndBottom':
                    label.x = -distanceX * dir + toPos[0];
                    label.y = toPos[1] + dy;
                    textAlign = tangent[0] >= 0 ? 'right' : 'left';
                    label.originX = distanceX * dir;
                    label.originY = -dy;
                    break;
            }

            label.scaleX = label.scaleY = invScale;
            label.setStyle({
                // Use the user specified text align and baseline first
                verticalAlign: label.__verticalAlign || textVerticalAlign,
                align: label.__align || textAlign
            });
        }
    }
}

export default Line;