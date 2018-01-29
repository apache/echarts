/**
 * @module echarts/chart/helper/Symbol
 */

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import Path from 'zrender/src/graphic/Path';

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

/**
 * @constructor
 * @alias {module:echarts/chart/helper/WhiskerBox}
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Function} styleUpdater
 * @param {boolean} isInit
 * @extends {module:zrender/graphic/Group}
 */
function WhiskerBox(data, idx, styleUpdater, isInit) {
    graphic.Group.call(this);

    /**
     * @type {number}
     * @readOnly
     */
    this.bodyIndex;

    /**
     * @type {number}
     * @readOnly
     */
    this.whiskerIndex;

    /**
     * @type {Function}
     */
    this.styleUpdater = styleUpdater;

    this._createContent(data, idx, isInit);

    this.updateData(data, idx, isInit);

    /**
     * Last series model.
     * @type {module:echarts/model/Series}
     */
    this._seriesModel;
}

var whiskerBoxProto = WhiskerBox.prototype;

whiskerBoxProto._createContent = function (data, idx, isInit) {
    var itemLayout = data.getItemLayout(idx);
    var constDim = itemLayout.chartLayout === 'horizontal' ? 1 : 0;
    var count = 0;

    // Whisker element.
    this.add(new graphic.Polygon({
        shape: {
            points: isInit
                ? transInit(itemLayout.bodyEnds, constDim, itemLayout)
                : itemLayout.bodyEnds
        },
        style: {strokeNoScale: true},
        z2: 100
    }));
    this.bodyIndex = count++;

    // Box element.
    var whiskerEnds = zrUtil.map(itemLayout.whiskerEnds, function (ends) {
        return isInit ? transInit(ends, constDim, itemLayout) : ends;
    });
    this.add(new WhiskerPath({
        shape: makeWhiskerEndsShape(whiskerEnds),
        style: {strokeNoScale: true},
        z2: 100
    }));
    this.whiskerIndex = count++;
};

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

/**
 * Update symbol properties
 * @param  {module:echarts/data/List} data
 * @param  {number} idx
 */
whiskerBoxProto.updateData = function (data, idx, isInit) {
    var seriesModel = this._seriesModel = data.hostModel;
    var itemLayout = data.getItemLayout(idx);
    var updateMethod = graphic[isInit ? 'initProps' : 'updateProps'];
    // this.childAt(this.bodyIndex).stopAnimation(true);
    // this.childAt(this.whiskerIndex).stopAnimation(true);
    updateMethod(
        this.childAt(this.bodyIndex),
        {shape: {points: itemLayout.bodyEnds}},
        seriesModel, idx
    );
    updateMethod(
        this.childAt(this.whiskerIndex),
        {shape: makeWhiskerEndsShape(itemLayout.whiskerEnds)},
        seriesModel, idx
    );

    this.styleUpdater.call(null, this, data, idx);
};

zrUtil.inherits(WhiskerBox, graphic.Group);


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

    // There is no old data only when first rendering or switching from
    // stream mode to normal mode, where previous elements should be removed.
    if (!this._data) {
        group.removeAll();
    }

    data.diff(oldData)
        .add(function (newIdx) {
            if (data.hasValue(newIdx)) {
                var symbolEl = new WhiskerBox(data, newIdx, styleUpdater, true);
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

            if (!symbolEl) {
                symbolEl = new WhiskerBox(data, newIdx, styleUpdater);
            }
            else {
                symbolEl.updateData(data, newIdx);
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
    for (var idx = params.start; idx < params.end; idx++) {
        var symbolEl = new WhiskerBox(data, idx, this.styleUpdater, true);
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