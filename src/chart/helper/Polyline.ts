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

import { each } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import { toggleHoverEmphasis } from '../../util/states';
import type { LineDrawSeriesScope, LineDrawModelOption } from './LineDraw';
import type SeriesData from '../../data/SeriesData';
import { BlurScope, DefaultEmphasisFocus } from '../../util/types';
import SeriesModel from '../../model/Series';
import { LineDataVisual } from '../../visual/commonVisualTypes';
import { ECSymbol } from '../../util/symbol';
import * as vector from 'zrender/src/core/vector';
import { VectorArray } from 'zrender/src/core/vector';
import {
    SYMBOL_CATEGORIES,
    LineECSymbol,
    LineList,
    createSymbol,
    makeSymbolTypeKey,
    makeSymbolTypeValue,
    updateSymbol
} from './lineSymbolHelper';

class Polyline extends graphic.Group {

    private _fromSymbolType: string;
    private _toSymbolType: string;

    constructor(lineData: SeriesData, idx: number, seriesScope: LineDrawSeriesScope) {
        super();
        this._createPolyline(lineData as SeriesData<SeriesModel, LineDataVisual>, idx, seriesScope);
    }

    private _createPolyline(
        lineData: SeriesData<SeriesModel, LineDataVisual>,
        idx: number,
        seriesScope: LineDrawSeriesScope) {
        // let seriesModel = lineData.hostModel;
        const points = lineData.getItemLayout(idx);

        const line = new graphic.Polyline({
            name: 'polyline',
            shape: {
                points: points
            }
        });

        this.add(line);

        each(SYMBOL_CATEGORIES, function (symbolCategory) {
            const symbol = createSymbol(symbolCategory, lineData, idx);
            // Symbols must added after line to make sure
            // it will be updated after line#update.
            // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
            this.add(symbol);
            this[makeSymbolTypeKey(symbolCategory)] = makeSymbolTypeValue(symbolCategory, lineData, idx);
        }, this);

        this._updateCommonStl(lineData, idx, seriesScope);
    };

    updateData(lineData: SeriesData, idx: number, seriesScope: LineDrawSeriesScope) {
        const seriesModel = lineData.hostModel;

        const line = this.childAt(0) as graphic.Polyline;
        const target = {
            shape: {
                points: lineData.getItemLayout(idx) as number[][]
            }
        };
        graphic.updateProps(line, target, seriesModel, idx);

        each(SYMBOL_CATEGORIES, function (symbolCategory) {
            const symbolType = makeSymbolTypeValue(symbolCategory, lineData as LineList, idx);
            const key = makeSymbolTypeKey(symbolCategory);
            // Symbol changed
            if (this[key] !== symbolType) {
                this.remove(this.childOfName(symbolCategory));
                const symbol = createSymbol(symbolCategory, lineData as LineList, idx);
                this.add(symbol);
            }
            this[key] = symbolType;
        }, this);

        this._updateCommonStl(lineData, idx, seriesScope);
    };

    _updateCommonStl(lineData: SeriesData, idx: number, seriesScope: LineDrawSeriesScope) {
        const line = this.childOfName('polyline') as graphic.Polyline;
        const itemModel = lineData.getItemModel<LineDrawModelOption>(idx);


        let emphasisLineStyle = seriesScope && seriesScope.emphasisLineStyle;
        let focus = (seriesScope && seriesScope.focus) as DefaultEmphasisFocus;
        let blurScope = (seriesScope && seriesScope.blurScope) as BlurScope;
        let emphasisDisabled = seriesScope && seriesScope.emphasisDisabled;


        if (!seriesScope || lineData.hasItemOption) {
            const emphasisModel = itemModel.getModel('emphasis');
            emphasisLineStyle = emphasisModel.getModel('lineStyle').getLineStyle();
            emphasisDisabled = emphasisModel.get('disabled');
            focus = emphasisModel.get('focus');
            blurScope = emphasisModel.get('blurScope');
        }
        const lineStyle = lineData.getItemVisual(idx, 'style');
        line.useStyle(lineStyle);
        line.style.fill = null;
        line.style.strokeNoScale = true;

        const lineEmphasisState = line.ensureState('emphasis');
        lineEmphasisState.style = emphasisLineStyle;

        updateSymbol.bind(this)(lineStyle, line);

        toggleHoverEmphasis(this, focus, blurScope, emphasisDisabled);
    };

    beforeUpdate() {
        const lineGroup = this;
        const symbolFrom = lineGroup.childOfName('fromSymbol') as ECSymbol;
        const symbolTo = lineGroup.childOfName('toSymbol') as ECSymbol;

        if (!symbolFrom && !symbolTo) {
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

        const polyline = lineGroup.childOfName('polyline') as graphic.Polyline;
        // If line wasn't changed
        if (!this.__dirty && !polyline.__dirty) {
            return;
        }

        const points = polyline.shape.points;
        function setSymbolRotation(symbol: ECSymbol, percent: 0 | 1) {
            const specifiedRotation = (symbol as LineECSymbol).__specifiedRotation;
            if (specifiedRotation == null) {
                const d = points.length;
                if (d < 2) {
                    return;
                }

                let tangent = [0, 0];
                let p1: VectorArray;
                let p2: VectorArray;

                if (percent === 0) {
                    p1 = points[0];
                    p2 = points[1];
                }
                else {
                    p1 = points[d - 2];
                    p2 = points[d - 1];
                }

                const p = [ p2[0] - p1[0], p2[1] - p1[1] ];
                tangent = vector.normalize(p, p);
                symbol.attr('rotation', (percent === 1 ? -1 : 1) * Math.PI / 2 - Math.atan2(
                    tangent[1], tangent[0]
                ));
            }
            else {
                symbol.attr('rotation', specifiedRotation);
            }
        }

        const percent = polyline.shape.percent;
        const fromPos = points[0];
        if (symbolFrom) {
            symbolFrom.setPosition(fromPos);
            setSymbolRotation(symbolFrom, 0);
            symbolFrom.scaleX = symbolFrom.scaleY = invScale * percent;
            symbolFrom.markRedraw();
        }

        const toPos = points[polyline.shape.points.length - 1];
        if (symbolTo) {
            symbolTo.setPosition(toPos);
            setSymbolRotation(symbolTo, 1);
            symbolTo.scaleX = symbolTo.scaleY = invScale * percent;
            symbolTo.markRedraw();
        }
    }

    updateLayout(lineData: SeriesData, idx: number) {
        const polyline = this.childAt(0) as graphic.Polyline;
        polyline.setShape('points', lineData.getItemLayout(idx));
    };

}

export default Polyline;