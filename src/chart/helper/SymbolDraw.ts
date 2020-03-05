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
import SymbolClz, {SeriesScope} from './Symbol';
import { isObject } from 'zrender/src/core/util';
import List from '../../data/List';
import type Displayable from 'zrender/src/graphic/Displayable';
import { StageHandlerProgressParams } from '../../util/types';
import { CoordinateSystemClipArea } from '../../coord/CoordinateSystem';

interface UpdateOpt {
    isIgnore?(idx: number): boolean
    clipShape?: CoordinateSystemClipArea
}

interface SymbolLike extends graphic.Group {
    updateData(data: List, idx: number, scope?: SeriesScope): void
    fadeOut?(cb: () => void): void
}

interface SymbolLikeCtor {
    new(data: List, idx: number, scope?: SeriesScope): SymbolLike
}

function symbolNeedsDraw(data: List, point: number[], idx: number, opt: UpdateOpt) {
    return point && !isNaN(point[0]) && !isNaN(point[1])
        && !(opt.isIgnore && opt.isIgnore(idx))
        // We do not set clipShape on group, because it will cut part of
        // the symbol element shape. We use the same clip shape here as
        // the line clip.
        && !(opt.clipShape && !opt.clipShape.contain(point[0], point[1]))
        && data.getItemVisual(idx, 'symbol') !== 'none';
}

function normalizeUpdateOpt(opt: UpdateOpt) {
    if (opt != null && !isObject(opt)) {
        opt = {isIgnore: opt};
    }
    return opt || {};
}


function makeSeriesScope(data: List): SeriesScope {
    var seriesModel = data.hostModel;
    return {
        itemStyle: seriesModel.getModel('itemStyle').getItemStyle(['color']),
        hoverItemStyle: seriesModel.getModel(['emphasis', 'itemStyle']).getItemStyle(),
        symbolRotate: seriesModel.get('symbolRotate'),
        symbolOffset: seriesModel.get('symbolOffset'),
        hoverAnimation: seriesModel.get('hoverAnimation'),
        labelModel: seriesModel.getModel('label'),
        hoverLabelModel: seriesModel.getModel(['emphasis', 'label']),
        cursorStyle: seriesModel.get('cursor')
    };
}

class SymbolDraw {
    group = new graphic.Group();

    private _data: List

    private _SymbolCtor: SymbolLikeCtor

    private _seriesScope: SeriesScope

    constructor(SymbolCtor?: SymbolLikeCtor) {
        this._SymbolCtor = SymbolCtor || SymbolClz;
    }

    /**
     * Update symbols draw by new data
     */
    updateData(data: List, opt?: UpdateOpt) {
        opt = normalizeUpdateOpt(opt);

        var group = this.group;
        var seriesModel = data.hostModel;
        var oldData = this._data;
        var SymbolCtor = this._SymbolCtor;

        var seriesScope = makeSeriesScope(data);

        // There is no oldLineData only when first rendering or switching from
        // stream mode to normal mode, where previous elements should be removed.
        if (!oldData) {
            group.removeAll();
        }

        data.diff(oldData)
            .add(function (newIdx) {
                var point = data.getItemLayout(newIdx) as number[];
                if (symbolNeedsDraw(data, point, newIdx, opt)) {
                    var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
                    symbolEl.attr('position', point);
                    data.setItemGraphicEl(newIdx, symbolEl);
                    group.add(symbolEl);
                }
            })
            .update(function (newIdx, oldIdx) {
                var symbolEl = oldData.getItemGraphicEl(oldIdx) as SymbolLike;
                var point = data.getItemLayout(newIdx) as number[];
                if (!symbolNeedsDraw(data, point, newIdx, opt)) {
                    group.remove(symbolEl);
                    return;
                }
                if (!symbolEl) {
                    symbolEl = new SymbolCtor(data, newIdx);
                    symbolEl.attr('position', point);
                }
                else {
                    symbolEl.updateData(data, newIdx, seriesScope);
                    graphic.updateProps(symbolEl, {
                        position: point
                    }, seriesModel);
                }

                // Add back
                group.add(symbolEl);

                data.setItemGraphicEl(newIdx, symbolEl);
            })
            .remove(function (oldIdx) {
                var el = oldData.getItemGraphicEl(oldIdx) as SymbolLike;
                el && el.fadeOut(function () {
                    group.remove(el);
                });
            })
            .execute();

        this._data = data;
    };

    isPersistent() {
        return true;
    };

    updateLayout() {
        var data = this._data;
        if (data) {
            // Not use animation
            data.eachItemGraphicEl(function (el, idx) {
                var point = data.getItemLayout(idx);
                el.attr('position', point);
            });
        }
    };

    incrementalPrepareUpdate(data: List) {
        this._seriesScope = makeSeriesScope(data);
        this._data = null;
        this.group.removeAll();
    };

    /**
     * Update symbols draw by new data
     */
    incrementalUpdate(taskParams: StageHandlerProgressParams, data: List, opt?: UpdateOpt) {
        opt = normalizeUpdateOpt(opt);

        function updateIncrementalAndHover(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = el.useHoverLayer = true;
            }
        }
        for (var idx = taskParams.start; idx < taskParams.end; idx++) {
            var point = data.getItemLayout(idx) as number[];
            if (symbolNeedsDraw(data, point, idx, opt)) {
                var el = new this._SymbolCtor(data, idx, this._seriesScope);
                el.traverse(updateIncrementalAndHover);
                el.attr('position', point);
                this.group.add(el);
                data.setItemGraphicEl(idx, el);
            }
        }
    };

    remove(enableAnimation?: boolean) {
        var group = this.group;
        var data = this._data;
        // Incremental model do not have this._data.
        if (data && enableAnimation) {
            data.eachItemGraphicEl(function (el: SymbolLike) {
                el.fadeOut(function () {
                    group.remove(el);
                });
            });
        }
        else {
            group.removeAll();
        }
    };

}

export default SymbolDraw;