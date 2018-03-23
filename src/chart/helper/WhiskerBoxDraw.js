/**
 * @module echarts/chart/helper/Symbol
 */

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import Path from 'zrender/src/graphic/Path';




// ------------------
// -- Whisker Path --
// ------------------

var WhiskerPath = Path.extend({

    type: 'whiskerInBox',

    shape: {},

    buildPath: function (ctx, shape) {
        for (var i in shape) {
            if (shape.hasOwnProperty(i) && i.indexOf('ends') === 0) {
                var pts = shape[i];
                ctx.moveTo(pts[0][0], pts[0][1]);
                ctx.lineTo(pts[1][0], pts[1][1]);
            }
        }
    }
});




// ----------------
// -- Normal Box --
// ----------------


var BODY_INDEX = 0;
var WHISKER_INDEX = 1;

/**
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Function} styleUpdater
 * @param {boolean} isInit
 */
function createNormalBox(data, dataIndex, styleUpdater, isInit) {
    var boxEl = new graphic.Group();

    var itemLayout = data.getItemLayout(dataIndex);
    var constDim = itemLayout.chartLayout === 'horizontal' ? 1 : 0;

    // Whisker element.
    boxEl.add(new graphic.Polygon({
        shape: {
            points: isInit
                ? transInit(itemLayout.bodyEnds, constDim, itemLayout)
                : itemLayout.bodyEnds
        },
        style: {strokeNoScale: true},
        z2: 100
    }));

    // Box element.
    var whiskerEnds = zrUtil.map(itemLayout.whiskerEnds, function (ends) {
        return isInit ? transInit(ends, constDim, itemLayout) : ends;
    });
    boxEl.add(new WhiskerPath({
        shape: makeWhiskerEndsShape(whiskerEnds),
        style: {strokeNoScale: true},
        z2: 100
    }));

    updateNormalBoxData(boxEl, data, dataIndex, styleUpdater, isInit);

    return boxEl;
}

function updateNormalBoxData(boxEl, data, dataIndex, styleUpdater, isInit) {
    var seriesModel = boxEl._seriesModel = data.hostModel;
    var itemLayout = data.getItemLayout(dataIndex);
    var updateMethod = graphic[isInit ? 'initProps' : 'updateProps'];
    var whiskerEl = boxEl.childAt(WHISKER_INDEX);
    var bodyEl = boxEl.childAt(BODY_INDEX);

    updateMethod(
        bodyEl,
        {shape: {points: itemLayout.bodyEnds}},
        seriesModel, dataIndex
    );
    updateMethod(
        whiskerEl,
        {shape: makeWhiskerEndsShape(itemLayout.whiskerEnds)},
        seriesModel, dataIndex
    );

    styleUpdater(data, dataIndex, boxEl, whiskerEl, bodyEl);
}

function transInit(points, dim, itemLayout) {
    return zrUtil.map(points, function (point) {
        point = point.slice();
        point[dim] = itemLayout.initBaseline;
        return point;
    });
}

function makeWhiskerEndsShape(whiskerEnds) {
    // zr animation only support 2-dim array.
    var shape = {};
    zrUtil.each(whiskerEnds, function (ends, i) {
        shape['ends' + i] = ends;
    });
    return shape;
}




// ---------------
// -- Large Box --
// ---------------

var NORMAL_STYLE_ACCESS_PATH = ['itemStyle'];
var EMPHASIS_STYLE_ACCESS_PATH = ['emphasis', 'itemStyle'];

function createLargeBox(data, largePoints, dataIndex, segmentStart) {
    var boxEl = new graphic.Line({
        shape: largeBoxMakeShape(largePoints, dataIndex, segmentStart)
    });

    boxEl.__largeWhiskerBox = true;

    largeBoxSetStyle(boxEl, data, dataIndex);

    return boxEl;
}

function largeBoxMakeShape(largePoints, dataIndex, segmentStart) {
    var baseIdx = (dataIndex - (segmentStart || 0)) * 5;
    return {
        x1: largePoints[baseIdx + 1],
        y1: largePoints[baseIdx + 2],
        x2: largePoints[baseIdx + 3],
        y2: largePoints[baseIdx + 4]
    };
}

function updateLargeBoxData(boxEl, data, dataIndex) {
    graphic.updateProps(
        boxEl,
        {shape: largeBoxMakeShape(data.getLayout('largePoints'), dataIndex, 0)},
        data.hostModel,
        dataIndex
    );

    largeBoxSetStyle(boxEl, data, dataIndex);
}

function largeBoxSetStyle(boxEl, data, dataIndex) {
    var itemModel = data.getItemModel(dataIndex);
    var normalItemStyleModel = itemModel.getModel(NORMAL_STYLE_ACCESS_PATH);
    var color = data.getItemVisual(dataIndex, 'color');
    var borderColor = data.getItemVisual(dataIndex, 'borderColor') || color;

    // Color must be excluded.
    // Because symbol provide setColor individually to set fill and stroke
    var itemStyle = normalItemStyleModel.getItemStyle(
        ['color', 'color0', 'borderColor', 'borderColor0']
    );

    boxEl.useStyle(itemStyle);
    boxEl.style.stroke = borderColor;

    var hoverStyle = itemModel.getModel(EMPHASIS_STYLE_ACCESS_PATH).getItemStyle();
    graphic.setHoverStyle(boxEl, hoverStyle);
}




// --------------------
// -- WhiskerBoxDraw --
// --------------------

/**
 * @constructor
 * @alias module:echarts/chart/helper/WhiskerBoxDraw
 */
function WhiskerBoxDraw(styleUpdater) {
    this.group = new graphic.Group();
    this.styleUpdater = styleUpdater;
}

var whiskerBoxDrawProto = WhiskerBoxDraw.prototype;

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
whiskerBoxDrawProto.updateData = function (data) {
    var group = this.group;
    var oldData = this._data;
    var styleUpdater = this.styleUpdater;
    var pipelineContext = data.hostModel.pipelineContext;
    var isLargeRender = pipelineContext.large;
    var largePoints = isLargeRender && data.getLayout('largePoints');

    // There is no old data only when first rendering or switching from
    // stream mode to normal mode, where previous elements should be removed.
    if (!this._data) {
        group.removeAll();
    }

    data.diff(oldData)
        .add(function (newIdx) {
            if (data.hasValue(newIdx)) {
                var symbolEl = isLargeRender
                    ? createLargeBox(data, largePoints, newIdx)
                    : createNormalBox(data, newIdx, styleUpdater, true);
                data.setItemGraphicEl(newIdx, symbolEl);
                group.add(symbolEl);
            }
        })
        .update(function (newIdx, oldIdx) {
            var symbolEl = oldData.getItemGraphicEl(oldIdx);

            // Empty data
            if (!data.hasValue(newIdx)) {
                group.remove(symbolEl);
                return;
            }

            if (symbolEl && symbolEl.__largeWhiskerBox ^ isLargeRender) {
                group.remove(symbolEl);
                symbolEl = null;
            }

            if (!symbolEl) {
                symbolEl = isLargeRender
                    ? createLargeBox(data, largePoints, newIdx)
                    : createNormalBox(data, newIdx, styleUpdater);
            }
            else {
                isLargeRender
                    ? updateLargeBoxData(symbolEl, data, newIdx)
                    : updateNormalBoxData(symbolEl, data, newIdx, styleUpdater);
            }

            // Add back
            group.add(symbolEl);

            data.setItemGraphicEl(newIdx, symbolEl);
        })
        .remove(function (oldIdx) {
            var el = oldData.getItemGraphicEl(oldIdx);
            el && group.remove(el);
        })
        .execute();

    this._data = data;
};

whiskerBoxDrawProto.incrementalPrepareUpdate = function (seriesModel, ecModel, api) {
    this.group.removeAll();
    this._data = null;
};

whiskerBoxDrawProto.incrementalUpdate = function (params, seriesModel, ecModel, api) {
    var data = seriesModel.getData();
    var pipelineContext = seriesModel.pipelineContext;
    var isLargeRender = pipelineContext.large;
    var largePoints = isLargeRender && data.getLayout('largePoints');

    for (var idx = params.start; idx < params.end; idx++) {
        var symbolEl = isLargeRender
            ? createLargeBox(data, largePoints, idx, params.start)
            : createNormalBox(data, idx, this.styleUpdater, true);
        symbolEl.incremental = true;
        this.group.add(symbolEl);
    }
};

/**
 * Remove symbols.
 * @param {module:echarts/data/List} data
 */
whiskerBoxDrawProto.remove = function () {
    var group = this.group;
    var data = this._data;
    this._data = null;
    data && data.eachItemGraphicEl(function (el) {
        el && group.remove(el);
    });
};

export default WhiskerBoxDraw;
