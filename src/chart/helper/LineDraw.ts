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
import LineGroup, {SeriesScope} from './Line';
import List from '../../data/List';
import { StageHandlerProgressParams, LineStyleOption, LineLabelOption } from '../../util/types';
import Displayable from 'zrender/src/graphic/Displayable';
import Model from '../../model/Model';

interface LineLike extends graphic.Group {
    updateData(data: List, idx: number, scope?: SeriesScope): void
    updateLayout(data: List, idx: number): void
    fadeOut?(cb: () => void): void
}

interface LineLikeCtor {
    new(data: List, idx: number, scope?: SeriesScope): LineLike
}

interface LineOption {
    lineStyle?: LineStyleOption
    label?: LineLabelOption
    emphasis: {
        lineStyle?: LineStyleOption
        label?: LineLabelOption
    }
}

class LineDraw {
    group = new graphic.Group()

    private _LineCtor: LineLikeCtor

    private _lineData: List

    private _seriesScope: SeriesScope

    constructor(LineCtor?: LineLikeCtor) {
        this._LineCtor = LineCtor || LineGroup;
    }

    isPersistent() {
        return true;
    };

    updateData(lineData: List<Model<LineOption>>) {
        var lineDraw = this;
        var group = lineDraw.group;

        var oldLineData = lineDraw._lineData;
        lineDraw._lineData = lineData;

        // There is no oldLineData only when first rendering or switching from
        // stream mode to normal mode, where previous elements should be removed.
        if (!oldLineData) {
            group.removeAll();
        }

        var seriesScope = makeSeriesScope(lineData);

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
        var lineData = this._lineData;

        // Do not support update layout in incremental mode.
        if (!lineData) {
            return;
        }

        lineData.eachItemGraphicEl(function (el: LineLike, idx) {
            el.updateLayout(lineData, idx);
        }, this);
    };

    incrementalPrepareUpdate(lineData: List) {
        this._seriesScope = makeSeriesScope(lineData);
        this._lineData = null;
        this.group.removeAll();
    };

    incrementalUpdate(taskParams: StageHandlerProgressParams, lineData: List) {
        function updateIncrementalAndHover(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = el.useHoverLayer = true;
            }
        }

        for (var idx = taskParams.start; idx < taskParams.end; idx++) {
            var itemLayout = lineData.getItemLayout(idx);

            if (lineNeedsDraw(itemLayout)) {
                var el = new this._LineCtor(lineData, idx, this._seriesScope);
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
        lineData: List,
        idx: number,
        seriesScope: SeriesScope
    ) {
        var itemLayout = lineData.getItemLayout(idx);

        if (!lineNeedsDraw(itemLayout)) {
            return;
        }

        var el = new this._LineCtor(lineData, idx, seriesScope);
        lineData.setItemGraphicEl(idx, el);
        this.group.add(el);
    }
    private _doUpdate(
        oldLineData: List,
        newLineData: List,
        oldIdx: number,
        newIdx: number,
        seriesScope: SeriesScope
    ) {
        var itemEl = oldLineData.getItemGraphicEl(oldIdx) as LineLike;

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

function makeSeriesScope(lineData: List<Model<LineOption>>) {
    var hostModel = lineData.hostModel;
    return {
        lineStyle: hostModel.getModel('lineStyle').getLineStyle(),
        hoverLineStyle: hostModel.getModel(['emphasis', 'lineStyle']).getLineStyle(),
        labelModel: hostModel.getModel('label'),
        hoverLabelModel: hostModel.getModel(['emphasis', 'label'])
    };
}

function isPointNaN(pt: number[]) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}

function lineNeedsDraw(pts: number[][]) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}


export default LineDraw;
