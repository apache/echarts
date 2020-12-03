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
import LineGroup from './Line';
import List from '../../data/List';
import {
    StageHandlerProgressParams,
    LineStyleOption,
    LineLabelOption,
    ColorString,
    AnimationOptionMixin,
    ZRStyleProps,
    StatesOptionMixin,
    DisplayState,
    LabelOption
} from '../../util/types';
import Displayable from 'zrender/src/graphic/Displayable';
import Model from '../../model/Model';
import { getLabelStatesModels } from '../../label/labelStyle';

interface LineLike extends graphic.Group {
    updateData(data: List, idx: number, scope?: LineDrawSeriesScope): void
    updateLayout(data: List, idx: number): void
    fadeOut?(cb: () => void): void
}

interface LineLikeCtor {
    new(data: List, idx: number, scope?: LineDrawSeriesScope): LineLike
}

interface LineDrawStateOption {
    lineStyle?: LineStyleOption
    label?: LineLabelOption
}

export interface LineDrawModelOption extends LineDrawStateOption, StatesOptionMixin<LineDrawStateOption> {
    // If has effect
    effect?: {
        show?: boolean
        period?: number
        delay?: number | ((idx: number) => number)
        /**
         * If move with constant speed px/sec
         * period will be ignored if this property is > 0,
         */
        constantSpeed?: number

        symbol?: string
        symbolSize?: number | number[]
        loop?: boolean
        /**
         * Length of trail, 0 - 1
         */
        trailLength?: number
        /**
         * Default to be same with lineStyle.color
         */
        color?: ColorString
    }
}

type ListForLineDraw = List<Model<LineDrawModelOption & AnimationOptionMixin>>;

export interface LineDrawSeriesScope {
    lineStyle?: ZRStyleProps
    emphasisLineStyle?: ZRStyleProps
    blurLineStyle?: ZRStyleProps
    selectLineStyle?: ZRStyleProps

    labelStatesModels: Record<DisplayState, Model<LabelOption>>
}

class LineDraw {
    group = new graphic.Group();

    private _LineCtor: LineLikeCtor;

    private _lineData: ListForLineDraw;

    private _seriesScope: LineDrawSeriesScope;

    constructor(LineCtor?: LineLikeCtor) {
        this._LineCtor = LineCtor || LineGroup;
    }

    isPersistent() {
        return true;
    };

    updateData(lineData: ListForLineDraw) {
        const lineDraw = this;
        const group = lineDraw.group;

        const oldLineData = lineDraw._lineData;
        lineDraw._lineData = lineData;

        // There is no oldLineData only when first rendering or switching from
        // stream mode to normal mode, where previous elements should be removed.
        if (!oldLineData) {
            group.removeAll();
        }

        const seriesScope = makeSeriesScope(lineData);

        lineData.diff(oldLineData)
            .add((idx) => {
                this._doAdd(lineData, idx, seriesScope);
            })
            .update((newIdx, oldIdx) => {
                this._doUpdate(oldLineData, lineData, oldIdx, newIdx, seriesScope);
            })
            .remove((idx) => {
                group.remove(oldLineData.getItemGraphicEl(idx));
            })
            .execute();
    };

    updateLayout() {
        const lineData = this._lineData;

        // Do not support update layout in incremental mode.
        if (!lineData) {
            return;
        }

        lineData.eachItemGraphicEl(function (el: LineLike, idx) {
            el.updateLayout(lineData, idx);
        }, this);
    };

    incrementalPrepareUpdate(lineData: ListForLineDraw) {
        this._seriesScope = makeSeriesScope(lineData);
        this._lineData = null;
        this.group.removeAll();
    };

    incrementalUpdate(taskParams: StageHandlerProgressParams, lineData: ListForLineDraw) {
        function updateIncrementalAndHover(el: Displayable) {
            if (!el.isGroup && !isEffectObject(el)) {
                el.incremental = true;
                el.ensureState('emphasis').hoverLayer = true;
            }
        }

        for (let idx = taskParams.start; idx < taskParams.end; idx++) {
            const itemLayout = lineData.getItemLayout(idx);

            if (lineNeedsDraw(itemLayout)) {
                const el = new this._LineCtor(lineData, idx, this._seriesScope);
                el.traverse(updateIncrementalAndHover);

                this.group.add(el);
                lineData.setItemGraphicEl(idx, el);
            }
        }
    };

    remove() {
        this.group.removeAll();
    };

    private _doAdd(
        lineData: ListForLineDraw,
        idx: number,
        seriesScope: LineDrawSeriesScope
    ) {
        const itemLayout = lineData.getItemLayout(idx);

        if (!lineNeedsDraw(itemLayout)) {
            return;
        }

        const el = new this._LineCtor(lineData, idx, seriesScope);
        lineData.setItemGraphicEl(idx, el);
        this.group.add(el);
    }
    private _doUpdate(
        oldLineData: ListForLineDraw,
        newLineData: ListForLineDraw,
        oldIdx: number,
        newIdx: number,
        seriesScope: LineDrawSeriesScope
    ) {
        let itemEl = oldLineData.getItemGraphicEl(oldIdx) as LineLike;

        if (!lineNeedsDraw(newLineData.getItemLayout(newIdx))) {
            this.group.remove(itemEl);
            return;
        }

        if (!itemEl) {
            itemEl = new this._LineCtor(newLineData, newIdx, seriesScope);
        }
        else {
            itemEl.updateData(newLineData, newIdx, seriesScope);
        }

        newLineData.setItemGraphicEl(newIdx, itemEl);

        this.group.add(itemEl);
    }
}

function isEffectObject(el: Displayable) {
    return el.animators && el.animators.length > 0;
}

function makeSeriesScope(lineData: ListForLineDraw): LineDrawSeriesScope {
    const hostModel = lineData.hostModel;
    return {
        lineStyle: hostModel.getModel('lineStyle').getLineStyle(),
        emphasisLineStyle: hostModel.getModel(['emphasis', 'lineStyle']).getLineStyle(),
        blurLineStyle: hostModel.getModel(['blur', 'lineStyle']).getLineStyle(),
        selectLineStyle: hostModel.getModel(['select', 'lineStyle']).getLineStyle(),

        labelStatesModels: getLabelStatesModels(hostModel)
    };
}

function isPointNaN(pt: number[]) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}

function lineNeedsDraw(pts: number[][]) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}


export default LineDraw;
