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

import {createSymbol, normalizeSymbolOffset, normalizeSymbolSize} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import {getECData} from '../../util/innerStore';
import { enterEmphasis, leaveEmphasis, toggleHoverEmphasis } from '../../util/states';
import {getDefaultLabel} from './labelHelper';
import SeriesData from '../../data/SeriesData';
import { ColorString, BlurScope, AnimationOption, ZRColor, AnimationOptionMixin } from '../../util/types';
import SeriesModel from '../../model/Series';
import { PathProps } from 'zrender/src/graphic/Path';
import { SymbolDrawSeriesScope, SymbolDrawItemModelOption } from './SymbolDraw';
import { extend } from 'zrender/src/core/util';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import ZRImage from 'zrender/src/graphic/Image';
import { saveOldStyle } from '../../animation/basicTransition';
import Model from '../../model/Model';

type ECSymbol = ReturnType<typeof createSymbol>;

interface SymbolOpts {
    disableAnimation?: boolean

    useNameLabel?: boolean
    symbolInnerColor?: ZRColor
}

class Symbol extends graphic.Group {

    private _symbolType: string;

    /**
     * Original scale
     */
    private _sizeX: number;
    private _sizeY: number;

    private _z2: number;

    constructor(data: SeriesData, idx: number, seriesScope?: SymbolDrawSeriesScope, opts?: SymbolOpts) {
        super();
        this.updateData(data, idx, seriesScope, opts);
    }

    _createSymbol(
        symbolType: string,
        data: SeriesData,
        idx: number,
        symbolSize: number[],
        keepAspect: boolean
    ) {
        // Remove paths created before
        this.removeAll();

        // let symbolPath = createSymbol(
        //     symbolType, -0.5, -0.5, 1, 1, color
        // );
        // If width/height are set too small (e.g., set to 1) on ios10
        // and macOS Sierra, a circle stroke become a rect, no matter what
        // the scale is set. So we set width/height as 2. See #4150.
        const symbolPath = createSymbol(
            symbolType, -1, -1, 2, 2, null, keepAspect
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
        this.childAt(0).stopAnimation(null, toLastFrame);
    }

    getSymbolType() {
        return this._symbolType;
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
     * Highlight symbol
     */
    highlight() {
        enterEmphasis(this.childAt(0));
    }

    /**
     * Downplay symbol
     */
    downplay() {
        leaveEmphasis(this.childAt(0));
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

    setDraggable(draggable: boolean, hasCursorOption?: boolean) {
        const symbolPath = this.childAt(0) as ECSymbol;
        symbolPath.draggable = draggable;
        symbolPath.cursor = !hasCursorOption && draggable ? 'move' : symbolPath.cursor;
    }

    /**
     * Update symbol properties
     */
    updateData(data: SeriesData, idx: number, seriesScope?: SymbolDrawSeriesScope, opts?: SymbolOpts) {
        this.silent = false;

        const symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        const seriesModel = data.hostModel as SeriesModel;
        const symbolSize = Symbol.getSymbolSize(data, idx);
        const isInit = symbolType !== this._symbolType;
        const disableAnimation = opts && opts.disableAnimation;

        if (isInit) {
            const keepAspect = data.getItemVisual(idx, 'symbolKeepAspect');
            this._createSymbol(symbolType as string, data, idx, symbolSize, keepAspect);
        }
        else {
            const symbolPath = this.childAt(0) as ECSymbol;
            symbolPath.silent = false;
            const target = {
                scaleX: symbolSize[0] / 2,
                scaleY: symbolSize[1] / 2
            };
            disableAnimation ? symbolPath.attr(target)
                : graphic.updateProps(symbolPath, target, seriesModel, idx);

            saveOldStyle(symbolPath);
        }

        this._updateCommon(data, idx, symbolSize, seriesScope, opts);

        if (isInit) {
            const symbolPath = this.childAt(0) as ECSymbol;

            if (!disableAnimation) {
                const target: PathProps = {
                    scaleX: this._sizeX,
                    scaleY: this._sizeY,
                    style: {
                        // Always fadeIn. Because it has fadeOut animation when symbol is removed..
                        opacity: symbolPath.style.opacity
                    }
                };
                symbolPath.scaleX = symbolPath.scaleY = 0;
                symbolPath.style.opacity = 0;
                graphic.initProps(symbolPath, target, seriesModel, idx);
            }
        }

        if (disableAnimation) {
            // Must stop leave transition manually if don't call initProps or updateProps.
            this.childAt(0).stopAnimation('leave');
        }
    }

    _updateCommon(
        data: SeriesData,
        idx: number,
        symbolSize: number[],
        seriesScope?: SymbolDrawSeriesScope,
        opts?: SymbolOpts
    ) {
        const symbolPath = this.childAt(0) as ECSymbol;
        const seriesModel = data.hostModel as SeriesModel;

        let emphasisItemStyle;
        let blurItemStyle;
        let selectItemStyle;
        let focus;
        let blurScope: BlurScope;
        let emphasisDisabled: boolean;

        let labelStatesModels;

        let hoverScale: SymbolDrawSeriesScope['hoverScale'];
        let cursorStyle: SymbolDrawSeriesScope['cursorStyle'];

        if (seriesScope) {
            emphasisItemStyle = seriesScope.emphasisItemStyle;
            blurItemStyle = seriesScope.blurItemStyle;
            selectItemStyle = seriesScope.selectItemStyle;
            focus = seriesScope.focus;
            blurScope = seriesScope.blurScope;

            labelStatesModels = seriesScope.labelStatesModels;

            hoverScale = seriesScope.hoverScale;
            cursorStyle = seriesScope.cursorStyle;
            emphasisDisabled = seriesScope.emphasisDisabled;
        }

        if (!seriesScope || data.hasItemOption) {
            const itemModel = (seriesScope && seriesScope.itemModel)
                ? seriesScope.itemModel : data.getItemModel<SymbolDrawItemModelOption>(idx);
            const emphasisModel = itemModel.getModel('emphasis');

            emphasisItemStyle = emphasisModel.getModel('itemStyle').getItemStyle();
            selectItemStyle = itemModel.getModel(['select', 'itemStyle']).getItemStyle();
            blurItemStyle = itemModel.getModel(['blur', 'itemStyle']).getItemStyle();

            focus = emphasisModel.get('focus');
            blurScope = emphasisModel.get('blurScope');
            emphasisDisabled = emphasisModel.get('disabled');

            labelStatesModels = getLabelStatesModels(itemModel);

            hoverScale = emphasisModel.getShallow('scale');
            cursorStyle = itemModel.getShallow('cursor');
        }

        const symbolRotate = data.getItemVisual(idx, 'symbolRotate');
        symbolPath.attr('rotation', (symbolRotate || 0) * Math.PI / 180 || 0);

        const symbolOffset = normalizeSymbolOffset(data.getItemVisual(idx, 'symbolOffset'), symbolSize);
        if (symbolOffset) {
            symbolPath.x = symbolOffset[0];
            symbolPath.y = symbolOffset[1];
        }

        cursorStyle && symbolPath.attr('cursor', cursorStyle);

        const symbolStyle = data.getItemVisual(idx, 'style');
        const visualColor = symbolStyle.fill;

        if (symbolPath instanceof ZRImage) {
            const pathStyle = symbolPath.style;
            symbolPath.useStyle(extend({
                // TODO other properties like x, y ?
                image: pathStyle.image,
                x: pathStyle.x, y: pathStyle.y,
                width: pathStyle.width, height: pathStyle.height
            }, symbolStyle));
        }
        else {
            if (symbolPath.__isEmptyBrush) {
                // fill and stroke will be swapped if it's empty.
                // So we cloned a new style to avoid it affecting the original style in visual storage.
                // TODO Better implementation. No empty logic!
                symbolPath.useStyle(extend({}, symbolStyle));
            }
            else {
                symbolPath.useStyle(symbolStyle);
            }
            // Disable decal because symbol scale will been applied on the decal.
            symbolPath.style.decal = null;
            symbolPath.setColor(visualColor, opts && opts.symbolInnerColor);
            symbolPath.style.strokeNoScale = true;

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

        const useNameLabel = opts && opts.useNameLabel;

        setLabelStyle(
            symbolPath, labelStatesModels,
            {
                labelFetcher: seriesModel,
                labelDataIndex: idx,
                defaultText: getLabelDefaultText,
                inheritColor: visualColor as ColorString,
                defaultOpacity: symbolStyle.opacity
            }
        );

        // Do not execute util needed.
        function getLabelDefaultText(idx: number) {
            return useNameLabel ? data.getName(idx) : getDefaultLabel(data, idx);
        }

        this._sizeX = symbolSize[0] / 2;
        this._sizeY = symbolSize[1] / 2;

        const emphasisState = symbolPath.ensureState('emphasis');

        emphasisState.style = emphasisItemStyle;
        symbolPath.ensureState('select').style = selectItemStyle;
        symbolPath.ensureState('blur').style = blurItemStyle;

        // null / undefined / true means to use default strategy.
        // 0 / false / negative number / NaN / Infinity means no scale.
        const scaleRatio =
            hoverScale == null || hoverScale === true
                ? Math.max(1.1, 3 / this._sizeY)
                // PENDING: restrict hoverScale > 1? It seems unreasonable to scale down
                : isFinite(hoverScale as number) && hoverScale > 0
                    ? +hoverScale
                    : 1;
        // always set scale to allow resetting
        emphasisState.scaleX = this._sizeX * scaleRatio;
        emphasisState.scaleY = this._sizeY * scaleRatio;

        this.setSymbolScale(1);

        toggleHoverEmphasis(this, focus, blurScope, emphasisDisabled);
    }

    setSymbolScale(scale: number) {
        this.scaleX = this.scaleY = scale;
    }

    fadeOut(cb: () => void, seriesModel: Model<AnimationOptionMixin>, opt?: {
        fadeLabel: boolean,
        animation?: AnimationOption
    }) {
        const symbolPath = this.childAt(0) as ECSymbol;
        const dataIndex = getECData(this).dataIndex;
        const animationOpt = opt && opt.animation;
        // Avoid mistaken hover when fading out
        this.silent = symbolPath.silent = true;
        // Not show text when animating
        if (opt && opt.fadeLabel) {
            const textContent = symbolPath.getTextContent();
            if (textContent) {
                graphic.removeElement(textContent, {
                    style: {
                        opacity: 0
                    }
                }, seriesModel, {
                    dataIndex,
                    removeOpt: animationOpt,
                    cb() {
                        symbolPath.removeTextContent();
                    }
                });
            }
        }
        else {
            symbolPath.removeTextContent();
        }

        graphic.removeElement(
            symbolPath,
            {
                style: {
                    opacity: 0
                },
                scaleX: 0,
                scaleY: 0
            },
            seriesModel,
            { dataIndex, cb, removeOpt: animationOpt}
        );
    }

    static getSymbolSize(data: SeriesData, idx: number) {
        return normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
    }
}


function driftSymbol(this: ECSymbol, dx: number, dy: number) {
    this.parent.drift(dx, dy);
}

export default Symbol;
