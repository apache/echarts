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

import * as graphic from '../../util/graphic';
import SymbolClz from './Symbol';
import { isObject } from 'zrender/src/core/util';
import SeriesData from '../../data/SeriesData';
import type Displayable from 'zrender/src/graphic/Displayable';
import {
    StageHandlerProgressParams,
    LabelOption,
    ZRStyleProps,
    BlurScope,
    DisplayState,
    DefaultEmphasisFocus,
    NullUndefined
} from '../../util/types';
import Model from '../../model/Model';
import { ScatterSeriesOption } from '../scatter/ScatterSeries';
import { getLabelStatesModels } from '../../label/labelStyle';
import Element from 'zrender/src/Element';
import SeriesModel from '../../model/Series';
import { ISymbolDraw, ListForSymbolDraw, SymbolDrawItemModelOption, SymbolDrawUpdateOpt } from './baseDraw';


interface SymbolLike extends graphic.Group {
    updateData(data: SeriesData, idx: number, scope?: SymbolDrawSeriesScope, opt?: SymbolDrawUpdateOpt): void
    fadeOut?(cb: () => void, seriesModel: SeriesModel): void
}

interface SymbolLikeCtor {
    new(data: SeriesData, idx: number, scope?: SymbolDrawSeriesScope, opt?: SymbolDrawUpdateOpt): SymbolLike
}

function symbolNeedsDraw(data: SeriesData, point: number[], idx: number, opt: SymbolDrawUpdateOpt | NullUndefined) {
    return point && !isNaN(point[0]) && !isNaN(point[1])
        && !(opt && opt.isIgnore && opt.isIgnore(idx))
        // We do not set clipShape on group, because it will cut part of
        // the symbol element shape. We use the same clip shape here as
        // the line clip.
        && !(opt && opt.clipShape && !opt.clipShape.contain(point[0], point[1]))
        && data.getItemVisual(idx, 'symbol') !== 'none';
}

function normalizeUpdateOpt(opt: SymbolDrawUpdateOpt) {
    if (opt != null && !isObject(opt)) {
        opt = {isIgnore: opt};
    }
    return opt || {};
}

export interface SymbolDrawSeriesScope {
    emphasisItemStyle?: ZRStyleProps
    blurItemStyle?: ZRStyleProps
    selectItemStyle?: ZRStyleProps

    focus?: DefaultEmphasisFocus
    blurScope?: BlurScope
    emphasisDisabled?: boolean

    labelStatesModels: Record<DisplayState, Model<LabelOption>>

    itemModel?: Model<SymbolDrawItemModelOption>

    hoverScale?: boolean | number

    cursorStyle?: string
    fadeIn?: boolean
}

function makeSeriesScope(data: SeriesData): SymbolDrawSeriesScope {
    const seriesModel = data.hostModel as Model<ScatterSeriesOption>;
    const emphasisModel = seriesModel.getModel('emphasis');
    return {
        emphasisItemStyle: emphasisModel.getModel('itemStyle').getItemStyle(),
        blurItemStyle: seriesModel.getModel(['blur', 'itemStyle']).getItemStyle(),
        selectItemStyle: seriesModel.getModel(['select', 'itemStyle']).getItemStyle(),

        focus: emphasisModel.get('focus'),
        blurScope: emphasisModel.get('blurScope'),
        emphasisDisabled: emphasisModel.get('disabled'),

        hoverScale: emphasisModel.get('scale'),

        labelStatesModels: getLabelStatesModels(seriesModel),

        cursorStyle: seriesModel.get('cursor')
    };
}

function createEl(
    SymbolCtor: SymbolLikeCtor,
    data: SeriesData,
    newIdx: number,
    seriesScope: SymbolDrawSeriesScope,
    symbolUpdateOpt: SymbolDrawUpdateOpt,
    point: number[],
    group: graphic.Group
): SymbolLike {
    const symbolEl = new SymbolCtor(data, newIdx, seriesScope, symbolUpdateOpt);
    symbolEl.setPosition(point);
    data.setItemGraphicEl(newIdx, symbolEl);
    group.add(symbolEl);
    return symbolEl;
}

class SymbolDraw implements ISymbolDraw {
    group = new graphic.Group();

    private _data: ListForSymbolDraw;

    private _SymbolCtor: SymbolLikeCtor;

    private _seriesScope: SymbolDrawSeriesScope;

    private _getSymbolPoint: SymbolDrawUpdateOpt['getSymbolPoint'];

    private _progressiveEls: SymbolLike[];

    constructor(SymbolCtor?: SymbolLikeCtor) {
        this._SymbolCtor = SymbolCtor || SymbolClz as SymbolLikeCtor;
    }

    /**
     * Update symbols draw by new data
     */
    updateData(data: ListForSymbolDraw, opt?: SymbolDrawUpdateOpt) {
        // Remove progressive els.
        this._progressiveEls = null;

        opt = normalizeUpdateOpt(opt);

        const group = this.group;
        const seriesModel = data.hostModel;
        const oldData = this._data;
        const SymbolCtor = this._SymbolCtor;
        const disableAnimation = opt.disableAnimation;

        const seriesScope = this._seriesScope = makeSeriesScope(data);

        const symbolUpdateOpt = { disableAnimation };

        const getSymbolPoint = opt.getSymbolPoint || function (idx: number) {
            return data.getItemLayout(idx);
        };

        // There is no oldLineData only when first rendering or switching from
        // stream mode to normal mode, where previous elements should be removed.
        if (!oldData) {
            group.removeAll();
        }

        data.diff(oldData)
            .add(function (newIdx) {
                const point = getSymbolPoint(newIdx);
                if (symbolNeedsDraw(data, point, newIdx, opt)) {
                    createEl(SymbolCtor, data, newIdx, seriesScope, symbolUpdateOpt, point, group);
                }
            })
            .update(function (newIdx, oldIdx) {
                let symbolEl = oldData.getItemGraphicEl(oldIdx) as SymbolLike;

                const point = getSymbolPoint(newIdx) as number[];
                if (!symbolNeedsDraw(data, point, newIdx, opt)) {
                    group.remove(symbolEl);
                    return;
                }
                const newSymbolType = data.getItemVisual(newIdx, 'symbol') || 'circle';
                const oldSymbolType = symbolEl
                    && (symbolEl as SymbolClz).getSymbolType
                    && (symbolEl as SymbolClz).getSymbolType();

                if (!symbolEl
                    // Create a new if symbol type changed.
                    || (oldSymbolType && oldSymbolType !== newSymbolType)
                ) {
                    group.remove(symbolEl);
                    symbolEl = new SymbolCtor(data, newIdx, seriesScope, symbolUpdateOpt);
                    symbolEl.setPosition(point);
                }
                else {
                    symbolEl.updateData(data, newIdx, seriesScope, symbolUpdateOpt);
                    const target = {
                        x: point[0],
                        y: point[1]
                    };
                    disableAnimation
                        ? symbolEl.attr(target)
                        : graphic.updateProps(symbolEl, target, seriesModel);
                }

                // Add back
                group.add(symbolEl);

                data.setItemGraphicEl(newIdx, symbolEl);
            })
            .remove(function (oldIdx) {
                const el = oldData.getItemGraphicEl(oldIdx) as SymbolLike;
                el && el.fadeOut(function () {
                    group.remove(el);
                }, seriesModel as SeriesModel);
            })
            .execute();

        this._getSymbolPoint = getSymbolPoint;
        this._data = data;
    };

    updateLayout(opt?: SymbolDrawUpdateOpt) {
        const data = this._data;
        if (!data) {
            return;
        }
        const symbolDraw = this;
        const store = data.getStore();
        for (let idx = 0, len = store.count(); idx < len; idx++) {
            let el = data.getItemGraphicEl(idx);
            const point = symbolDraw._getSymbolPoint(idx);

            // FIXME: [FIXME_SYMBOL_CLIP_CONSIDERING_COORD_SYS_ALIGNMENT_DURING_ANIMATION]
            //  See VIEW_COORD_SYS animation (by center/zoom change) and FIXME_VIEW_COORD_SYS_SYNC_BACK.
            //  If we create symbols when roaming them into the clip area, they can not be laid out
            //  based on the intermediate state but can only based on the final state of VIEW_COORD_SYS,
            //  and introduce visual artifacts.

            // Consider clip, need to handle create or remove.
            if (symbolNeedsDraw(data, point, idx, opt)) {
                el = el || createEl(
                    symbolDraw._SymbolCtor,
                    data,
                    idx,
                    symbolDraw._seriesScope,
                    {disableAnimation: true},
                    point,
                    symbolDraw.group
                );
                el.stopAnimation();
                el.setPosition(point);
                el.markRedraw();
            }
            else if (el) {
                symbolDraw.group.remove(el);
                data.setItemGraphicEl(idx, null);
            }
        }
    };

    incrementalPrepareUpdate(data: ListForSymbolDraw) {
        this._seriesScope = makeSeriesScope(data);
        this._data = null;
        this.group.removeAll();
    };

    incrementalUpdate(
        taskParams: StageHandlerProgressParams,
        data: ListForSymbolDraw,
        incrementalId: Displayable['incremental'],
        opt?: SymbolDrawUpdateOpt
    ) {
        // Clear
        this._progressiveEls = [];

        opt = normalizeUpdateOpt(opt);

        function updateIncrementalAndHover(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = incrementalId;
                el.ensureState('emphasis').hoverLayer = graphic.HOVER_LAYER_FOR_INCREMENTAL;
            }
        }
        for (let idx = taskParams.start; idx < taskParams.end; idx++) {
            const point = data.getItemLayout(idx) as number[];
            if (symbolNeedsDraw(data, point, idx, opt)) {
                const el = new this._SymbolCtor(data, idx, this._seriesScope);
                el.traverse(updateIncrementalAndHover);
                el.setPosition(point);
                this.group.add(el);
                data.setItemGraphicEl(idx, el);
                this._progressiveEls.push(el);
            }
        }
    };

    eachRendered(cb: (el: Element) => boolean | void) {
        graphic.traverseElements(this._progressiveEls || this.group, cb);
    }

    remove(enableAnimation?: boolean) {
        const group = this.group;
        const data = this._data;
        // Incremental model do not have this._data.
        if (data && enableAnimation) {
            data.eachItemGraphicEl(function (el: SymbolLike) {
                el.fadeOut(function () {
                    group.remove(el);
                }, data.hostModel as SeriesModel);
            });
        }
        else {
            group.removeAll();
        }
    };

}

export default SymbolDraw;
