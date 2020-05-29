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
 * @module echarts/chart/helper/LineDraw
 */

import * as graphic from '../../util/graphic';
import LineGroup from './Line';
// import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

/**
 * @alias module:echarts/component/marker/LineDraw
 * @constructor
 */
function LineDraw(ctor) {
    this._ctor = ctor || LineGroup;

    this.group = new graphic.Group();
}

var lineDrawProto = LineDraw.prototype;

lineDrawProto.isPersistent = function () {
    return true;
};

/**
 * @param {module:echarts/data/List} lineData
 */
lineDrawProto.updateData = function (lineData) {
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
        .add(function (idx) {
            doAdd(lineDraw, lineData, idx, seriesScope);
        })
        .update(function (newIdx, oldIdx) {
            doUpdate(lineDraw, oldLineData, lineData, oldIdx, newIdx, seriesScope);
        })
        .remove(function (idx) {
            group.remove(oldLineData.getItemGraphicEl(idx));
        })
        .execute();
};

function doAdd(lineDraw, lineData, idx, seriesScope) {
    var itemLayout = lineData.getItemLayout(idx);

    if (!lineNeedsDraw(itemLayout)) {
        return;
    }

    var el = new lineDraw._ctor(lineData, idx, seriesScope);
    lineData.setItemGraphicEl(idx, el);
    lineDraw.group.add(el);
}

function doUpdate(lineDraw, oldLineData, newLineData, oldIdx, newIdx, seriesScope) {
    var itemEl = oldLineData.getItemGraphicEl(oldIdx);

    if (!lineNeedsDraw(newLineData.getItemLayout(newIdx))) {
        lineDraw.group.remove(itemEl);
        return;
    }

    if (!itemEl) {
        itemEl = new lineDraw._ctor(newLineData, newIdx, seriesScope);
    }
    else {
        itemEl.updateData(newLineData, newIdx, seriesScope);
    }

    newLineData.setItemGraphicEl(newIdx, itemEl);

    lineDraw.group.add(itemEl);
}

lineDrawProto.updateLayout = function () {
    var lineData = this._lineData;

    // Do not support update layout in incremental mode.
    if (!lineData) {
        return;
    }

    lineData.eachItemGraphicEl(function (el, idx) {
        el.updateLayout(lineData, idx);
    }, this);
};

lineDrawProto.incrementalPrepareUpdate = function (lineData) {
    this._seriesScope = makeSeriesScope(lineData);
    this._lineData = null;
    this.group.removeAll();
};

function isEffectObject(el) {
    return el.animators && el.animators.length > 0;
}

lineDrawProto.incrementalUpdate = function (taskParams, lineData) {
    function updateIncrementalAndHover(el) {
        if (!el.isGroup && !isEffectObject(el)) {
            el.incremental = el.useHoverLayer = true;
        }
    }

    for (var idx = taskParams.start; idx < taskParams.end; idx++) {
        var itemLayout = lineData.getItemLayout(idx);

        if (lineNeedsDraw(itemLayout)) {
            var el = new this._ctor(lineData, idx, this._seriesScope);
            el.traverse(updateIncrementalAndHover);

            this.group.add(el);
            lineData.setItemGraphicEl(idx, el);
        }
    }
};

function makeSeriesScope(lineData) {
    var hostModel = lineData.hostModel;
    return {
        lineStyle: hostModel.getModel('lineStyle').getLineStyle(),
        hoverLineStyle: hostModel.getModel('emphasis.lineStyle').getLineStyle(),
        labelModel: hostModel.getModel('label'),
        hoverLabelModel: hostModel.getModel('emphasis.label')
    };
}

lineDrawProto.remove = function () {
    this._clearIncremental();
    this._incremental = null;
    this.group.removeAll();
};

lineDrawProto._clearIncremental = function () {
    var incremental = this._incremental;
    if (incremental) {
        incremental.clearDisplaybles();
    }
};

function isPointNaN(pt) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}

function lineNeedsDraw(pts) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}

export default LineDraw;
