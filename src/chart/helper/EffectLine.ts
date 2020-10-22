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

/**
 * Provide effect for line
 */

import * as graphic from '../../util/graphic';
import Line from './Line';
import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as vec2 from 'zrender/src/core/vector';
import * as curveUtil from 'zrender/src/core/curve';
import type List from '../../data/List';
import { LineDrawSeriesScope, LineDrawModelOption } from './LineDraw';
import Model from '../../model/Model';
import { ColorString } from '../../util/types';

export type ECSymbolOnEffectLine = ReturnType<typeof createSymbol> & {
    __t: number
    __lastT: number
    __p1: number[]
    __p2: number[]
    __cp1: number[]
};
class EffectLine extends graphic.Group {

    private _symbolType: string;

    private _period: number;

    private _loop: boolean;

    private _symbolScale: number[];

    constructor(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        super();
        this.add(this.createLine(lineData, idx, seriesScope));

        this._updateEffectSymbol(lineData, idx);
    }

    createLine(lineData: List, idx: number, seriesScope: LineDrawSeriesScope): graphic.Group {
        return new Line(lineData, idx, seriesScope);
    }

    private _updateEffectSymbol(lineData: List, idx: number) {
        const itemModel = lineData.getItemModel<LineDrawModelOption>(idx);
        const effectModel = itemModel.getModel('effect');
        let size = effectModel.get('symbolSize');
        const symbolType = effectModel.get('symbol');
        if (!zrUtil.isArray(size)) {
            size = [size, size];
        }

        const lineStyle = lineData.getItemVisual(idx, 'style');
        const color = effectModel.get('color') || (lineStyle && lineStyle.stroke);
        let symbol = this.childAt(1) as ECSymbolOnEffectLine;

        if (this._symbolType !== symbolType) {
            // Remove previous
            this.remove(symbol);

            symbol = createSymbol(
                symbolType, -0.5, -0.5, 1, 1, color
            ) as ECSymbolOnEffectLine;
            symbol.z2 = 100;
            symbol.culling = true;

            this.add(symbol);
        }

        // Symbol may be removed if loop is false
        if (!symbol) {
            return;
        }

        // Shadow color is same with color in default
        symbol.setStyle('shadowColor', color as ColorString);
        symbol.setStyle(effectModel.getItemStyle(['color']));

        symbol.scaleX = size[0];
        symbol.scaleY = size[1];

        symbol.setColor(color);

        this._symbolType = symbolType;
        this._symbolScale = size;

        this._updateEffectAnimation(lineData, effectModel, idx);
    }

    private _updateEffectAnimation(
        lineData: List,
        effectModel: Model<LineDrawModelOption['effect']>,
        idx: number
    ) {

        const symbol = this.childAt(1) as ECSymbolOnEffectLine;
        if (!symbol) {
            return;
        }

        const self = this;

        const points = lineData.getItemLayout(idx);

        let period = effectModel.get('period') * 1000;
        const loop = effectModel.get('loop');
        const constantSpeed = effectModel.get('constantSpeed');
        const delayExpr = zrUtil.retrieve(effectModel.get('delay'), function (idx) {
            return idx / lineData.count() * period / 3;
        });

        // Ignore when updating
        symbol.ignore = true;

        this._updateAnimationPoints(symbol, points);

        if (constantSpeed > 0) {
            period = this._getLineLength(symbol) / constantSpeed * 1000;
        }

        if (period !== this._period || loop !== this._loop) {

            symbol.stopAnimation();

            if (period > 0) {
                let delayNum: number;
                if (typeof delayExpr === 'function') {
                    delayNum = delayExpr(idx);
                }
                else {
                    delayNum = delayExpr;
                }
                if (symbol.__t > 0) {
                    delayNum = -period * symbol.__t;
                }
                symbol.__t = 0;
                const animator = symbol.animate('', loop)
                    .when(period, {
                        __t: 1
                    })
                    .delay(delayNum)
                    .during(function () {
                        self._updateSymbolPosition(symbol);
                    });
                if (!loop) {
                    animator.done(function () {
                        self.remove(symbol);
                    });
                }
                animator.start();
            }
        }

        this._period = period;
        this._loop = loop;
    }

    protected _getLineLength(symbol: ECSymbolOnEffectLine) {
        // Not so accurate
        return (vec2.dist(symbol.__p1, symbol.__cp1)
            + vec2.dist(symbol.__cp1, symbol.__p2));
    }

    protected _updateAnimationPoints(symbol: ECSymbolOnEffectLine, points: number[][]) {
        symbol.__p1 = points[0];
        symbol.__p2 = points[1];
        symbol.__cp1 = points[2] || [
            (points[0][0] + points[1][0]) / 2,
            (points[0][1] + points[1][1]) / 2
        ];
    }

    updateData(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        (this.childAt(0) as Line).updateData(lineData, idx, seriesScope);
        this._updateEffectSymbol(lineData, idx);
    }

    protected _updateSymbolPosition(symbol: ECSymbolOnEffectLine) {
        const p1 = symbol.__p1;
        const p2 = symbol.__p2;
        const cp1 = symbol.__cp1;
        const t = symbol.__t;
        const pos = [symbol.x, symbol.y];
        const lastPos = pos.slice();
        const quadraticAt = curveUtil.quadraticAt;
        const quadraticDerivativeAt = curveUtil.quadraticDerivativeAt;
        pos[0] = quadraticAt(p1[0], cp1[0], p2[0], t);
        pos[1] = quadraticAt(p1[1], cp1[1], p2[1], t);

        // Tangent
        const tx = quadraticDerivativeAt(p1[0], cp1[0], p2[0], t);
        const ty = quadraticDerivativeAt(p1[1], cp1[1], p2[1], t);

        symbol.rotation = -Math.atan2(ty, tx) - Math.PI / 2;
        // enable continuity trail for 'line', 'rect', 'roundRect' symbolType
        if (this._symbolType === 'line' || this._symbolType === 'rect' || this._symbolType === 'roundRect') {
            if (symbol.__lastT !== undefined && symbol.__lastT < symbol.__t) {
                symbol.scaleY = vec2.dist(lastPos, pos) * 1.05;
                // make sure the last segment render within endPoint
                if (t === 1) {
                    pos[0] = lastPos[0] + (pos[0] - lastPos[0]) / 2;
                    pos[1] = lastPos[1] + (pos[1] - lastPos[1]) / 2;
                }
            }
            else if (symbol.__lastT === 1) {
                // After first loop, symbol.__t does NOT start with 0, so connect p1 to pos directly.
                symbol.scaleY = 2 * vec2.dist(p1, pos);
            }
            else {
                symbol.scaleY = this._symbolScale[1];
            }
        }
        symbol.__lastT = symbol.__t;
        symbol.ignore = false;
        symbol.x = pos[0];
        symbol.y = pos[1];
    }


    updateLayout(lineData: List, idx: number) {
        (this.childAt(0) as Line).updateLayout(lineData, idx);

        const effectModel = lineData.getItemModel<LineDrawModelOption>(idx).getModel('effect');
        this._updateEffectAnimation(lineData, effectModel, idx);
    }
}
export default EffectLine;