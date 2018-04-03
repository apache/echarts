import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import * as graphic from '../../util/graphic';
import Path from 'zrender/src/graphic/Path';

var NORMAL_ITEM_STYLE_PATH = ['itemStyle'];
var EMPHASIS_ITEM_STYLE_PATH = ['emphasis', 'itemStyle'];

var CandlestickView = ChartView.extend({

    type: 'candlestick',

    render: function (seriesModel, ecModel, api) {
        var group = this.group;
        var data = seriesModel.getData();
        var oldData = this._data;
        var pipelineContext = seriesModel.pipelineContext;
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
                        : createNormalBox(data, newIdx, true);
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
                        : createNormalBox(data, newIdx);
                }
                else {
                    isLargeRender
                        ? updateLargeBoxData(symbolEl, data, newIdx)
                        : updateNormalBoxData(symbolEl, data, newIdx);
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
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this.group.removeAll();
        this._data = null;
    },

    incrementalRender: function (params, seriesModel, ecModel, api) {
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
    },

    remove: function (ecModel) {
        var group = this.group;
        var data = this._data;
        this._data = null;
        data && data.eachItemGraphicEl(function (el) {
            el && group.remove(el);
        });
    }

});





// ---------------------
// -- Normal Renderer --
// ---------------------

var NormalBoxPath = Path.extend({

    type: 'candlestickBox',

    shape: {},

    buildPath: function (ctx, shape) {
        var ends = shape.points;

        ctx.moveTo(ends[0][0], ends[0][1]);
        ctx.lineTo(ends[1][0], ends[1][1]);
        ctx.lineTo(ends[2][0], ends[2][1]);
        ctx.lineTo(ends[3][0], ends[3][1]);
        ctx.closePath();

        ctx.moveTo(ends[4][0], ends[4][1]);
        ctx.lineTo(ends[5][0], ends[5][1]);
        ctx.moveTo(ends[6][0], ends[6][1]);
        ctx.lineTo(ends[7][0], ends[7][1]);
    }
});

function createNormalBox(data, dataIndex, isInit) {
    var itemLayout = data.getItemLayout(dataIndex);
    var ends = itemLayout.ends;

    var el = new NormalBoxPath({
        shape: {
            points: isInit
                ? transInit(ends, itemLayout)
                : ends
        },
        z2: 100
    });

    updateNormalBoxData(el, data, dataIndex, isInit);

    return el;
}

function updateNormalBoxData(el, data, dataIndex, isInit) {
    var seriesModel = data.hostModel;
    var itemLayout = data.getItemLayout(dataIndex);
    var updateMethod = graphic[isInit ? 'initProps' : 'updateProps'];

    updateMethod(
        el,
        {shape: {points: itemLayout.ends}},
        seriesModel,
        dataIndex
    );

    var itemModel = data.getItemModel(dataIndex);
    var normalItemStyleModel = itemModel.getModel(NORMAL_ITEM_STYLE_PATH);
    var color = data.getItemVisual(dataIndex, 'color');
    var borderColor = data.getItemVisual(dataIndex, 'borderColor') || color;

    // Color must be excluded.
    // Because symbol provide setColor individually to set fill and stroke
    var itemStyle = normalItemStyleModel.getItemStyle(
        ['color', 'color0', 'borderColor', 'borderColor0']
    );

    el.useStyle(itemStyle);
    el.style.strokeNoScale = true;
    el.style.fill = color;
    el.style.stroke = borderColor;

    var hoverStyle = itemModel.getModel(EMPHASIS_ITEM_STYLE_PATH).getItemStyle();
    graphic.setHoverStyle(el, hoverStyle);
}

function transInit(points, itemLayout) {
    return zrUtil.map(points, function (point) {
        point = point.slice();
        point[1] = itemLayout.initBaseline;
        return point;
    });
}






// --------------------
// -- Large Renderer --
// --------------------

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




export default CandlestickView;

