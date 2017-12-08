/**
 * @module echarts/chart/helper/LineDraw
 */

import * as graphic from '../../util/graphic';
import LineGroup from './Line';
import Polyline from './Polyline';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';


/**
 * @alias module:echarts/component/marker/LineDraw
 * @constructor
 */
function LineDraw(ctor) {
    this._ctor = ctor || LineGroup;

    // ??? The third mode: largeLineDraw?
    this._incremental;

    this.group = new graphic.Group();
}

var lineDrawProto = LineDraw.prototype;

/**
 * @param {module:echarts/data/List} lineData
 */
lineDrawProto.updateData = function (lineData) {
    var lineDraw = this;
    var group = lineDraw.group;

    var oldLineData = lineDraw._lineData;
    lineDraw._lineData = lineData;

    var seriesScope = makeSeriesScope(lineData);

    // Check and change mode.
    var streamRendering = seriesScope.streamRendering;
    if (this._incremental ^ streamRendering) {
        this.remove();
        streamRendering && group.add(lineDraw._incremental = new IncrementalDisplayable());
    }

    // ??? Process that switch from stream to non-stream.
    if (streamRendering) {
        this._incremental.clearDisplaybles();
    }
    else {
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
    }

    // ??? set task start index.
    createRenderTask(lineDraw, lineData, seriesScope);
};

// ??? remove?
// lineDrawProto.updateLayout = function () {
//     var lineData = this._lineData;
//     lineData.eachItemGraphicEl(function (el, idx) {
//         el.updateLayout(lineData, idx);
//     }, this);
// };

lineDrawProto.updateView = function () {
    var lineData = this._lineData;
    var lineDraw = this;
    var seriesScope = makeSeriesScope(lineData);

    if (seriesScope.streamRendering) {
        this._incremental.clearDisplaybles();
    }
    else {
        lineData.each(function (item, idx) {
            doUpdate(lineDraw, lineData, lineData, idx, idx, seriesScope);
        });
    }

    // ??? set task start index.
    createRenderTask(lineDraw, lineData, seriesScope);
};

function doAdd(lineDraw, lineData, idx, seriesScope) {
    if (!lineNeedsDraw(lineData.getItemLayout(idx))) {
        return;
    }
    var itemEl = createItemEl(lineDraw, lineData, idx, seriesScope);

    if (seriesScope.streamRendering) {
        lineDraw._incremental.addDisplayable(itemEl, true)
    }
    else {
        lineData.setItemGraphicEl(idx, itemEl);
        lineDraw.group.add(itemEl);
    }
}

function doUpdate(lineDraw, oldLineData, newLineData, oldIdx, newIdx, seriesScope) {
    var itemEl = oldLineData.getItemGraphicEl(oldIdx);
    if (!lineNeedsDraw(newLineData.getItemLayout(newIdx))) {
        lineDraw.group.remove(itemEl);
        return;
    }

    if (!itemEl) {
        itemEl = createItemEl(lineDraw, newLineData, newIdx, seriesScope);
    }
    else {
        itemEl.updateData(newLineData, newIdx, seriesScope);
    }

    newLineData.setItemGraphicEl(newIdx, itemEl);

    lineDraw.group.add(itemEl);
}

function createRenderTask(lineDraw, lineData, seriesScope) {
    var hostModel = lineData.hostModel;
    hostModel.pipeTask && hostModel.pipeTask(lineData.createEachTask(function (idx) {
        doAdd(lineDraw, lineData, idx, seriesScope);
    }), 'render');
}

// ??? Modify Polyline, Line.js to support IncrementalDisplable?
function createItemEl(lineDraw, newLineData, newIdx, seriesScope) {
    if (seriesScope.streamRendering) {
        var el = new Polyline(newLineData, newIdx, seriesScope);
        return el.childAt(0);
    }
    else {
        return new lineDraw._ctor(newLineData, newIdx, seriesScope);
    }
}

function makeSeriesScope(lineData) {
    var hostModel = lineData.hostModel;
    var streamSetting = hostModel.getStreamSetting();
    return {
        lineStyle: hostModel.getModel('lineStyle.normal').getLineStyle(),
        hoverLineStyle: hostModel.getModel('lineStyle.emphasis').getLineStyle(),
        labelModel: hostModel.getModel('label.normal'),
        hoverLabelModel: hostModel.getModel('label.emphasis'),
        streamRendering: streamSetting && streamSetting.threshold < lineData.count()
    };
}

lineDrawProto.remove = function () {
    this._incremental && this._incremental.clearDisplaybles();
    this._incremental = null;
    this.group.removeAll();
};

function isPointNaN(pt) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}

function lineNeedsDraw(pts) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}

export default LineDraw;
