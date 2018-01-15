/**
 * @module echarts/chart/helper/SymbolDraw
 */

import * as graphic from '../../util/graphic';
import SymbolClz from './Symbol';

/**
 * @constructor
 * @alias module:echarts/chart/helper/SymbolDraw
 * @param {module:zrender/graphic/Group} [symbolCtor]
 */
function SymbolDraw(symbolCtor) {
    this.group = new graphic.Group();

    this._symbolCtor = symbolCtor || SymbolClz;
}

var symbolDrawProto = SymbolDraw.prototype;

function symbolNeedsDraw(data, point, idx, isIgnore) {
    return point && !isNaN(point[0]) && !isNaN(point[1])
        && !(isIgnore && isIgnore(idx))
        && data.getItemVisual(idx, 'symbol') !== 'none';
}
/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 * @param {Array.<boolean>} [isIgnore]
 */
symbolDrawProto.updateData = function (data, isIgnore) {
    var group = this.group;
    var seriesModel = data.hostModel;
    var oldData = this._data;
    var SymbolCtor = this._symbolCtor;

    var seriesScope = makeSeriesScope(data);

    // There is no oldLineData only when first rendering or switching from
    // stream mode to normal mode, where previous elements should be removed.
    if (!oldData) {
        group.removeAll();
    }

    data.diff(oldData)
        .add(function (newIdx) {
            var point = data.getItemLayout(newIdx);
            if (symbolNeedsDraw(data, point, newIdx, isIgnore)) {
                var symbolEl = new SymbolCtor(data, newIdx, seriesScope);
                symbolEl.attr('position', point);
                data.setItemGraphicEl(newIdx, symbolEl);
                group.add(symbolEl);
            }
        })
        .update(function (newIdx, oldIdx) {
            var symbolEl = oldData.getItemGraphicEl(oldIdx);
            var point = data.getItemLayout(newIdx);
            if (!symbolNeedsDraw(data, point, newIdx, isIgnore)) {
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
            var el = oldData.getItemGraphicEl(oldIdx);
            el && el.fadeOut(function () {
                group.remove(el);
            });
        })
        .execute();

    this._data = data;
};

symbolDrawProto.isPersistent = function () {
    return true;
};

symbolDrawProto.updateLayout = function () {
    var data = this._data;
    if (data) {
        // Not use animation
        data.eachItemGraphicEl(function (el, idx) {
            var point = data.getItemLayout(idx);
            el.attr('position', point);
        });
    }
};

symbolDrawProto.incrementalPrepareUpdate = function (data) {
    this._seriesScope = makeSeriesScope(data);
    this._data = null;
    this.group.removeAll();
};

symbolDrawProto.incrementalUpdate = function (taskParams, data, isIgnore) {

    function updateIncrementalAndHover(el) {
        if (!el.isGroup) {
            el.incremental = el.useHoverLayer = true;
        }
    }
    for (var idx = taskParams.start; idx < taskParams.end; idx++) {
        var point = data.getItemLayout(idx);
        if (symbolNeedsDraw(data, point, idx, isIgnore)) {
            var el = new this._symbolCtor(data, idx, this._seriesScope);
            el.traverse(updateIncrementalAndHover);
            el.attr('position', point);
            this.group.add(el);
            data.setItemGraphicEl(idx, el);
        }
    }
};

symbolDrawProto.remove = function (enableAnimation) {
    var group = this.group;
    var data = this._data;
    if (data) {
        if (enableAnimation) {
            data.eachItemGraphicEl(function (el) {
                el.fadeOut(function () {
                    group.remove(el);
                });
            });
        }
        else {
            group.removeAll();
        }
    }
};

function makeSeriesScope(data) {
    var seriesModel = data.hostModel;
    return {
        itemStyle: seriesModel.getModel('itemStyle').getItemStyle(['color']),
        hoverItemStyle: seriesModel.getModel('emphasis.itemStyle').getItemStyle(),
        symbolRotate: seriesModel.get('symbolRotate'),
        symbolOffset: seriesModel.get('symbolOffset'),
        hoverAnimation: seriesModel.get('hoverAnimation'),
        labelModel: seriesModel.getModel('label'),
        hoverLabelModel: seriesModel.getModel('emphasis.label'),
        cursorStyle: seriesModel.get('cursor')
    };
}

export default SymbolDraw;