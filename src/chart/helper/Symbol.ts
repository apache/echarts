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
import {createSymbol} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import {parsePercent} from '../../util/number';
import {getDefaultLabel} from './labelHelper';
import List from '../../data/List';
import { DisplayState } from '../../util/types';
import SeriesModel from '../../model/Series';
import { PathProps } from 'zrender/src/graphic/Path';
import { SymbolDrawSeriesScope, SymbolDrawItemModelOption } from './SymbolDraw';

// Update common properties
const normalStyleAccessPath = ['itemStyle'] as const;
const emphasisStyleAccessPath = ['emphasis', 'itemStyle'] as const;
const normalLabelAccessPath = ['label'] as const;
const emphasisLabelAccessPath = ['emphasis', 'label'] as const;

type ECSymbol = ReturnType<typeof createSymbol> & {
    highDownOnUpdate(fromState: DisplayState, toState: DisplayState): void
};

class Symbol extends graphic.Group {

    private _seriesModel: SeriesModel;

    private _symbolType: string;

    /**
     * Original scale
     */
    private _scaleX: number;
    private _scaleY: number;

    private _z2: number;

    constructor(data: List, idx: number, seriesScope?: SymbolDrawSeriesScope) {
        super();
        this.updateData(data, idx, seriesScope);
    }

    _createSymbol(
        symbolType: string,
        data: List,
        idx: number,
        symbolSize: number[],
        keepAspect: boolean
    ) {
        // Remove paths created before
        this.removeAll();

        const color = data.getItemVisual(idx, 'color');

        // let symbolPath = createSymbol(
        //     symbolType, -0.5, -0.5, 1, 1, color
        // );
        // If width/height are set too small (e.g., set to 1) on ios10
        // and macOS Sierra, a circle stroke become a rect, no matter what
        // the scale is set. So we set width/height as 2. See #4150.
        const symbolPath = createSymbol(
            symbolType, -1, -1, 2, 2, color, keepAspect
        );

        symbolPath.attr({
            z2: 100,
            culling: true,
            scaleX: symbolSize[0] / 2,
            scaleY: symbolSize[1] / 2
        });
        // Rewrite drift method
        symbolPath.drift = driftSymbol;

        this._symbolType = symbolType;

        this.add(symbolPath);
    }

    /**
     * Stop animation
     * @param {boolean} toLastFrame
     */
    stopSymbolAnimation(toLastFrame: boolean) {
        this.childAt(0).stopAnimation(toLastFrame);
    }

    /**
     * FIXME:
     * Caution: This method breaks the encapsulation of this module,
     * but it indeed brings convenience. So do not use the method
     * unless you detailedly know all the implements of `Symbol`,
     * especially animation.
     *
     * Get symbol path element.
     */
    getSymbolPath() {
        return this.childAt(0) as ECSymbol;
    }

    /**
     * Get scale(aka, current symbol size).
     * Including the change caused by animation
     */
    getScale() {
        const symbolPath = this.childAt(0);
        return [symbolPath.scaleX, symbolPath.scaleY];
    }

    getOriginalScale() {
        return [this._scaleX, this._scaleY];
    }

    /**
     * Highlight symbol
     */
    highlight() {
        this.childAt(0).trigger('emphasis');
    }

    /**
     * Downplay symbol
     */
    downplay() {
        this.childAt(0).trigger('normal');
    }

    /**
     * @param {number} zlevel
     * @param {number} z
     */
    setZ(zlevel: number, z: number) {
        const symbolPath = this.childAt(0) as ECSymbol;
        symbolPath.zlevel = zlevel;
        symbolPath.z = z;
    }

    setDraggable(draggable: boolean) {
        const symbolPath = this.childAt(0) as ECSymbol;
        symbolPath.draggable = draggable;
        symbolPath.cursor = draggable ? 'move' : symbolPath.cursor;
    }

    /**
     * Update symbol properties
     */
    updateData(data: List, idx: number, seriesScope?: SymbolDrawSeriesScope) {
        this.silent = false;

        const symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        const seriesModel = data.hostModel as SeriesModel;
        const symbolSize = Symbol.getSymbolSize(data, idx);
        const isInit = symbolType !== this._symbolType;

        if (isInit) {
            const keepAspect = data.getItemVisual(idx, 'symbolKeepAspect');
            this._createSymbol(symbolType, data, idx, symbolSize, keepAspect);
        }
        else {
            const symbolPath = this.childAt(0) as ECSymbol;
            symbolPath.silent = false;
            graphic.updateProps(symbolPath, {
                scaleX: symbolSize[0] / 2,
                scaleY: symbolSize[1] / 2
            }, seriesModel, idx);
        }

        this._updateCommon(data, idx, symbolSize, seriesScope);

        if (isInit) {
            const symbolPath = this.childAt(0) as ECSymbol;
            const fadeIn = seriesScope && seriesScope.fadeIn;

            const target: PathProps = {
                scaleX: symbolPath.scaleX,
                scaleY: symbolPath.scaleY
            };
            fadeIn && (target.style = {
                opacity: symbolPath.style.opacity
            });

            symbolPath.scaleX = symbolPath.scaleY = 0;
            fadeIn && (symbolPath.style.opacity = 0);

            graphic.initProps(symbolPath, target, seriesModel, idx);
        }

        this._seriesModel = seriesModel;
    }

    _updateCommon(
        data: List,
        idx: number,
        symbolSize: number[],
        seriesScope?: SymbolDrawSeriesScope
    ) {
        const symbolPath = this.childAt(0) as ECSymbol;
        const seriesModel = data.hostModel as SeriesModel;
        const color = data.getItemVisual(idx, 'color');

        // Reset style
        if (symbolPath.type !== 'image') {
            symbolPath.useStyle({
                strokeNoScale: true
            });
        }
        else {
            symbolPath.setStyle({
                opacity: null,
                shadowBlur: null,
                shadowOffsetX: null,
                shadowOffsetY: null,
                shadowColor: null
            });
        }

        let itemStyle = seriesScope && seriesScope.itemStyle;
        let hoverItemStyle = seriesScope && seriesScope.hoverItemStyle;
        let symbolRotate = seriesScope && seriesScope.symbolRotate;
        let symbolOffset = seriesScope && seriesScope.symbolOffset;
        let labelModel = seriesScope && seriesScope.labelModel;
        let hoverLabelModel = seriesScope && seriesScope.hoverLabelModel;
        let hoverAnimation = seriesScope && seriesScope.hoverAnimation;
        let cursorStyle = seriesScope && seriesScope.cursorStyle;

        if (!seriesScope || data.hasItemOption) {
            const itemModel = (seriesScope && seriesScope.itemModel)
                ? seriesScope.itemModel : data.getItemModel<SymbolDrawItemModelOption>(idx);

            // Color must be excluded.
            // Because symbol provide setColor individually to set fill and stroke
            itemStyle = itemModel.getModel(normalStyleAccessPath).getItemStyle(['color']);
            hoverItemStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

            symbolRotate = itemModel.getShallow('symbolRotate');
            symbolOffset = itemModel.getShallow('symbolOffset');

            labelModel = itemModel.getModel(normalLabelAccessPath);
            hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);
            hoverAnimation = itemModel.getShallow('hoverAnimation');
            cursorStyle = itemModel.getShallow('cursor');
        }
        else {
            hoverItemStyle = zrUtil.extend({}, hoverItemStyle);
        }

        const elStyle = symbolPath.style;

        symbolPath.attr('rotation', (symbolRotate || 0) * Math.PI / 180 || 0);

        if (symbolOffset) {
            symbolPath.x = parsePercent(symbolOffset[0], symbolSize[0]);
            symbolPath.y = parsePercent(symbolOffset[1], symbolSize[1]);
        }

        cursorStyle && symbolPath.attr('cursor', cursorStyle);

        // PENDING setColor before setStyle!!!
        symbolPath.setColor(color, seriesScope && seriesScope.symbolInnerColor);

        symbolPath.setStyle(itemStyle);

        const opacity = data.getItemVisual(idx, 'opacity');
        if (opacity != null) {
            elStyle.opacity = opacity;
        }

        const liftZ = data.getItemVisual(idx, 'liftZ');
        const z2Origin = this._z2;
        if (liftZ != null) {
            if (z2Origin == null) {
                this._z2 = symbolPath.z2;
                symbolPath.z2 += liftZ;
            }
        }
        else if (z2Origin != null) {
            symbolPath.z2 = z2Origin;
            this._z2 = null;
        }

        const useNameLabel = seriesScope && seriesScope.useNameLabel;

        graphic.setLabelStyle(
            symbolPath, labelModel, hoverLabelModel,
            {
                labelFetcher: seriesModel,
                labelDataIndex: idx,
                defaultText: getLabelDefaultText,
                autoColor: color
            }
        );

        // Do not execute util needed.
        function getLabelDefaultText(idx: number) {
            return useNameLabel ? data.getName(idx) : getDefaultLabel(data, idx);
        }

        this._scaleX = symbolSize[0] / 2;
        this._scaleY = symbolSize[1] / 2;
        symbolPath.highDownOnUpdate = (
            hoverAnimation && seriesModel.isAnimationEnabled()
        ) ? highDownOnUpdate : null;

        graphic.enableHoverEmphasis(symbolPath, hoverItemStyle);
    }

    fadeOut(cb: () => void, opt?: {
        keepLabel: boolean
    }) {
        const symbolPath = this.childAt(0) as ECSymbol;
        // Avoid mistaken hover when fading out
        this.silent = symbolPath.silent = true;
        // Not show text when animating
        !(opt && opt.keepLabel) && (symbolPath.removeTextContent());

        graphic.updateProps(
            symbolPath,
            {
                style: {
                    opacity: 0
                },
                scaleX: 0,
                scaleY: 0
            },
            this._seriesModel,
            graphic.getECData(this).dataIndex,
            cb
        );
    }

    static getSymbolSize(data: List, idx: number) {
        const symbolSize = data.getItemVisual(idx, 'symbolSize');
        return symbolSize instanceof Array
            ? symbolSize.slice()
            : [+symbolSize, +symbolSize];
    }
}

function highDownOnUpdate(this: ECSymbol, fromState: DisplayState, toState: DisplayState) {
    // Do not support this hover animation util some scenario required.
    // Animation can only be supported in hover layer when using `el.incremetal`.
    if (this.incremental || this.useHoverLayer) {
        return;
    }

    const scale = (this.parent as Symbol).getOriginalScale();
    if (toState === 'emphasis') {
        const ratio = scale[1] / scale[0];
        const emphasisOpt = {
            x: Math.max(scale[0] * 1.1, scale[0] + 3),
            y: Math.max(scale[1] * 1.1, scale[1] + 3 * ratio)
        };
        // FIXME
        // modify it after support stop specified animation.
        // toState === fromState
        //     ? (this.stopAnimation(), this.attr(emphasisOpt))
        this.animateTo(emphasisOpt, { duration: 400, easing: 'elasticOut' });
    }
    else if (toState === 'normal') {
        this.animateTo({
            scaleX: scale[0],
            scaleY: scale[1]
        }, { duration: 400, easing: 'elasticOut' });
    }
}

function driftSymbol(this: ECSymbol, dx: number, dy: number) {
    this.parent.drift(dx, dy);
}


export default Symbol;