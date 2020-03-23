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
    __symbolOriginalScale: number[]
    __z2Origin: number
    highDownOnUpdate(fromState: DisplayState, toState: DisplayState): void
};

class Symbol extends graphic.Group {

    private _seriesModel: SeriesModel;

    private _symbolType: string;

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

        let color = data.getItemVisual(idx, 'color');

        // let symbolPath = createSymbol(
        //     symbolType, -0.5, -0.5, 1, 1, color
        // );
        // If width/height are set too small (e.g., set to 1) on ios10
        // and macOS Sierra, a circle stroke become a rect, no matter what
        // the scale is set. So we set width/height as 2. See #4150.
        let symbolPath = createSymbol(
            symbolType, -1, -1, 2, 2, color, keepAspect
        );

        symbolPath.attr({
            z2: 100,
            culling: true,
            scale: getScale(symbolSize)
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
        return this.childAt(0).scale;
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
        let symbolPath = this.childAt(0) as ECSymbol;
        symbolPath.zlevel = zlevel;
        symbolPath.z = z;
    }

    setDraggable(draggable: boolean) {
        let symbolPath = this.childAt(0) as ECSymbol;
        symbolPath.draggable = draggable;
        symbolPath.cursor = draggable ? 'move' : symbolPath.cursor;
    }

    /**
     * Update symbol properties
     */
    updateData(data: List, idx: number, seriesScope?: SymbolDrawSeriesScope) {
        this.silent = false;

        let symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        let seriesModel = data.hostModel as SeriesModel;
        let symbolSize = Symbol.getSymbolSize(data, idx);
        let isInit = symbolType !== this._symbolType;

        if (isInit) {
            let keepAspect = data.getItemVisual(idx, 'symbolKeepAspect');
            this._createSymbol(symbolType, data, idx, symbolSize, keepAspect);
        }
        else {
            const symbolPath = this.childAt(0) as ECSymbol;
            symbolPath.silent = false;
            graphic.updateProps(symbolPath, {
                scale: getScale(symbolSize)
            }, seriesModel, idx);
        }

        this._updateCommon(data, idx, symbolSize, seriesScope);

        if (isInit) {
            const symbolPath = this.childAt(0) as ECSymbol;
            let fadeIn = seriesScope && seriesScope.fadeIn;

            let target: PathProps = {
                scale: symbolPath.scale.slice()
            };
            fadeIn && (target.style = {
                opacity: symbolPath.style.opacity
            });

            symbolPath.scale = [0, 0];
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
        let symbolPath = this.childAt(0) as ECSymbol;
        let seriesModel = data.hostModel as SeriesModel;
        let color = data.getItemVisual(idx, 'color');

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
            let itemModel = (seriesScope && seriesScope.itemModel)
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

        let elStyle = symbolPath.style;

        symbolPath.attr('rotation', (symbolRotate || 0) * Math.PI / 180 || 0);

        if (symbolOffset) {
            symbolPath.attr('position', [
                parsePercent(symbolOffset[0], symbolSize[0]),
                parsePercent(symbolOffset[1], symbolSize[1])
            ]);
        }

        cursorStyle && symbolPath.attr('cursor', cursorStyle);

        // PENDING setColor before setStyle!!!
        symbolPath.setColor(color, seriesScope && seriesScope.symbolInnerColor);

        symbolPath.setStyle(itemStyle);

        let opacity = data.getItemVisual(idx, 'opacity');
        if (opacity != null) {
            elStyle.opacity = opacity;
        }

        let liftZ = data.getItemVisual(idx, 'liftZ');
        let z2Origin = symbolPath.__z2Origin;
        if (liftZ != null) {
            if (z2Origin == null) {
                symbolPath.__z2Origin = symbolPath.z2;
                symbolPath.z2 += liftZ;
            }
        }
        else if (z2Origin != null) {
            symbolPath.z2 = z2Origin;
            symbolPath.__z2Origin = null;
        }

        let useNameLabel = seriesScope && seriesScope.useNameLabel;

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

        symbolPath.__symbolOriginalScale = getScale(symbolSize);
        symbolPath.highDownOnUpdate = (
            hoverAnimation && seriesModel.isAnimationEnabled()
        ) ? highDownOnUpdate : null;

        graphic.enableHoverEmphasis(symbolPath, hoverItemStyle);
    }

    fadeOut(cb: () => void, opt?: {
        keepLabel: boolean
    }) {
        let symbolPath = this.childAt(0) as ECSymbol;
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
                scale: [0, 0]
            },
            this._seriesModel,
            graphic.getECData(this).dataIndex,
            cb
        );
    }

    static getSymbolSize(data: List, idx: number) {
        let symbolSize = data.getItemVisual(idx, 'symbolSize');
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

    if (toState === 'emphasis') {
        let scale = this.__symbolOriginalScale;
        let ratio = scale[1] / scale[0];
        let emphasisOpt = {
            scale: [
                Math.max(scale[0] * 1.1, scale[0] + 3),
                Math.max(scale[1] * 1.1, scale[1] + 3 * ratio)
            ]
        };
        // FIXME
        // modify it after support stop specified animation.
        // toState === fromState
        //     ? (this.stopAnimation(), this.attr(emphasisOpt))
        this.animateTo(emphasisOpt, 400, 'elasticOut');
    }
    else if (toState === 'normal') {
        this.animateTo({
            scale: this.__symbolOriginalScale
        }, 400, 'elasticOut');
    }
}

function getScale(symbolSize: number[]) {
    return [symbolSize[0] / 2, symbolSize[1] / 2];
}

function driftSymbol(this: ECSymbol, dx: number, dy: number) {
    this.parent.drift(dx, dy);
}


export default Symbol;