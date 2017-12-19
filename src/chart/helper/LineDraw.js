/**
 * @module echarts/chart/helper/LineDraw
 */

import * as graphic from '../../util/graphic';
import LineGroup from './Line';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

/**
 * @alias module:echarts/component/marker/LineDraw
 * @constructor
 */
function LineDraw(ctor) {
    this._ctor = ctor || LineGroup;

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
    lineData.eachItemGraphicEl(function (el, idx) {
        el.updateLayout(lineData, idx);
    }, this);
};

lineDrawProto.incrementalPrepareRender = function (lineData) {
    this._seriesScope = makeSeriesScope(this);
    this._lineData = lineData;
    this._clearIncremental();

    !this._incremental && this.group.add(
        this._incremental = new IncrementalDisplayable()
    );
};

lineDrawProto.incrementalRender = function (taskParams, lineData) {
    for (var idx = taskParams.start; idx < taskParams.end; idx++) {
        var itemLayout = lineData.getItemLayout(idx);

        if (lineNeedsDraw(itemLayout)) {
            var el = new this._ctor(lineData, idx, this._seriesScope);
            this._incremental.addDisplayable(el, true);
            this.$releaseItemMemory(idx);
        }
    }
};

function makeSeriesScope(lineData) {
    var hostModel = lineData.hostModel;
    return {
        lineStyle: hostModel.getModel('lineStyle.normal').getLineStyle(),
        hoverLineStyle: hostModel.getModel('lineStyle.emphasis').getLineStyle(),
        labelModel: hostModel.getModel('label.normal'),
        hoverLabelModel: hostModel.getModel('label.emphasis'),
        isLargeMode: hostModel.get('large')
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
