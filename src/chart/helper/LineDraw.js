/**
 * @module echarts/chart/helper/LineDraw
 */

import * as graphic from '../../util/graphic';
import LineGroup from './Line';
import Polyline from './Polyline';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import LargeLineShape from './LargeLine';
import {curry} from 'zrender/src/core/util';


/**
 * @alias module:echarts/component/marker/LineDraw
 * @constructor
 */
function LineDraw(ctor) {
    this._ctor = ctor || LineGroup;

    // ??? The third mode: largeLineDraw?
    // Create when needed.
    this._incremental;

    this._largeLine;

    this.group = new graphic.Group();
}

var lineDrawProto = LineDraw.prototype;

/**
 * @param {module:echarts/data/List} lineData
 */
lineDrawProto.updateData = function (lineData, api) {
    var lineDraw = this;
    var group = lineDraw.group;

    var oldLineData = lineDraw._lineData;
    lineDraw._lineData = lineData;

    var seriesScope = makeSeriesScope(lineData);

    // Check and change mode.
    var streamRendering = seriesScope.streamRendering;
    var incremental = lineDraw._incremental;

    if (streamRendering) {
        lineDraw.remove();
        if (streamRendering) {
            if (!incremental) {
                incremental = lineDraw._incremental = new IncrementalDisplayable();
            }
            group.add(incremental);
        }
    }

    // ??? Process that switch from stream to non-stream.
    if (streamRendering) {
        clearIncremental(lineDraw);

        if (seriesScope.isLargeMode) {
            if (!lineDraw._largeLine) {
                lineDraw._largeLine = new LargeLineShape();
            }
            // ??? set style should not be here, but in task?
            setLargeLineCommon(lineDraw, lineData, seriesScope);
        }
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
    createRenderTask(lineDraw, lineData, seriesScope, api);
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
        clearIncremental(lineDraw);
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
    var el;

    var itemLayout = lineData.getItemLayout(idx);
    if (!lineNeedsDraw(itemLayout)) {
        return;
    }

    if (seriesScope.streamRendering) {
        el = createItemEl(lineDraw, lineData, idx, seriesScope);
        lineDraw._incremental.addDisplayable(el, true);
        lineData.$releaseItemMemory(idx);
    }
    else {
        el = createItemEl(lineDraw, lineData, idx, seriesScope);
        lineData.setItemGraphicEl(idx, el);
        lineDraw.group.add(el);
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

function createRenderTask(lineDraw, lineData, seriesScope, api) {
    var hostModel = lineData.hostModel;
    if (hostModel.get('large')) {
        hostModel.pipeTask && hostModel.pipeTask(api.createTask({
            input: lineData,
            progress: function (params, notify) {
                lineDraw._largeLine.setShape({
                    segs: lineData.getLayout('linesPoints')
                });
                lineDraw._incremental.addDisplayable(lineDraw._largeLine);
                notify(params.dueEnd);
            }
        }), 'render');
    }
    else {
        hostModel.pipeTask && hostModel.pipeTask(lineData.createEachTask(function (idx) {
            doAdd(lineDraw, lineData, idx, seriesScope);
        }), 'render');
    }
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
        streamRendering: streamSetting && streamSetting.threshold < lineData.count(),
        isLargeMode: hostModel.get('large')
    };
}

lineDrawProto.remove = function () {
    clearIncremental(this);
    this._incremental = null;
    this.group.removeAll();
};

function setLargeLineCommon(lineDraw, lineData, seriesScope) {
    var seriesModel = lineData.hostModel;
    var largeLine = lineDraw._largeLine;

    largeLine.setShape({
        segs: [],
        polyline: seriesModel.get('polyline')
    });

    largeLine.useStyle(
        seriesModel.getModel('lineStyle.normal').getLineStyle()
    );

    // ???! do it in echarts.js ?
    var blendMode = seriesModel.get('blendMode') || null;
    largeLine.style.blend = blendMode;

    var visualColor = lineData.getVisual('color');
    if (visualColor) {
        largeLine.setStyle('stroke', visualColor);
    }
    largeLine.setStyle('fill');

    // Enable tooltip
    // PENDING May have performance issue when path is extremely large
    // largeLine.seriesIndex = seriesScope.seriesIndex;
    // lineEl.on('mousemove', function (e) {
    //     lineEl.dataIndex = null;
    //     var dataIndex = lineEl.findDataIndex(e.offsetX, e.offsetY);
    //     if (dataIndex > 0) {
    //         // Provide dataIndex for tooltip
    //         lineEl.dataIndex = dataIndex;
    //     }
    // });
}

function clearLargeLine(lineDraw) {
    // Do not set dirty.
    lineDraw._largeLine && (lineDraw._largeLine.shape.segs.length = 0);
}

function clearIncremental(lineDraw) {
    var incremental = lineDraw._incremental;
    if (incremental) {
        incremental.clearDisplaybles();
        lineDraw._largeLineAdded = false;
    }
    clearLargeLine(lineDraw);
}

function isPointNaN(pt) {
    return isNaN(pt[0]) || isNaN(pt[1]);
}

function lineNeedsDraw(pts) {
    return !isPointNaN(pts[0]) && !isPointNaN(pts[1]);
}

export default LineDraw;
